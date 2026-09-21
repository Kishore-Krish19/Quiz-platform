import {
  AnswerResult,
  LeaderboardEntry,
  Question,
  QuizSessionState,
  QuizStatus,
  Round,
  SafeQuestion,
} from '../../src/types';
import { db } from '../config/db';
import { ScoringService } from './scoringService';

/** The request would disrupt a question that players are answering right now. */
export class LiveQuestionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LiveQuestionConflictError';
  }
}

export class QuizEngine {
  private static instance: QuizEngine;
  private timerHandle: NodeJS.Timeout | null = null;
  private connectedSockets = new Map<string, { userId: string; role: string; socketId: string }>();
  private onStateChangeCallbacks: ((state: QuizSessionState) => void)[] = [];
  private onQuestionEndCallbacks: ((data: { questionId: string; correctOptionId: string; stats: any }) => void)[] = [];
  private onQuestionStartCallbacks: ((question: SafeQuestion) => void)[] = [];
  private onRoundCompletedCallbacks: ((data: { roundId: string; finalLeaderboard: LeaderboardEntry[] }) => void)[] = [];
  private onAnswerSubmittedCallbacks: ((data: {
    questionId: string;
    answeredCount: number;
    totalConnected: number;
  }) => void)[] = [];

  private constructor() {
    this.recoverState();
  }

  public static getInstance(): QuizEngine {
    if (!QuizEngine.instance) {
      QuizEngine.instance = new QuizEngine();
    }
    return QuizEngine.instance;
  }

  /**
   * Recovers state on server startup or reboot
   */
  private recoverState() {
    this.reconcileSession();
    this.resumeActiveQuestion();
  }

  /**
   * Brings the persisted session back in line with the data that actually exists.
   *
   * The session document outlives every restart, so without this the platform
   * resumes whatever the last run left behind — including a round that has since
   * been deleted. That greets the operator with a stale status (a finished round
   * they never ran) and makes START QUESTION fail with "Round has no questions",
   * because the session still points at a round id that resolves to nothing.
   *
   * Must also be run once the database has loaded: the engine is constructed at
   * import time, before startServer() pulls the session out of MongoDB.
   */
  public reconcileSession() {
    const session = db.getQuizSession();
    const round = session?.activeRoundId ? db.getRoundById(session.activeRoundId) : null;

    if (!session || !round) {
      // Either there was never a session, or it names a round that no longer exists.
      // Any stored status is then meaningless bookkeeping from a previous event, so
      // start clean on the first round that is actually available.
      const fallback = db.getRounds()[0];
      const questions = fallback ? db.getQuestions(fallback.id) : [];

      db.setQuizSession({
        status: 'WAITING',
        lastEndedQuestionId: null,
        activeRoundId: fallback ? fallback.id : null,
        activeRoundNumber: fallback ? fallback.roundNumber : null,
        activeRoundName: fallback ? fallback.name : null,
        currentQuestionId: questions.length > 0 ? questions[0].id : null,
        currentQuestionNumber: questions.length > 0 ? 1 : null,
        totalQuestions: questions.length,
        questionStartedAt: null,
        questionEndsAt: null,
        duration: fallback ? fallback.defaultDuration || null : null,
      });
      return;
    }

    // The round is real, so a mid-event restart is a legitimate resume: keep the
    // status. Only correct what can drift behind the data — the question count, the
    // round's name, and a pointer to a question that has since been deleted.
    const questions = db.getQuestions(round.id);
    const currentStillExists =
      !!session.currentQuestionId && questions.some((q) => q.id === session.currentQuestionId);

    db.setQuizSession({
      ...session,
      activeRoundNumber: round.roundNumber,
      activeRoundName: round.name,
      totalQuestions: questions.length,
      currentQuestionId: currentStillExists
        ? session.currentQuestionId
        : questions.length > 0
        ? questions[0].id
        : null,
      currentQuestionNumber: currentStillExists
        ? session.currentQuestionNumber
        : questions.length > 0
        ? 1
        : null,
    });
  }

