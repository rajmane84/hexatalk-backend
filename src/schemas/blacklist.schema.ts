import mongoose, { Schema, Model } from 'mongoose';
import { Document } from 'mongoose';

export interface IBlackList extends Document {
  token: string;
  expiresAt: Date;
}

const blacklistSchema: Schema<IBlackList> = new mongoose.Schema<IBlackList>({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// Automatically delete expired tokens (optional but good for cleanup)
blacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BlacklistedToken: Model<IBlackList> = mongoose.model(
  'BlacklistedToken',
  blacklistSchema,
);

export default BlacklistedToken;
