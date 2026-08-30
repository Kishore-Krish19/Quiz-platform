import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoundDocument extends Document {
  id: string;
  roundNumber: number;
  name: string;
  description?: string;
  defaultDuration: number;
  status: 'PENDING' | 'READY' | 'ACTIVE' | 'COMPLETED';
  scoringConfig: {
    type: 'SPEED_BASED' | 'FIXED' | 'CUSTOM';
    basePoints: number;
    minPoints: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RoundSchema = new Schema<IRoundDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    roundNumber: { type: Number, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    defaultDuration: { type: Number, default: 10 },
    status: {
      type: String,
      enum: ['PENDING', 'READY', 'ACTIVE', 'COMPLETED'],
      default: 'READY',
      index: true,
    },
    scoringConfig: {
      type: {
        type: String,
        enum: ['SPEED_BASED', 'FIXED', 'CUSTOM'],
        default: 'SPEED_BASED',
      },
      basePoints: { type: Number, default: 1000 },
      minPoints: { type: Number, default: 100 },
    },
  },
  {
    timestamps: true,
  }
);

export const RoundModel: Model<IRoundDocument> =
  (mongoose.models.Round as Model<IRoundDocument>) ||
  mongoose.model<IRoundDocument>('Round', RoundSchema);
