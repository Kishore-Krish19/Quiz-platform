import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { mongoState } from './mongo';
import { UserModel } from '../models/User';
import { RoundModel } from '../models/Round';
import { QuestionModel } from '../models/Question';
import { AnswerLogModel } from '../models/AnswerLog';
import { QuizSessionModel } from '../models/QuizSession';
import { EventSettingsModel } from '../models/EventSettings';

export interface StorageData {
  users: any[];
  rounds: any[];
  questions: any[];
  answers: any[];
  quizSession: any;
  eventSettings: any;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'gadget_code_dev_fallback.json');

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

  constructor() {
    this.init();
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
   * Synchronizes data from MongoDB into fast in-memory cache
   */
  public async loadFromMongoDB() {
    if (!mongoState.isConnected) return;

    try {
      console.log('🔄 [DATABASE] Synchronizing state from MongoDB collections...');

      const users = await UserModel.find({}).lean().exec();
      const rounds = await RoundModel.find({}).lean().exec();
      const questions = await QuestionModel.find({}).sort({ order: 1 }).lean().exec();
      const answers = await AnswerLogModel.find({}).lean().exec();
      const quizSession = await QuizSessionModel.findOne({}).lean().exec();
      const eventSettings = await EventSettingsModel.findOne({}).lean().exec();

      if (users && users.length > 0) {
        this.data.users = users.map((u: any) => ({
          ...u,
          id: u.id || (u._id ? u._id.toString() : u.id),
        }));
      }
      if (rounds && rounds.length > 0) {
        this.data.rounds = rounds.map((r: any) => ({
          ...r,
          id: r.id || (r._id ? r._id.toString() : r.id),
        }));
      }
      if (questions && questions.length > 0) {
        this.data.questions = questions.map((q: any) => {
          const stringId = q._id ? q._id.toString() : (q.id || '');
          return {
            ...q,
            id: stringId,
            _id: stringId,
          };
        });
      }
      if (answers && answers.length > 0) {
        this.data.answers = answers.map((a: any) => ({
          ...a,
          id: a.id || (a._id ? a._id.toString() : a.id),
        }));
      }
      if (quizSession) this.data.quizSession = quizSession;
      if (eventSettings) this.data.eventSettings = eventSettings;

      console.log(`✅ [DATABASE SYNC COMPLETE] Loaded from MongoDB:`);
      console.log(`   - Users: ${this.data.users.length}`);
      console.log(`   - Rounds: ${this.data.rounds.length}`);
      console.log(`   - Questions: ${this.data.questions.length}`);
      console.log(`   - Answer Logs: ${this.data.answers.length}`);
    } catch (err) {
      console.error('❌ [DATABASE SYNC ERROR] Failed to load records from MongoDB:', err);
    }
  }

  public saveDevFallback() {
    // Only write dev fallback file if not connected to MongoDB
    if (!mongoState.isConnected) {
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (err) {
        console.error('Error saving dev fallback storage:', err);
      }
    }
  }

  // --- Users ---
  public getUsers() {
    return this.data.users;
  }

  public getUserById(id: string) {
    return this.data.users.find((u) => u.id === id || u._id === id);
  }

  public getUserByUsername(username: string) {
    return this.data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  public addUser(user: any) {
    const id = user.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = {
      ...user,
      id,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    };
    this.data.users.push(record);
    this.saveDevFallback();

    // Persist asynchronously to MongoDB
    if (mongoState.isConnected) {
      const { _id, ...cleanUser } = record;
      UserModel.findOneAndUpdate(
        { id: record.id },
        { $set: cleanUser },
        { upsert: true, returnDocument: 'after' }
      ).exec().catch((err: any) => console.error('MongoDB UserModel error:', err));
    }

    return record;
  }

  public updateUser(id: string, updates: Partial<any>) {
    const idx = this.data.users.findIndex((u) => u.id === id || u._id === id);
    if (idx !== -1) {
      this.data.users[idx] = {
        ...this.data.users[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveDevFallback();

      if (mongoState.isConnected) {
        const { _id, ...cleanUpdates } = updates;
        UserModel.findOneAndUpdate({ id }, { $set: cleanUpdates }, { returnDocument: 'after' })
          .exec()
          .catch((err: any) => console.error('MongoDB updateUser error:', err));
      }

      return this.data.users[idx];
    }
    return null;
  }

  public deleteUser(id: string) {
    const idx = this.data.users.findIndex((u) => u.id === id || u._id === id);
    if (idx !== -1) {
      const removed = this.data.users.splice(idx, 1)[0];
      this.data.answers = this.data.answers.filter((a) => a.playerId !== id);
      this.saveDevFallback();

      if (mongoState.isConnected) {
        UserModel.deleteOne({ id }).exec().catch((err: any) => console.error('MongoDB deleteUser error:', err));
        AnswerLogModel.deleteMany({ playerId: id })
          .exec()
          .catch((err: any) => console.error('MongoDB deleteUser answers error:', err));
      }

      return removed;
    }
    return null;
  }

  // --- Rounds ---
  public getRounds() {
    return this.data.rounds;
  }

  public getRoundById(id: string) {
    return this.data.rounds.find((r) => r.id === id || r._id === id);
  }

  public addRound(round: any) {
    const id = round.id || `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = {
      ...round,
      id,
      createdAt: round.createdAt || new Date().toISOString(),
      updatedAt: round.updatedAt || new Date().toISOString(),
    };
    this.data.rounds.push(record);
    this.saveDevFallback();

    if (mongoState.isConnected) {
      const { _id, ...cleanRound } = record;
      RoundModel.findOneAndUpdate({ id: record.id }, { $set: cleanRound }, { upsert: true, returnDocument: 'after' })
        .exec()
        .catch((err: any) => console.error('MongoDB RoundModel error:', err));
    }

    return record;
  }

  public updateRound(id: string, updates: Partial<any>) {
    const idx = this.data.rounds.findIndex((r) => r.id === id || r._id === id);
    if (idx !== -1) {
      this.data.rounds[idx] = {
        ...this.data.rounds[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveDevFallback();

      if (mongoState.isConnected) {
        const { _id, ...cleanUpdates } = updates;
        RoundModel.findOneAndUpdate({ id }, { $set: cleanUpdates }, { returnDocument: 'after' })
          .exec()
          .catch((err: any) => console.error('MongoDB updateRound error:', err));
      }

      return this.data.rounds[idx];
    }
    return null;
  }

  public deleteRound(id: string) {
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

      if (mongoState.isConnected) {
        RoundModel.deleteOne({ id }).exec().catch((err: any) => console.error('MongoDB deleteRound error:', err));
        QuestionModel.deleteMany({ roundId: id })
          .exec()
          .catch((err: any) => console.error('MongoDB deleteRound questions error:', err));
        AnswerLogModel.deleteMany({ roundId: id })
          .exec()
          .catch((err: any) => console.error('MongoDB deleteRound answers error:', err));
      }

      return removed;
    }
    return null;
  }

  // --- Questions ---
  public getQuestions(roundId?: string) {
    if (roundId) {
      return this.data.questions.filter((q) => q.roundId === roundId).sort((a, b) => a.order - b.order);
    }
    return this.data.questions.sort((a, b) => a.order - b.order);
  }

  public getQuestionById(id: string) {
    return this.data.questions.find((q) => q.id === id || q._id === id);
  }

  public addQuestion(question: any) {
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

    if (mongoState.isConnected) {
      QuestionModel.findByIdAndUpdate(
        objectId,
        { $set: cleanDoc },
        { upsert: true, returnDocument: 'after' }
      )
        .exec()
        .catch((err: any) => console.error('MongoDB QuestionModel error:', err));
    }

    return record;
  }

  public updateQuestion(id: string, updates: Partial<any>) {
    const idx = this.data.questions.findIndex((q) => q.id === id || q._id === id);
    if (idx !== -1) {
      this.data.questions[idx] = {
        ...this.data.questions[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveDevFallback();

      if (mongoState.isConnected) {
        const targetId = mongoose.isValidObjectId(id)
          ? id
          : mongoose.isValidObjectId(this.data.questions[idx]._id)
          ? this.data.questions[idx]._id
          : null;

        if (targetId) {
          const { _id, id: _, ...cleanUpdates } = updates;
          QuestionModel.findByIdAndUpdate(targetId, { $set: cleanUpdates }, { returnDocument: 'after' })
            .exec()
            .catch((err: any) => console.error('MongoDB updateQuestion error:', err));
        }
      }

      return this.data.questions[idx];
    }
    return null;
  }

  public deleteQuestion(id: string) {
    const idx = this.data.questions.findIndex((q) => q.id === id || q._id === id);
    if (idx !== -1) {
      const removed = this.data.questions.splice(idx, 1)[0];
      this.data.answers = this.data.answers.filter((a) => a.questionId !== id);
      this.saveDevFallback();

      if (mongoState.isConnected) {
        const targetId = mongoose.isValidObjectId(id)
          ? id
          : mongoose.isValidObjectId(removed._id)
          ? removed._id
          : null;

        if (targetId) {
          QuestionModel.findByIdAndDelete(targetId)
            .exec()
            .catch((err: any) => console.error('MongoDB deleteQuestion error:', err));
        }
        AnswerLogModel.deleteMany({ questionId: id })
          .exec()
          .catch((err: any) => console.error('MongoDB deleteQuestion answers error:', err));
      }

      return removed;
    }
    return null;
  }

  // --- Answers ---
  public getAnswers(filter?: { playerId?: string; roundId?: string; questionId?: string }) {
    return this.data.answers.filter((a) => {
      if (filter?.playerId && a.playerId !== filter.playerId) return false;
      if (filter?.roundId && a.roundId !== filter.roundId) return false;
      if (filter?.questionId && a.questionId !== filter.questionId) return false;
      return true;
    });
  }

  public getAnswer(playerId: string, questionId: string) {
    return this.data.answers.find((a) => a.playerId === playerId && a.questionId === questionId);
  }

  public addAnswer(answer: any) {
    const id = answer.id || `ans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = { ...answer, id, createdAt: answer.createdAt || new Date().toISOString() };
    this.data.answers.push(record);
    this.saveDevFallback();

    if (mongoState.isConnected) {
      const { _id, ...cleanAnswer } = record;
      AnswerLogModel.create(cleanAnswer).catch((err: any) =>
        console.error('MongoDB AnswerLogModel error:', err)
      );
    }

    return record;
  }

  public clearAnswers(roundId?: string) {
    if (roundId) {
      this.data.answers = this.data.answers.filter((a) => a.roundId !== roundId);
      if (mongoState.isConnected) {
        AnswerLogModel.deleteMany({ roundId }).exec().catch((err: any) =>
          console.error('MongoDB clearAnswers round error:', err)
        );
      }
    } else {
      this.data.answers = [];
      if (mongoState.isConnected) {
        AnswerLogModel.deleteMany({}).exec().catch((err: any) =>
          console.error('MongoDB clearAnswers all error:', err)
        );
      }
    }
    this.saveDevFallback();
  }

  // --- Live Quiz Session ---
  public getQuizSession() {
    return this.data.quizSession;
  }

  public setQuizSession(session: any) {
    this.data.quizSession = session ? { ...session, updatedAt: new Date().toISOString() } : null;
    this.saveDevFallback();

    if (mongoState.isConnected && session) {
      const { _id, ...cleanSession } = session;
      QuizSessionModel.findOneAndUpdate({}, { $set: cleanSession }, { upsert: true, returnDocument: 'after' })
        .exec()
        .catch((err: any) => console.error('MongoDB QuizSessionModel error:', err));
    }

    return this.data.quizSession;
  }

  // --- Event Settings ---
  public getEventSettings() {
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

  public setEventSettings(settings: any) {
    this.data.eventSettings = { ...this.getEventSettings(), ...settings };
    this.saveDevFallback();

    if (mongoState.isConnected) {
      const { _id, ...cleanSettings } = this.data.eventSettings;
      EventSettingsModel.findOneAndUpdate(
        {},
        { $set: cleanSettings },
        { upsert: true, returnDocument: 'after' }
      )
        .exec()
        .catch((err: any) => console.error('MongoDB EventSettingsModel error:', err));
    }

    return this.data.eventSettings;
  }

  // Reset entire event state (with safety)
  public resetQuizProgress(roundId?: string) {
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

  // Export full DB dump as JSON
  public exportDump() {
    return JSON.stringify(this.data, null, 2);
  }

  // Import dump
  public importDump(jsonData: string) {
    const parsed = JSON.parse(jsonData);
    if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.rounds)) {
      this.data = parsed;
      this.saveDevFallback();

      if (mongoState.isConnected) {
        // Asynchronously sync imported entities to MongoDB
        Promise.all([
          parsed.users.map((u: any) => {
            const { _id, ...cleanU } = u;
            return UserModel.findOneAndUpdate({ id: u.id }, { $set: cleanU }, { upsert: true, returnDocument: 'after' }).exec();
          }),
          parsed.rounds.map((r: any) => {
            const { _id, ...cleanR } = r;
            return RoundModel.findOneAndUpdate({ id: r.id }, { $set: cleanR }, { upsert: true, returnDocument: 'after' }).exec();
          }),
          parsed.questions.map((q: any) => {
            const qId = mongoose.isValidObjectId(q.id) ? q.id : (mongoose.isValidObjectId(q._id) ? q._id : new mongoose.Types.ObjectId());
            const { _id, id: _, ...cleanQ } = q;
            return QuestionModel.findByIdAndUpdate(qId, { $set: cleanQ }, { upsert: true, returnDocument: 'after' }).exec();
          }),
        ]).catch((err: any) => console.error('MongoDB importDump error:', err));
      }

      return true;
    }
    throw new Error('Invalid database dump structure');
  }
}

export const db = new DatabaseStore();