  /**
   * Re-arms — or immediately closes — a question that was still live when the
   * process died.
   *
   * This must also be run once the database has finished loading. The engine is a
   * singleton constructed at import time, which happens before startServer() pulls
   * the session out of MongoDB, so on a MongoDB deployment the constructor's pass
   * sees an empty store and leaves the countdown unarmed — the question then hangs
   * past its deadline until an operator ends it by hand. Safe to call repeatedly:
   * arming a timer clears any existing one first.
   */
  public resumeActiveQuestion() {
    const session = db.getQuizSession();
    if (!session || session.status !== 'QUESTION_ACTIVE' || !session.questionEndsAt) {
      return;
    }

    const now = Date.now();
    if (now >= session.questionEndsAt) {
      // The deadline passed while the server was down — close it out immediately.
      this.endCurrentQuestion();
    } else {
      this.startAuthoritativeTimer(session.questionEndsAt - now);
    }
  }

  // Socket and player connection tracking
  public registerSocket(socketId: string, userId: string, role: string) {
    this.connectedSockets.set(socketId, { userId, role, socketId });
  }

  public unregisterSocket(socketId: string) {
    this.connectedSockets.delete(socketId);
  }

  public getConnectedPlayerUserIds(): Set<string> {
    const ids = new Set<string>();
    this.connectedSockets.forEach((s) => {
      if (s.role === 'PLAYER') {
        ids.add(s.userId);
      }
    });
    return ids;
  }

  public getConnectedPlayerCount(): number {
    return this.getConnectedPlayerUserIds().size;
  }

  /**
   * Full standings as players are allowed to see them: points from a question that is
   * still live are held back, so nobody can infer the answer from a moving score.
   */
  public getPublicLeaderboard(): LeaderboardEntry[] {
    const session = db.getQuizSession();
    return ScoringService.calculateLeaderboard(
      session?.activeRoundId || undefined,
      this.getConnectedPlayerUserIds(),
      session?.status === 'QUESTION_ACTIVE' ? session.currentQuestionId || undefined : undefined
    );
  }

  public isPlayerConnected(userId: string): boolean {
    return this.getConnectedPlayerUserIds().has(userId);
  }

  /**
   * Drops every socket held by one account. For a player it is the escape hatch when a
   * machine has crashed or been left logged in and the seat needs freeing mid-event; for
   * an admin it ends the sessions opened with a password that has just been changed.
   * Wired to Socket.IO by the socket layer, which owns the io instance.
   */
  private forceDisconnectHandler: ((userId: string) => void) | null = null;

  public onForceDisconnect(cb: (userId: string) => void) {
    this.forceDisconnectHandler = cb;
  }

  public disconnectUser(userId: string) {
    if (this.forceDisconnectHandler) {
      this.forceDisconnectHandler(userId);
    }
  }

  // Event subscription hooks
  public onStateChange(cb: (state: QuizSessionState) => void) {
    this.onStateChangeCallbacks.push(cb);
  }

  public onQuestionStart(cb: (question: SafeQuestion) => void) {
    this.onQuestionStartCallbacks.push(cb);
  }

  public onQuestionEnd(cb: (data: { questionId: string; correctOptionId: string; stats: any }) => void) {
    this.onQuestionEndCallbacks.push(cb);
  }

  public onRoundCompleted(cb: (data: { roundId: string; finalLeaderboard: LeaderboardEntry[] }) => void) {
    this.onRoundCompletedCallbacks.push(cb);
  }

  public onAnswerSubmitted(
    cb: (data: { questionId: string; answeredCount: number; totalConnected: number }) => void
  ) {
    this.onAnswerSubmittedCallbacks.push(cb);
  }

  private notifyStateChange() {
    const state = this.getCurrentState();
    this.onStateChangeCallbacks.forEach((cb) => cb(state));
  }

