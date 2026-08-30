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

export class QuizEngine {
  private static instance: QuizEngine;
  private timerHandle: NodeJS.Timeout | null = null;
  private connectedSockets = new Map<string, { userId: string; role: string; socketId: string }>();
  private onStateChangeCallbacks: ((state: QuizSessionState) => void)[] = [];
  private onQuestionEndCallbacks: ((data: { questionId: string; correctOptionId: string; stats: any }) => void)[] = [];
  private onQuestionStartCallbacks: ((question: SafeQuestion) => void)[] = [];
  private onRoundCompletedCallbacks: ((data: { roundId: string; finalLeaderboard: LeaderboardEntry[] }) => void)[] = [];
  private onAnswerSubmittedCallbacks: ((data: { answeredCount: number; totalConnected: number }) => void)[] = [];

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
    const session = db.getQuizSession();
    if (!session) {
      // Initialize default session with Round 1 if available
      const rounds = db.getRounds();
      const round1 = rounds[0];
      const initialSession: QuizSessionState = {
        status: 'WAITING',
        activeRoundId: round1 ? round1.id : null,
        activeRoundNumber: round1 ? round1.roundNumber : 1,
        activeRoundName: round1 ? round1.name : 'Round 1 — Technical Quiz',
        currentQuestionId: null,
        currentQuestionNumber: null,
        totalQuestions: round1 ? db.getQuestions(round1.id).length : 0,
        questionStartedAt: null,
        questionEndsAt: null,
        duration: null,
        serverTime: Date.now(),
        connectedPlayersCount: 0,
        answeredPlayersCount: 0,
      };
      db.setQuizSession(initialSession);
    } else if (session.status === 'QUESTION_ACTIVE' && session.questionEndsAt) {
      const now = Date.now();
      if (now >= session.questionEndsAt) {
        // Automatically close expired question on reboot
        this.endCurrentQuestion();
      } else {
        // Resume remaining timer
        const remainingMs = session.questionEndsAt - now;
        this.startAuthoritativeTimer(remainingMs);
      }
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

  public onAnswerSubmitted(cb: (data: { answeredCount: number; totalConnected: number }) => void) {
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
    const answeredCount = session.currentQuestionId
      ? db.getAnswers({ questionId: session.currentQuestionId }).length
      : 0;

    let correctCount = 0;
    if (session.currentQuestionId) {
      correctCount = db.getAnswers({ questionId: session.currentQuestionId }).filter((a) => a.isCorrect).length;
    }

    let activeSafeQuestion: SafeQuestion | null = null;
    let adminPreview: Question | null = null;

    if (session.currentQuestionId) {
      const q = db.getQuestionById(session.currentQuestionId);
      if (q) {
        const questionsInRound = db.getQuestions(q.roundId);
        const qIndex = questionsInRound.findIndex((item) => item.id === q.id);
        const qNum = qIndex >= 0 ? qIndex + 1 : q.order || 1;

        if (session.status === 'QUESTION_ACTIVE') {
          activeSafeQuestion = {
            id: q.id,
            roundId: q.roundId,
            questionNumber: qNum,
            totalQuestions: questionsInRound.length,
            type: q.type || 'MCQ',
            text: q.text,
            options: q.options,
            duration: session.duration || q.duration || 10,
            points: q.points || 1000,
            startTime: session.questionStartedAt || Date.now(),
            endTime: session.questionEndsAt || Date.now() + 10000,
          };
        }

        if (isAdmin) {
          adminPreview = q;
        }
      }
    }

    const leaderboard = ScoringService.calculateLeaderboard(
      session.activeRoundId || undefined,
      this.getConnectedPlayerUserIds()
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
      serverTime: Date.now(),
      connectedPlayersCount: connectedCount,
      answeredPlayersCount: answeredCount,
      correctAnswersCount: correctCount,
      leaderboardPreview: leaderboard.slice(0, 10),
    };
  }

  /**
   * Sets or switches active round
   */
  public setActiveRound(roundId: string) {
    const round = db.getRoundById(roundId);
    if (!round) {
      throw new Error('Round not found');
    }

    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    const questions = db.getQuestions(roundId);

    const session: QuizSessionState = {
      status: 'WAITING',
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
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    db.resetQuizProgress(roundId);
    this.setActiveRound(roundId);
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

    const savedAnswer = db.addAnswer({
      playerId,
      roundId: question.roundId,
      questionId,
      selectedOptionId,
      submittedAt: new Date(now).toISOString(),
      responseTimeMs,
      isCorrect,
      points,
    });

    const leaderboard = ScoringService.calculateLeaderboard(
      session.activeRoundId || undefined,
      this.getConnectedPlayerUserIds()
    );
    const playerEntry = leaderboard.find((l) => l.playerId === playerId);

    const result: AnswerResult = {
      playerId,
      questionId,
      selectedOptionId,
      correctOptionId: question.correctOptionId,
      isCorrect,
      points,
      responseTimeMs,
      totalScore: playerEntry ? playerEntry.score : points,
      currentRank: playerEntry ? playerEntry.rank : 1,
    };

    // Notify connected players answer count update
    const answeredCount = db.getAnswers({ questionId }).length;
    this.onAnswerSubmittedCallbacks.forEach((cb) =>
      cb({
        answeredCount,
        totalConnected: this.getConnectedPlayerCount(),
      })
    );

    return result;
  }
}

export const quizEngine = QuizEngine.getInstance();
