import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { mongoState, onMongoReconnected } from './mongo';
import { UserModel } from '../models/User';
import { RoundModel } from '../models/Round';
import { QuestionModel } from '../models/Question';
import { AnswerLogModel } from '../models/AnswerLog';
import { QuizSessionModel } from '../models/QuizSession';
import { EventSettingsModel } from '../models/EventSettings';
import type { EventSettings, Question, QuizSessionState, Round, User } from '../../src/types';

/** Records loaded from MongoDB can carry its raw _id alongside our string id. */
interface MongoBacked {
  _id?: unknown;
}

/** A user as the store holds it. Server-only: the password hash never reaches a client. */
export interface StoredUser extends User, MongoBacked {
  passwordHash: string;
  /** Admins: replaced on every password change; admin tokens are honoured only while they carry it. */
  securityStamp?: string | null;
  /** Admins: hash of the ADMIN_PASSWORD value last applied from .env, so an unchanged value is not re-applied. */
  envPasswordHash?: string | null;
}

export interface StoredRound extends Round, MongoBacked {}

export interface StoredQuestion extends Question, MongoBacked {}

/** One recorded submission. Server-only: correctness and points are embargoed until a question closes. */
export interface AnswerRecord extends MongoBacked {
  id: string;
  playerId: string;
  roundId: string;
  questionId: string;
  selectedOptionId: string;
  submittedAt: string;
  responseTimeMs: number;
  isCorrect: boolean;
  points: number;
  createdAt?: string;
}

/**
 * The quiz session as persisted. The broadcast shape, QuizSessionState, adds fields
 * that are computed fresh on every read — server time, connection and answer counts,
 * the safe question payload, the leaderboard preview — none of which belong in storage.
 */
export type StoredSession = Pick<
  QuizSessionState,
  | 'status'
  | 'activeRoundId'
  | 'activeRoundNumber'
  | 'activeRoundName'
  | 'currentQuestionId'
  | 'currentQuestionNumber'
  | 'totalQuestions'
  | 'questionStartedAt'
  | 'questionEndsAt'
  | 'duration'
  | 'lastEndedQuestionId'
> &
  MongoBacked & { updatedAt?: string };

export type StoredEventSettings = EventSettings & MongoBacked;

/** Fields the store assigns itself when a record is created. */
type Generated = 'id' | 'createdAt' | 'updatedAt';

/** What a caller must supply to create each kind of record. */
export type NewUser = Omit<StoredUser, Generated | '_id'> & Partial<Pick<StoredUser, Generated>>;

export type NewRound = Omit<Round, Generated | 'totalQuestions'> & Partial<Pick<Round, Generated>>;

/** addQuestion fills in sensible defaults for everything except these four. */
export type NewQuestion = Pick<Question, 'roundId' | 'text' | 'options' | 'correctOptionId'> &
  Partial<Omit<Question, 'roundId' | 'text' | 'options' | 'correctOptionId'>> & { _id?: string };

export type NewAnswer = Omit<AnswerRecord, 'id' | 'createdAt' | '_id'> & Partial<Pick<AnswerRecord, 'id' | 'createdAt'>>;

export interface StorageData {
  users: StoredUser[];
  rounds: StoredRound[];
  questions: StoredQuestion[];
  answers: AnswerRecord[];
  quizSession: StoredSession | null;
  eventSettings: StoredEventSettings | null;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'gadget_code_dev_fallback.json');
/** Writes accepted while MongoDB was unreachable, one per line, replayed in order once it is back. */
const PENDING_WRITES_FILE = path.join(DATA_DIR, '.mongo-pending.jsonl');

const DRAIN_RETRY_MS = 3000;
/** A write that keeps failing while MongoDB reports itself up is broken, not waiting. */
const MAX_WRITE_ATTEMPTS = 20;

type ModelName = 'User' | 'Round' | 'Question' | 'AnswerLog' | 'QuizSession' | 'EventSettings';

/**
 * One MongoDB write, in a form that can be journaled to disk and replayed. Every kind is
 * idempotent, so replaying a write that had in fact already landed changes nothing.
 */
