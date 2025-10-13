import mongoose, { Model, Schema, Types } from 'mongoose';

export interface IFriendRequest extends Document {
  _id: Types.ObjectId;
  from: Types.ObjectId;
  to: Types.ObjectId;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

const friendRequestSchema: Schema<IFriendRequest> = new Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
  },
});

const FriendRequest: Model<IFriendRequest> = mongoose.model<IFriendRequest>(
  'FriendRequest',
  friendRequestSchema,
);

export default FriendRequest;
