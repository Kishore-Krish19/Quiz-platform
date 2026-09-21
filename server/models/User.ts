import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserDocument extends Document {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: 'ADMIN' | 'PLAYER';
  isActive: boolean;
  activeSessionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'PLAYER'], default: 'PLAYER', required: true, index: true },
    isActive: { type: Boolean, default: true },
    // Identifies the one sign-in currently allowed to use this player account.
    activeSessionId: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any).passwordHash;
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

export const UserModel: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>('User', UserSchema);