  /**
   * Authoritative Current State getter
   */
  public getCurrentState(isAdmin = false): QuizSessionState {
    const session = db.getQuizSession() || {
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
    };

    const connectedCount = this.getConnectedPlayerCount();
    // One pass over the answer log, not two — this runs on every broadcast.
    const currentAnswers = session.currentQuestionId
      ? db.getAnswers({ questionId: session.currentQuestionId })
      : [];
    const answeredCount = currentAnswers.length;
    // Only the operator receives this, so only the operator pays to compute it.
    const correctCount = isAdmin ? currentAnswers.filter((a) => a.isCorrect).length : 0;

    let activeSafeQuestion: SafeQuestion | null = null;
    let adminPreview: Question | null = null;

    if (session.currentQuestionId) {
      const q = db.getQuestionById(session.currentQuestionId);
      if (q) {
        const questionsInRound = db.getQuestions(q.roundId);
        const qIndex = questionsInRound.findIndex((item) => item.id === q.id);
        const qNum = qIndex >= 0 ? qIndex + 1 : q.order || 1;

        if (session.status === 'QUESTION_ACTIVE' || session.status === 'QUESTION_ENDED') {
          activeSafeQuestion = {
            id: q.id,
            roundId: q.roundId,
            questionNumber: qNum,
            totalQuestions: questionsInRound.length,
            type: q.type || 'MCQ',
            imageUrl: q.imageUrl || undefined,
            text: q.text,
            options: q.options,
            duration: session.duration || q.duration || 10,
            points: q.points || 1000,
            startTime: session.questionStartedAt || Date.now(),
            endTime: session.questionEndsAt || Date.now() + 10000,
          };

          // Reveal the answer key only once the question is closed. While the question
          // is live these must stay omitted — players receive this same payload.
          if (session.status === 'QUESTION_ENDED') {
            activeSafeQuestion.correctOptionId = q.correctOptionId;
            activeSafeQuestion.explanation = q.explanation || '';
          }
        }

        if (isAdmin) {
          adminPreview = q;
        }
      }
    }

    // Between-question hold image: once a question has closed and the admin has
    // advanced, players sit on that question's follow-up image until the next start.
    let interstitialImageUrl: string | null = null;
    if (session.status === 'WAITING' && session.lastEndedQuestionId) {
      const endedQuestion = db.getQuestionById(session.lastEndedQuestionId);
      interstitialImageUrl = endedQuestion?.afterImageUrl || null;
    }

    // Points from the question in play stay out of the standings until it closes.
    const leaderboard = ScoringService.calculateLeaderboard(
      session.activeRoundId || undefined,
      this.getConnectedPlayerUserIds(),
      session.status === 'QUESTION_ACTIVE' ? session.currentQuestionId || undefined : undefined
    );

    return {
      status: session.status as QuizStatus,
      activeRoundId: session.activeRoundId,
      activeRoundNumber: session.activeRoundNumber,
      activeRoundName: session.activeRoundName,
      currentQuestionId: session.currentQuestionId,
      currentQuestionNumber: session.currentQuestionNumber,
      totalQuestions: session.totalQuestions || 0,
      questionStartedAt: session.questionStartedAt,
      questionEndsAt: session.questionEndsAt,
      duration: session.duration,
      activeQuestion: activeSafeQuestion,
      adminQuestionPreview: adminPreview,
      interstitialImageUrl,
      serverTime: Date.now(),
      connectedPlayersCount: connectedCount,
      answeredPlayersCount: answeredCount,
      // Operator telemetry only. With few answers in, a player could read this off
      // the wire and work out their own result before the question closes.
      correctAnswersCount: isAdmin ? correctCount : undefined,
      leaderboardPreview: leaderboard.slice(0, 10),
    };
  }