type MongoWrite =
  | { kind: 'upsert' | 'update'; model: ModelName; filter: Record<string, unknown>; set: Record<string, unknown> }
  | { kind: 'insertOnce'; model: ModelName; filter: Record<string, unknown>; doc: Record<string, unknown> }
  | { kind: 'deleteOne' | 'deleteMany'; model: ModelName; filter: Record<string, unknown> };

const MODELS: Record<ModelName, mongoose.Model<any>> = {
  User: UserModel,
  Round: RoundModel,
  Question: QuestionModel,
  AnswerLog: AnswerLogModel,
  QuizSession: QuizSessionModel,
  EventSettings: EventSettingsModel,
};

async function applyWrite(write: MongoWrite): Promise<void> {
  const model = MODELS[write.model];
  switch (write.kind) {
    case 'upsert':
      await model.updateOne(write.filter, { $set: write.set }, { upsert: true }).exec();
      return;
    case 'update':
      await model.updateOne(write.filter, { $set: write.set }).exec();
      return;
    case 'insertOnce':
      // Keyed on our own id, so a replayed insert finds its document already there.
      await model.updateOne(write.filter, { $setOnInsert: write.doc }, { upsert: true, timestamps: false }).exec();
      return;
    case 'deleteOne':
      await model.deleteOne(write.filter).exec();
      return;
    case 'deleteMany':
      await model.deleteMany(write.filter).exec();
      return;
  }
}

/** "MongoDB cannot be reached right now", as opposed to "MongoDB rejected this write". */
function isTransientMongoError(err: unknown): boolean {
  if (!mongoState.isConnected) return true;
  const e = err as { name?: unknown; message?: unknown; hasErrorLabel?: (label: string) => boolean } | null;
  if (e && typeof e.hasErrorLabel === 'function' && (e.hasErrorLabel('RetryableWriteError') || e.hasErrorLabel('ResetPool'))) {
    return true;
  }
  const name = typeof e?.name === 'string' ? e.name : '';
  const message = typeof e?.message === 'string' ? e.message : '';
  return (
    /Network|ServerSelection|NotConnected|PoolCleared|TopologyClosed|Timeout/i.test(name) ||
    /buffering timed out|ECONNREFUSED|ECONNRESET|connection .*closed/i.test(message)
  );
}

/**
 * 'pending' until startup has tried MongoDB; then 'mongo', where MongoDB is the store and
 * the JSON snapshot is left alone, or 'file', the offline sandbox where the snapshot is
 * the only persistence.
 */
type StorageMode = 'pending' | 'mongo' | 'file';

class DatabaseStore {
  private data: StorageData = {
    users: [],
    rounds: [],
    questions: [],
    answers: [],
    quizSession: null,
    eventSettings: null,
  };
  private isInitialized = false;
  private storageMode: StorageMode = 'pending';

  // MongoDB writes not yet confirmed, oldest first. Applied strictly one at a time so a
  // later write can never land before an earlier one — including across an outage.
  private pendingWrites: MongoWrite[] = [];
  private isDraining = false;
  private journalFd: number | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private headAttempts = 0;

  constructor() {
    this.init();
    onMongoReconnected(() => void this.drainWrites());
  }

  /**
   * Called once MongoDB is connected at startup: first applies writes an earlier run was
   * holding when it stopped mid-outage, then makes memory an exact copy of MongoDB, and
   * from then on sends every write there.
   */
  public async attachMongo(): Promise<void> {
    await this.replayPendingWrites();
    await this.loadFromMongoDB();
    this.storageMode = 'mongo';
  }

  /** No MongoDB: the JSON snapshot is the store (the offline development sandbox). */
  public useFileStore(): void {
    this.storageMode = 'file';
  }

  public isUsingMongo(): boolean {
    return this.storageMode === 'mongo';
  }

  /** Queues a write for MongoDB. Does nothing unless MongoDB is the store. */
  private persist(write: MongoWrite): void {
    if (this.storageMode !== 'mongo') return;
    this.pendingWrites.push(write);
    if (this.journalFd !== null) {
      this.appendToJournal(write);
    } else if (!mongoState.isConnected) {
      this.openJournal();
    }
    void this.drainWrites();
  }

