import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnswerLogDocument extends Document {
  id: string;
  playerId: string;
  roundId: string;
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  responseTimeMs: number;
  points: number;
  timestamp: Date;
}

const AnswerLogSchema = new Schema<IAnswerLogDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    playerId: { type: String, required: true, index: true },
    roundId: { type: String, required: true, index: true },
    questionId: { type: String, required: true, index: true },
    selectedOptionId: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    responseTimeMs: { type: Number, required: true },
    points: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

AnswerLogSchema.index({ playerId: 1, questionId: 1 }, { unique: false });

export const AnswerLogModel: Model<IAnswerLogDocument> =
  (mongoose.models.AnswerLog as Model<IAnswerLogDocument>) ||
  mongoose.model<IAnswerLogDocument>('AnswerLog', AnswerLogSchema);
