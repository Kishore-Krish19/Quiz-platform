import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuestionOption {
  id: string;
  text: string;
}

export interface IQuestionDocument extends Document {
  roundId: string;
  order: number;
  type: string;
  text: string;
  options: IQuestionOption[];
  correctOptionId: string;
  duration: number;
  points: number;
  explanation?: string;
  questionCode?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OptionSchema = new Schema<IQuestionOption>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestionDocument>(
  {
    roundId: { type: String, required: true, index: true },
    order: { type: Number, required: true, index: true },
    type: { type: String, default: 'MCQ' },
    text: { type: String, required: true, trim: true },
    options: { type: [OptionSchema], required: true },
    correctOptionId: { type: String, required: true },
    duration: { type: Number, default: 10 },
    points: { type: Number, default: 1000 },
    explanation: { type: String, default: '' },
    questionCode: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Expose virtual `id` field mapped to string representation of `_id`
QuestionSchema.virtual('id').get(function () {
  return this._id ? this._id.toString() : undefined;
});

export const QuestionModel: Model<IQuestionDocument> =
  (mongoose.models.Question as Model<IQuestionDocument>) ||
  mongoose.model<IQuestionDocument>('Question', QuestionSchema);