  /**
   * Sets or switches the active round.
   *
   * Refused while a question is live: switching would pull every player out of it, with
   * no reveal and no results. With endLiveQuestion the question is first closed the
   * normal way — answers already in are kept, scored and revealed — and then the round
   * switches.
   */
  public setActiveRound(roundId: string, options: { endLiveQuestion?: boolean } = {}) {
    const round = db.getRoundById(roundId);
    if (!round) {
      throw new Error('Round not found');
    }

    const current = db.getQuizSession();
    if (current?.status === 'QUESTION_ACTIVE') {
      if (!options.endLiveQuestion) {
        throw new LiveQuestionConflictError(
          `Question ${current.currentQuestionNumber ?? ''} of "${current.activeRoundName ?? 'the active round'}" is live. ` +
            'End it before switching rounds.'
        );
      }
      this.endCurrentQuestion();
    }

    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    const questions = db.getQuestions(roundId);

    const session: QuizSessionState = {
      status: 'WAITING',
      lastEndedQuestionId: null,
      activeRoundId: round.id,
      activeRoundNumber: round.roundNumber,
      activeRoundName: round.name,
      currentQuestionId: questions.length > 0 ? questions[0].id : null,
      currentQuestionNumber: questions.length > 0 ? 1 : null,
      totalQuestions: questions.length,
      questionStartedAt: null,
      questionEndsAt: null,
      duration: round.defaultDuration || 10,
      serverTime: Date.now(),
      connectedPlayersCount: this.getConnectedPlayerCount(),
      answeredPlayersCount: 0,
    };

    db.setQuizSession(session);
    db.updateRound(roundId, { status: 'ACTIVE' });
    this.notifyStateChange();
    return session;
  }

  /**
   * Starts a question with synchronized timer
   */
  public startQuestion(questionId?: string, customDuration?: number): SafeQuestion {
    const session = db.getQuizSession();
    if (!session || !session.activeRoundId) {
      throw new Error('No active round selected');
    }

    const round = db.getRoundById(session.activeRoundId);
    const questions = db.getQuestions(session.activeRoundId);

    if (questions.length === 0) {
      throw new Error('Round has no questions');
    }

    let targetQuestion: Question | undefined;
    if (questionId) {
      targetQuestion = db.getQuestionById(questionId);
    } else if (session.currentQuestionId) {
      targetQuestion = db.getQuestionById(session.currentQuestionId);
    } else {
      targetQuestion = questions[0];
    }

    if (!targetQuestion || targetQuestion.roundId !== session.activeRoundId) {
      targetQuestion = questions[0];
    }

    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    const durationSeconds = customDuration || targetQuestion.duration || round?.defaultDuration || 10;
    const durationMs = durationSeconds * 1000;
    const startTime = Date.now();
    const endTime = startTime + durationMs;

    const qIndex = questions.findIndex((q) => q.id === targetQuestion!.id);
    const questionNumber = qIndex >= 0 ? qIndex + 1 : 1;

    // Update authoritative session
    session.status = 'QUESTION_ACTIVE';
    session.lastEndedQuestionId = null;
    session.currentQuestionId = targetQuestion.id;
    session.currentQuestionNumber = questionNumber;
    session.totalQuestions = questions.length;
    session.questionStartedAt = startTime;
    session.questionEndsAt = endTime;
    session.duration = durationSeconds;

    db.setQuizSession(session);

    // Setup server-authoritative timer
    this.startAuthoritativeTimer(durationMs);

    const safeQuestion: SafeQuestion = {
      id: targetQuestion.id,
      roundId: targetQuestion.roundId,
      questionNumber,
      totalQuestions: questions.length,
      type: targetQuestion.type || 'MCQ',
      text: targetQuestion.text,
      options: targetQuestion.options,
      duration: durationSeconds,
      points: targetQuestion.points || 1000,
      startTime,
      endTime,
    };

    this.onQuestionStartCallbacks.forEach((cb) => cb(safeQuestion));
    this.notifyStateChange();

    return safeQuestion;
  }

  private startAuthoritativeTimer(durationMs: number) {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
    }

