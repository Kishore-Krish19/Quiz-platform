import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuizSessionDocument extends Document {
  status: 'IDLE' | 'WAITING' | 'QUESTION_ACTIVE' | 'QUESTION_ENDED' | 'ROUND_COMPLETED';
  activeRoundId: string | null;
  activeRoundNumber: number | null;
  activeRoundName: string | null;
  currentQuestionId: string | null;
  currentQuestionNumber: number | null;
  lastEndedQuestionId: string | null;
  totalQuestions: number;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  duration: number | null;
  serverTime: number;
  updatedAt: Date;
}

const QuizSessionSchema = new Schema<IQuizSessionDocument>(
  {
    status: {
      type: String,
      enum: ['IDLE', 'WAITING', 'QUESTION_ACTIVE', 'QUESTION_ENDED', 'ROUND_COMPLETED'],
      default: 'WAITING',
    },
    activeRoundId: { type: String, default: null },
    activeRoundNumber: { type: Number, default: null },
    activeRoundName: { type: String, default: null },
    currentQuestionId: { type: String, default: null },
    currentQuestionNumber: { type: Number, default: null },
    lastEndedQuestionId: { type: String, default: null },
    totalQuestions: { type: Number, default: 0 },
    questionStartedAt: { type: Number, default: null },
    questionEndsAt: { type: Number, default: null },
    duration: { type: Number, default: null },
    serverTime: { type: Number, default: () => Date.now() },
  },
  {
    timestamps: true,
  }
);

export const QuizSessionModel: Model<IQuizSessionDocument> =
  (mongoose.models.QuizSession as Model<IQuizSessionDocument>) ||
  mongoose.model<IQuizSessionDocument>('QuizSession', QuizSessionSchema);
