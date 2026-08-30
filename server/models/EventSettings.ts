import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEventSettingsDocument extends Document {
  eventName: string;
  eventDescription: string;
  defaultQuestionTimer: number;
  defaultPoints: number;
  allowLeaderboard: boolean;
  showResultsAfterQuestion: boolean;
  allowPlayerReconnect: boolean;
  soundEnabledDefault: boolean;
  testModeEnabled: boolean;
  updatedAt: Date;
}

const EventSettingsSchema = new Schema<IEventSettingsDocument>(
  {
    eventName: { type: String, default: 'GADGET CODE' },
    eventDescription: { type: String, default: 'Technical Quiz Competition' },
    defaultQuestionTimer: { type: Number, default: 10 },
    defaultPoints: { type: Number, default: 1000 },
    allowLeaderboard: { type: Boolean, default: true },
    showResultsAfterQuestion: { type: Boolean, default: true },
    allowPlayerReconnect: { type: Boolean, default: true },
    soundEnabledDefault: { type: Boolean, default: true },
    testModeEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const EventSettingsModel: Model<IEventSettingsDocument> =
  (mongoose.models.EventSettings as Model<IEventSettingsDocument>) ||
  mongoose.model<IEventSettingsDocument>('EventSettings', EventSettingsSchema);