    this.timerHandle = setTimeout(() => {
      this.endCurrentQuestion();
    }, durationMs);
  }

  /**
   * Ends current question and calculates question stats
   */
  public endCurrentQuestion() {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    const session = db.getQuizSession();
    if (!session || session.status !== 'QUESTION_ACTIVE' || !session.currentQuestionId) {
      return;
    }

    const question = db.getQuestionById(session.currentQuestionId);
    if (!question) return;

    session.status = 'QUESTION_ENDED';
    session.lastEndedQuestionId = question.id;
    db.setQuizSession(session);

    // Gather question stats
    const answers = db.getAnswers({ questionId: question.id });
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const incorrectCount = answers.length - correctCount;

    const stats = {
      totalAnswered: answers.length,
      correctCount,
      incorrectCount,
    };

    this.onQuestionEndCallbacks.forEach((cb) =>
      cb({
        questionId: question.id,
        correctOptionId: question.correctOptionId,
        stats,
      })
    );

    this.notifyStateChange();
  }

  /**
   * Moves to next question or completes round if at end
   */
  public nextQuestion(): { isComplete: boolean; nextQuestion?: Question } {
    const session = db.getQuizSession();
    if (!session || !session.activeRoundId) {
      throw new Error('No active round');
    }

    const questions = db.getQuestions(session.activeRoundId);
    const currentIndex = questions.findIndex((q) => q.id === session.currentQuestionId);

    if (currentIndex === -1 || currentIndex >= questions.length - 1) {
      // Completed all questions in the round
      session.status = 'ROUND_COMPLETED';
      db.setQuizSession(session);
      db.updateRound(session.activeRoundId, { status: 'COMPLETED' });

      const finalLeaderboard = ScoringService.calculateLeaderboard(
        session.activeRoundId,
        this.getConnectedPlayerUserIds()
      );
      this.onRoundCompletedCallbacks.forEach((cb) =>
        cb({
          roundId: session.activeRoundId!,
          finalLeaderboard,
        })
      );

      this.notifyStateChange();
      return { isComplete: true };
    }

    const nextQ = questions[currentIndex + 1];
    session.status = 'WAITING';
    session.currentQuestionId = nextQ.id;
    session.currentQuestionNumber = currentIndex + 2;
    session.questionStartedAt = null;
    session.questionEndsAt = null;
    session.duration = nextQ.duration || 10;

    db.setQuizSession(session);
    this.notifyStateChange();

    return { isComplete: false, nextQuestion: nextQ };
  }

  /**
   * Moves to previous question if needed
   */
  public previousQuestion(): Question | null {
    const session = db.getQuizSession();
    if (!session || !session.activeRoundId) return null;

    const questions = db.getQuestions(session.activeRoundId);
    const currentIndex = questions.findIndex((q) => q.id === session.currentQuestionId);

    if (currentIndex > 0) {
      const prevQ = questions[currentIndex - 1];
      session.status = 'WAITING';
      session.lastEndedQuestionId = null;
      session.currentQuestionId = prevQ.id;
      session.currentQuestionNumber = currentIndex;
      session.questionStartedAt = null;
      session.questionEndsAt = null;

      db.setQuizSession(session);
      this.notifyStateChange();
      return prevQ;
    }
    return null;
  }

  /**
   * Resets the active round
   */
  public resetRound(roundId: string) {
    // Resetting the round in play is a deliberate, confirmed wipe. Resetting another
    // round must not take down the question that is live in this one — check before
    // the timer is touched, or a refused reset would leave that question with none.
    const session = db.getQuizSession();
    if (session?.status === 'QUESTION_ACTIVE' && session.activeRoundId !== roundId) {
      throw new LiveQuestionConflictError('A question is live in another round. End it before resetting this one.');
    }

    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    db.resetQuizProgress(roundId);
    this.setActiveRound(roundId);
  }

  /**
   * Full result for one player on a question, answer key included. Only ever handed
   * out for a question that has already closed.
   */
  private buildAnswerResult(answer: any, question: Question, leaderboard: LeaderboardEntry[]): AnswerResult {
    const entry = leaderboard.find((l) => l.playerId === answer.playerId);
    return {
      playerId: answer.playerId,
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
      responseTimeMs: answer.responseTimeMs,
      accepted: true,
      correctOptionId: question.correctOptionId,
      isCorrect: answer.isCorrect,
      points: answer.points || 0,
      totalScore: entry ? entry.score : answer.points || 0,
      currentRank: entry ? entry.rank : 1,
    };
  }

  /**
   * Every answering player's full result for a closed question, from a single
   * leaderboard pass. Released per-player the moment the question ends.
   */
  public getQuestionResults(questionId: string): AnswerResult[] {
    const question = db.getQuestionById(questionId);
    if (!question) return [];

    const session = db.getQuizSession();
    const leaderboard = ScoringService.calculateLeaderboard(
      session?.activeRoundId || undefined,
      this.getConnectedPlayerUserIds()
    );

    return db.getAnswers({ questionId }).map((a) => this.buildAnswerResult(a, question, leaderboard));
  }

  /**
   * Rebuilds the answer result a player already received for the question in play.
   * Used on (re)connect: the shared quiz:state broadcast cannot carry per-player
   * data, so a reloading player would otherwise lose their own result.
   * Returns null when they have not answered the current question.
   */
  public getRestorableAnswer(playerId: string): AnswerResult | null {
    const session = db.getQuizSession();
    if (!session || !session.currentQuestionId) return null;
    if (session.status !== 'QUESTION_ACTIVE' && session.status !== 'QUESTION_ENDED') return null;

    const existing = db.getAnswer(playerId, session.currentQuestionId);
    if (!existing) return null;

    // Mid-question, hand back only the receipt: reconnecting must not become a way
    // to peek at the answer ahead of everyone else.
    if (session.status === 'QUESTION_ACTIVE') {
      return {
        playerId,
        questionId: existing.questionId,
        selectedOptionId: existing.selectedOptionId,
        responseTimeMs: existing.responseTimeMs,
        accepted: true,
      };
    }

    const question = db.getQuestionById(session.currentQuestionId);
    if (!question) return null;

    const leaderboard = ScoringService.calculateLeaderboard(
      session.activeRoundId || undefined,
      this.getConnectedPlayerUserIds()
    );

    return this.buildAnswerResult(existing, question, leaderboard);
  }

  /**
   * Handles player answer submission with full server validation
   */
  public submitAnswer(playerId: string, questionId: string, selectedOptionId: string): AnswerResult {
    const session = db.getQuizSession();
    const now = Date.now();

    if (!session || session.status !== 'QUESTION_ACTIVE') {
      throw new Error('Question is not currently active');
    }

    if (session.currentQuestionId !== questionId) {
      throw new Error('Question mismatch');
    }

    if (session.questionEndsAt && now > session.questionEndsAt + 500) {
      // 500ms grace period for network jitter
      throw new Error("Time's up! Submission deadline passed.");
    }

    // Check if player has already submitted for this question
    const existing = db.getAnswer(playerId, questionId);
    if (existing) {
      throw new Error('Answer already submitted for this question');
    }

    const question = db.getQuestionById(questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    const optionValid = question.options.some((opt) => opt.id === selectedOptionId);
    if (!optionValid) {
      throw new Error('Invalid option selected');
    }

    const round = db.getRoundById(question.roundId);
    const isCorrect = question.correctOptionId === selectedOptionId;
    const responseTimeMs = Math.max(0, now - (session.questionStartedAt || now));

    const points = ScoringService.calculatePoints(
      isCorrect,
      responseTimeMs,
      session.duration || question.duration || 10,
      round?.scoringConfig
    );

    db.addAnswer({
      playerId,
      roundId: question.roundId,
      questionId,
      selectedOptionId,
      submittedAt: new Date(now).toISOString(),
      responseTimeMs,
      isCorrect,
      points,
    });

    // The player gets a receipt, nothing more. Correctness, points and standings are
    // withheld until the question closes so everyone learns the answer at the same
    // moment. Skipping the leaderboard pass here also keeps the submit path cheap
    // under an answer storm.
    const result: AnswerResult = {
      playerId,
      questionId,
      selectedOptionId,
      responseTimeMs,
      accepted: true,
    };

    // Notify connected players answer count update
    // Tagged with the question so a client can discard a ping that arrives after
    // the round has already moved on.
    const answeredCount = db.getAnswers({ questionId }).length;
    this.onAnswerSubmittedCallbacks.forEach((cb) =>
      cb({
        questionId,
        answeredCount,
        totalConnected: this.getConnectedPlayerCount(),
      })
    );

    return result;
  }
}

export const quizEngine = QuizEngine.getInstance();