  /**
   * MongoDB is unreachable. Put every unconfirmed write on disk and keep appending until
   * the queue drains, so a restart mid-outage loses nothing. One short append per write,
   * where this used to rewrite the entire store on every answer.
   */
  private openJournal(): void {
    if (this.journalFd !== null) return;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      this.journalFd = fs.openSync(PENDING_WRITES_FILE, 'w');
      for (const write of this.pendingWrites) this.appendToJournal(write);
      console.warn(
        `⚠️ [DATABASE] MongoDB unreachable — holding writes in ${path.relative(process.cwd(), PENDING_WRITES_FILE)} until it is back.`
      );
    } catch (err) {
      console.error('Could not open the pending-writes journal:', err);
    }
  }

  private appendToJournal(write: MongoWrite): void {
    if (this.journalFd === null) return;
    try {
      fs.writeSync(this.journalFd, `${JSON.stringify(write)}\n`);
    } catch (err) {
      console.error('Could not journal a pending MongoDB write:', err);
    }
  }

  private closeJournal(): void {
    if (this.journalFd === null) return;
    try {
      fs.closeSync(this.journalFd);
      fs.rmSync(PENDING_WRITES_FILE, { force: true });
      console.log('✅ [DATABASE] Every write held during the MongoDB outage is now saved.');
    } catch (err) {
      console.error('Could not clear the pending-writes journal:', err);
    }
    this.journalFd = null;
  }

  private scheduleDrainRetry(): void {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.drainWrites();
    }, DRAIN_RETRY_MS);
  }

  /** Applies queued writes in order; pauses while MongoDB is unreachable and resumes after. */
  private async drainWrites(): Promise<void> {
    if (this.isDraining) return;
    this.isDraining = true;
    try {
      while (this.pendingWrites.length > 0) {
        const write = this.pendingWrites[0];
        try {
          await applyWrite(write);
        } catch (err) {
          if (isTransientMongoError(err)) {
            // Waiting out an outage never gives up; only repeat failures while MongoDB
            // says it is up count toward skipping a write.
            if (mongoState.isConnected) this.headAttempts++;
            if (this.headAttempts < MAX_WRITE_ATTEMPTS) {
              this.openJournal();
              this.scheduleDrainRetry();
              return;
            }
          }
          console.error(`❌ [DATABASE] MongoDB rejected a write; skipping it: ${JSON.stringify(write)}`, err);
        }
        this.headAttempts = 0;
        this.pendingWrites.shift();
      }
      this.closeJournal();
    } finally {
      this.isDraining = false;
    }
  }

  /** Applies, in order, the writes an earlier run was still holding when it stopped. */
  private async replayPendingWrites(): Promise<void> {
    let lines: string[];
    try {
      lines = fs.readFileSync(PENDING_WRITES_FILE, 'utf-8').split('\n').filter((line) => line.trim());
    } catch {
      return; // nothing held
    }

    console.log(`🔄 [DATABASE] Replaying ${lines.length} write(s) held during an earlier MongoDB outage...`);
    for (const line of lines) {
      let write: MongoWrite;
      try {
        write = JSON.parse(line);
      } catch {
        // Only the last line can be torn, by a crash mid-append.
        console.error(`   Skipping an unreadable journal line: ${line.slice(0, 200)}`);
        continue;
      }
      try {
        await applyWrite(write);
      } catch (err) {
        if (isTransientMongoError(err)) throw err; // unreachable again: keep the journal for next time
        console.error(`   MongoDB rejected a held write; skipping it: ${line.slice(0, 200)}`, err);
      }
    }
    fs.rmSync(PENDING_WRITES_FILE, { force: true });
    console.log(`✅ [DATABASE] Replayed ${lines.length} held write(s).`);
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn('[DEV MEMORY] Initializing clean state:', err);
      this.isInitialized = true;
    }
  }

  /**
   * Replaces the in-memory store with exactly what MongoDB holds — empty collections
   * included. (Keeping the JSON snapshot's records whenever a collection was empty let
   * stale sandbox data, never written to MongoDB, pose as live data.) All-or-nothing:
   * a failed read throws and leaves memory untouched.
   */
  public async loadFromMongoDB() {
    console.log('🔄 [DATABASE] Synchronizing state from MongoDB collections...');

    const users = await UserModel.find({}).lean().exec();
    const rounds = await RoundModel.find({}).lean().exec();
    const questions = await QuestionModel.find({}).sort({ order: 1 }).lean().exec();
    const answers = await AnswerLogModel.find({}).lean().exec();
    const quizSession = await QuizSessionModel.findOne({}).lean().exec();
    const eventSettings = await EventSettingsModel.findOne({}).lean().exec();

    this.data = {
      users: users.map((u: any) => ({
        ...u,
        id: u.id || (u._id ? u._id.toString() : u.id),
      })),
      rounds: rounds.map((r: any) => ({
        ...r,
        id: r.id || (r._id ? r._id.toString() : r.id),
      })),
      questions: questions.map((q: any) => {
        const stringId = q._id ? q._id.toString() : q.id || '';
        return {
          ...q,
          id: stringId,
          _id: stringId,
        };
      }),
      answers: answers.map((a: any) => ({
        ...a,
        id: a.id || (a._id ? a._id.toString() : a.id),
      })),
      // lean() returns Mongo's shape: a Date updatedAt, _id, __v, and any computed
      // fields an older build persisted. Keep exactly the stored-session fields so the
      // in-memory copy matches what setQuizSession writes.
      quizSession: quizSession
        ? {
            status: quizSession.status,
            activeRoundId: quizSession.activeRoundId,
            activeRoundNumber: quizSession.activeRoundNumber,
            activeRoundName: quizSession.activeRoundName,
            currentQuestionId: quizSession.currentQuestionId,
            currentQuestionNumber: quizSession.currentQuestionNumber,
            totalQuestions: quizSession.totalQuestions,
            questionStartedAt: quizSession.questionStartedAt,
            questionEndsAt: quizSession.questionEndsAt,
            duration: quizSession.duration,
            lastEndedQuestionId: quizSession.lastEndedQuestionId ?? null,
            updatedAt: quizSession.updatedAt ? new Date(quizSession.updatedAt).toISOString() : undefined,
          }
        : null,
      eventSettings: eventSettings || null,
    };

    console.log(`✅ [DATABASE SYNC COMPLETE] Loaded from MongoDB:`);
    console.log(`   - Users: ${this.data.users.length}`);
    console.log(`   - Rounds: ${this.data.rounds.length}`);
    console.log(`   - Questions: ${this.data.questions.length}`);
    console.log(`   - Answer Logs: ${this.data.answers.length}`);
  }

  public saveDevFallback() {
    // Only the offline sandbox persists to the JSON snapshot. With MongoDB it is left
    // alone: previously every start rewrote it (it is tracked in git), and every write
    // during a MongoDB outage rewrote the whole store to it synchronously.
    if (this.storageMode !== 'file') return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving dev fallback storage:', err);
    }
  }

  // --- Users ---
  public getUsers(): StoredUser[] {
    return this.data.users;
  }

  public getUserById(id: string): StoredUser | undefined {
    return this.data.users.find((u) => u.id === id || u._id === id);
  }

  public getUserByUsername(username: string): StoredUser | undefined {
    return this.data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  public addUser(user: NewUser): StoredUser {
    const id = user.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = {
      ...user,
      id,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    };
    this.data.users.push(record);
    this.saveDevFallback();
    // Built from NewUser, which never carries a Mongo _id, so it can be set whole.
    this.persist({ kind: 'upsert', model: 'User', filter: { id: record.id }, set: { ...record } });

    return record;
  }

  public updateUser(id: string, updates: Partial<StoredUser>): StoredUser | null {
    const idx = this.data.users.findIndex((u) => u.id === id || u._id === id);
    if (idx !== -1) {
      this.data.users[idx] = {
        ...this.data.users[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveDevFallback();

      const { _id, ...cleanUpdates } = updates;
      this.persist({ kind: 'update', model: 'User', filter: { id }, set: cleanUpdates });

      return this.data.users[idx];
    }
    return null;
  }

  public deleteUser(id: string): StoredUser | null {
    const idx = this.data.users.findIndex((u) => u.id === id || u._id === id);
    if (idx !== -1) {
      const removed = this.data.users.splice(idx, 1)[0];
      this.data.answers = this.data.answers.filter((a) => a.playerId !== id);
      this.saveDevFallback();

      this.persist({ kind: 'deleteOne', model: 'User', filter: { id } });
      this.persist({ kind: 'deleteMany', model: 'AnswerLog', filter: { playerId: id } });

      return removed;
    }
    return null;
  }

  // --- Rounds ---
  public getRounds(): Round[] {
    return this.data.rounds;
  }

  public getRoundById(id: string): Round | undefined {
    return this.data.rounds.find((r) => r.id === id || r._id === id);
  }

  public addRound(round: NewRound): StoredRound {
    const id = round.id || `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = {
      ...round,
      id,
      createdAt: round.createdAt || new Date().toISOString(),
      updatedAt: round.updatedAt || new Date().toISOString(),
    };
    this.data.rounds.push(record);
    this.saveDevFallback();
    // Built from NewRound, which never carries a Mongo _id, so it can be set whole.
    this.persist({ kind: 'upsert', model: 'Round', filter: { id: record.id }, set: { ...record } });

    return record;
  }

  public updateRound(id: string, updates: Partial<StoredRound>): StoredRound | null {
    const idx = this.data.rounds.findIndex((r) => r.id === id || r._id === id);
    if (idx !== -1) {
      this.data.rounds[idx] = {
        ...this.data.rounds[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveDevFallback();

      const { _id, ...cleanUpdates } = updates;
      this.persist({ kind: 'update', model: 'Round', filter: { id }, set: cleanUpdates });

      return this.data.rounds[idx];
    }
    return null;
  }

  public deleteRound(id: string): StoredRound | null {
    const idx = this.data.rounds.findIndex((r) => r.id === id || r._id === id);
    if (idx !== -1) {
      const removed = this.data.rounds.splice(idx, 1)[0];

      // Never leave the live session pointing at a round that no longer exists —
      // that dangling reference is what makes a later boot look like a round is
      // already under way while START QUESTION reports "Round has no questions".
      if (this.data.quizSession && this.data.quizSession.activeRoundId === id) {
        this.setQuizSession({
          ...this.data.quizSession,
          status: 'WAITING',
          lastEndedQuestionId: null,
          activeRoundId: null,
          activeRoundNumber: null,
          activeRoundName: null,
          currentQuestionId: null,
          currentQuestionNumber: null,
          totalQuestions: 0,
          questionStartedAt: null,
          questionEndsAt: null,
          duration: null,
        });
      }

      const questionIds = this.data.questions.filter((q) => q.roundId === id).map((q) => q.id);
      this.data.questions = this.data.questions.filter((q) => q.roundId !== id);
      this.data.answers = this.data.answers.filter(
        (a) => a.roundId !== id && !questionIds.includes(a.questionId)
      );
      this.saveDevFallback();

      this.persist({ kind: 'deleteOne', model: 'Round', filter: { id } });
      this.persist({ kind: 'deleteMany', model: 'Question', filter: { roundId: id } });
      this.persist({ kind: 'deleteMany', model: 'AnswerLog', filter: { roundId: id } });

      return removed;
    }
    return null;
  }

  // --- Questions ---
  public getQuestions(roundId?: string): Question[] {
    if (roundId) {
      return this.data.questions.filter((q) => q.roundId === roundId).sort((a, b) => a.order - b.order);
    }
    return this.data.questions.sort((a, b) => a.order - b.order);
  }

  public getQuestionById(id: string): Question | undefined {
    return this.data.questions.find((q) => q.id === id || q._id === id);
  }

  public addQuestion(question: NewQuestion): StoredQuestion {
    // Generate valid MongoDB ObjectId if not provided as valid ObjectId
    let objectId: mongoose.Types.ObjectId;
    if (question._id && mongoose.isValidObjectId(question._id)) {
      objectId = new mongoose.Types.ObjectId(question._id);
    } else if (question.id && mongoose.isValidObjectId(question.id)) {
      objectId = new mongoose.Types.ObjectId(question.id);
    } else {
      objectId = new mongoose.Types.ObjectId();
    }

    const stringId = objectId.toString();
    const cleanDoc = {
      _id: objectId,
      roundId: question.roundId,
      order: Number(question.order) || 1,
      type: question.type || 'MCQ',
      text: question.text,
      options: question.options,
      correctOptionId: question.correctOptionId,
      duration: Number(question.duration) || 10,
      points: Number(question.points) || 1000,
      explanation: question.explanation || '',
      questionCode: question.questionCode || '',
      imageUrl: question.imageUrl || '',
      afterImageUrl: question.afterImageUrl || '',
      isActive: question.isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const record = {
      ...cleanDoc,
      id: stringId,
      _id: stringId,
    };

    this.data.questions.push(record);
    this.saveDevFallback();

    const { _id: _objectId, ...questionFields } = cleanDoc;
    this.persist({ kind: 'upsert', model: 'Question', filter: { _id: stringId }, set: questionFields });

    return record;
  }

  public updateQuestion(id: string, updates: Partial<StoredQuestion>): StoredQuestion | null {
    const idx = this.data.questions.findIndex((q) => q.id === id || q._id === id);
    if (idx !== -1) {
      this.data.questions[idx] = {
        ...this.data.questions[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveDevFallback();

      const targetId = mongoose.isValidObjectId(id)
        ? id
        : mongoose.isValidObjectId(this.data.questions[idx]._id)
        ? String(this.data.questions[idx]._id)
        : null;

      if (targetId) {
        const { _id, id: _, ...cleanUpdates } = updates;
        this.persist({ kind: 'update', model: 'Question', filter: { _id: targetId }, set: cleanUpdates });
      }

      return this.data.questions[idx];
    }
    return null;
  }

  public deleteQuestion(id: string): StoredQuestion | null {
    const idx = this.data.questions.findIndex((q) => q.id === id || q._id === id);
    if (idx !== -1) {
      const removed = this.data.questions.splice(idx, 1)[0];
      this.data.answers = this.data.answers.filter((a) => a.questionId !== id);
      this.saveDevFallback();

      const targetId = mongoose.isValidObjectId(id)
        ? id
        : mongoose.isValidObjectId(removed._id)
        ? String(removed._id)
        : null;

      if (targetId) {
        this.persist({ kind: 'deleteOne', model: 'Question', filter: { _id: targetId } });
      }
      this.persist({ kind: 'deleteMany', model: 'AnswerLog', filter: { questionId: id } });

      return removed;
    }
    return null;
  }

  // --- Answers ---
  public getAnswers(filter?: { playerId?: string; roundId?: string; questionId?: string }): AnswerRecord[] {
    return this.data.answers.filter((a) => {
      if (filter?.playerId && a.playerId !== filter.playerId) return false;
      if (filter?.roundId && a.roundId !== filter.roundId) return false;
      if (filter?.questionId && a.questionId !== filter.questionId) return false;
      return true;
    });
  }

  public getAnswer(playerId: string, questionId: string): AnswerRecord | undefined {
    return this.data.answers.find((a) => a.playerId === playerId && a.questionId === questionId);
  }

  public addAnswer(answer: NewAnswer): AnswerRecord {
    const id = answer.id || `ans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = { ...answer, id, createdAt: answer.createdAt || new Date().toISOString() };
    this.data.answers.push(record);
    this.saveDevFallback();
    // Built from NewAnswer, which never carries a Mongo _id; Mongo assigns its own.
    this.persist({ kind: 'insertOnce', model: 'AnswerLog', filter: { id: record.id }, doc: { ...record } });

    return record;
  }

  public clearAnswers(roundId?: string): void {
    if (roundId) {
      this.data.answers = this.data.answers.filter((a) => a.roundId !== roundId);
      this.persist({ kind: 'deleteMany', model: 'AnswerLog', filter: { roundId } });
    } else {
      this.data.answers = [];
      this.persist({ kind: 'deleteMany', model: 'AnswerLog', filter: {} });
    }
    this.saveDevFallback();
  }

  // --- Live Quiz Session ---
  public getQuizSession(): StoredSession | null {
    return this.data.quizSession;
  }

  public setQuizSession(session: StoredSession | null): StoredSession | null {
    this.data.quizSession = session ? { ...session, updatedAt: new Date().toISOString() } : null;
    this.saveDevFallback();

    if (session) {
      const { _id, ...cleanSession } = session;
      this.persist({ kind: 'upsert', model: 'QuizSession', filter: {}, set: cleanSession });
    }

    return this.data.quizSession;
  }

  // --- Event Settings ---
  public getEventSettings(): StoredEventSettings {
    return (
      this.data.eventSettings || {
        eventName: 'GADGET CODE',
        eventDescription: 'Technical Quiz Competition',
        defaultQuestionTimer: 10,
        defaultPoints: 1000,
        allowLeaderboard: true,
        showResultsAfterQuestion: true,
        allowPlayerReconnect: true,
        soundEnabledDefault: true,
        testModeEnabled: false,
      }
    );
  }

  public setEventSettings(settings: Partial<EventSettings>): StoredEventSettings {
    this.data.eventSettings = { ...this.getEventSettings(), ...settings };
    this.saveDevFallback();

    const { _id, ...cleanSettings } = this.data.eventSettings;
    this.persist({ kind: 'upsert', model: 'EventSettings', filter: {}, set: cleanSettings });

    return this.data.eventSettings;
  }

  // Reset entire event state (with safety)
  public resetQuizProgress(roundId?: string): void {
    this.clearAnswers(roundId);
    if (this.data.quizSession && (!roundId || this.data.quizSession.activeRoundId === roundId)) {
      this.data.quizSession = {
        status: 'WAITING',
        lastEndedQuestionId: null,
        activeRoundId: this.data.quizSession.activeRoundId,
        activeRoundNumber: this.data.quizSession.activeRoundNumber,
        activeRoundName: this.data.quizSession.activeRoundName,
        currentQuestionId: null,
        currentQuestionNumber: null,
        totalQuestions: this.data.questions.filter(
          (q) => q.roundId === this.data.quizSession?.activeRoundId
        ).length,
        questionStartedAt: null,
        questionEndsAt: null,
        duration: null,
        updatedAt: new Date().toISOString(),
      };
      this.setQuizSession(this.data.quizSession);
    }
  }

  // Export full DB dump as JSON. Live sign-in state is left out: it identifies sessions,
  // not data, and means nothing once restored elsewhere.
  public exportDump() {
    return JSON.stringify(
      {
        ...this.data,
        users: this.data.users.map(({ activeSessionId, securityStamp, ...user }) => user),
      },
      null,
      2
    );
  }

  // Import dump
  public importDump(jsonData: string) {
    const parsed = JSON.parse(jsonData);
    if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.rounds)) {
      this.data = parsed;
      this.saveDevFallback();

      parsed.users.forEach((u: any) => {
        const { _id, ...cleanU } = u;
        this.persist({ kind: 'upsert', model: 'User', filter: { id: u.id }, set: cleanU });
      });
      parsed.rounds.forEach((r: any) => {
        const { _id, ...cleanR } = r;
        this.persist({ kind: 'upsert', model: 'Round', filter: { id: r.id }, set: cleanR });
      });
      (parsed.questions || []).forEach((q: any) => {
        const qId = mongoose.isValidObjectId(q.id)
          ? String(q.id)
          : mongoose.isValidObjectId(q._id)
          ? String(q._id)
          : new mongoose.Types.ObjectId().toString();
        const { _id, id: _, ...cleanQ } = q;
        this.persist({ kind: 'upsert', model: 'Question', filter: { _id: qId }, set: cleanQ });
      });

      return true;
    }
    throw new Error('Invalid database dump structure');
  }
}

export const db = new DatabaseStore();

