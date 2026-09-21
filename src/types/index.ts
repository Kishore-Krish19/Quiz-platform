export type UserRole = 'ADMIN' | 'PLAYER';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  /** Server-side only: the single sign-in currently allowed on this account. */
  activeSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RoundStatus = 'DRAFT' | 'READY' | 'ACTIVE' | 'COMPLETED';

export type ScoringType = 'SPEED_BASED' | 'FIXED' | 'CUSTOM';

export interface ScoringConfig {
  type: ScoringType;
  basePoints: number;
  minPoints?: number;
  speedRatioWeight?: number;
}

export interface Round {
  id: string;
  roundNumber: number;
  name: string;
  description: string;
  status: RoundStatus;
  defaultDuration: number; // in seconds
  scoringConfig: ScoringConfig;
  totalQuestions?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'MULTI_SELECT' | 'SHORT_ANSWER';

export interface Question {
  id: string;
  roundId: string;
  order: number;
  type: QuestionType;
  text: string;
  options: QuestionOption[];
  correctOptionId: string; // Only visible to admin/server
  duration: number; // in seconds
  points: number;
  explanation?: string;
  questionCode?: string;
  imageUrl?: string; // Optional image shown above the question text on the player screen
  afterImageUrl?: string; // Optional image shown in the gap after this question ends
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Client-safe question. correctOptionId and explanation are sent only after the
// question closes (QUESTION_ENDED), never while it is accepting answers.
export interface SafeQuestion {
  id: string;
  roundId: string;
  questionNumber: number;
  totalQuestions: number;
  type: QuestionType;
  imageUrl?: string;
  text: string;
  options: QuestionOption[];
  duration: number;
  points: number;
  startTime: number;
  endTime: number;
  correctOptionId?: string;
  explanation?: string;
}

export type QuizStatus =
  | 'IDLE'
  | 'WAITING'
  | 'QUESTION_ACTIVE'
  | 'QUESTION_ENDED'
  | 'ROUND_COMPLETED'
  | 'EVENT_COMPLETED';

export interface QuizSessionState {
  status: QuizStatus;
  activeRoundId: string | null;
  activeRoundNumber: number | null;
  activeRoundName: string | null;
  currentQuestionId: string | null;
  currentQuestionNumber: number | null;
  totalQuestions: number;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  duration: number | null;
  activeQuestion?: SafeQuestion | null;
  adminQuestionPreview?: Question | null;
  // Image to hold on the player screen between questions, until the admin starts the next one
  interstitialImageUrl?: string | null;
  lastEndedQuestionId?: string | null;
  serverTime: number;
  connectedPlayersCount: number;
  answeredPlayersCount: number;
  correctAnswersCount?: number;
  leaderboardPreview?: LeaderboardEntry[];
}

export interface AnswerSubmission {
  questionId: string;
  selectedOptionId: string;
}

export interface AnswerResult {
  playerId: string;
  questionId: string;
  selectedOptionId: string;
  responseTimeMs: number;
  accepted?: boolean;
  // Everything below is embargoed while the question is still running, so that no
  // player can learn the answer — or even whether they were right — before the rest.
  // It is released to each player individually the moment the question closes.
  correctOptionId?: string;
  isCorrect?: boolean;
  points?: number;
  totalScore?: number;
  currentRank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  displayName: string;
  score: number;
  correctAnswers: number;
  questionsAnswered: number;
  avgResponseTimeMs: number;
  isConnected: boolean;
  lastPointsEarned?: number;
}

export interface EventSettings {
  eventName: string;
  eventDescription: string;
  defaultQuestionTimer: number;
  defaultPoints: number;
  allowLeaderboard: boolean;
  showResultsAfterQuestion: boolean;
  allowPlayerReconnect: boolean;
  soundEnabledDefault: boolean;
  testModeEnabled: boolean;
}

// Client <-> Server Socket Events
export interface ServerToClientEvents {
  'quiz:state': (state: QuizSessionState) => void;
  'quiz:round_started': (data: { roundId: string; roundNumber: number; name: string; totalQuestions: number }) => void;
  'quiz:question_started': (question: SafeQuestion) => void;
  'quiz:question_ended': (data: {
    questionId: string;
    correctOptionId: string;
    stats: { totalAnswered: number; correctCount: number; incorrectCount: number };
  }) => void;
  'quiz:round_completed': (data: { roundId: string; finalLeaderboard: LeaderboardEntry[] }) => void;
  'quiz:leaderboard_updated': (leaderboard: LeaderboardEntry[]) => void;
  'quiz:player_answered_update': (stats: {
    questionId: string;
    answeredCount: number;
    totalConnected: number;
  }) => void;
  'player:answer_result': (result: AnswerResult) => void;
  // Sent to a single player on (re)connect so a browser reload does not lose the
  // result they already received. Same shape, but it is a replay, not a new result.
  'player:answer_restored': (result: AnswerResult) => void;
  'player:connection_status': (data: { count: number; players: { id: string; username: string; displayName: string; isConnected: boolean }[] }) => void;
  'admin:stats_update': (stats: {
    connectedCount: number;
    answeredCount: number;
    correctCount: number;
    incorrectCount: number;
  }) => void;
  'system:error': (message: string) => void;
}

export interface ClientToServerEvents {
  'admin:start_round': (data: { roundId: string }) => void;
  'admin:start_question': (data: { questionId?: string; roundId?: string }) => void;
  'admin:end_question': () => void;
  'admin:next_question': () => void;
  'admin:previous_question': () => void;
  'admin:reset_round': (data: { roundId: string }) => void;
  'admin:end_round': () => void;
  'player:submit_answer': (data: AnswerSubmission) => void;
  'quiz:request_sync': () => void;
}
