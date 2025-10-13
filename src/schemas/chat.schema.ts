import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { IUser } from './user.schema';
import { IMessage } from './message.schema';

export interface IChat extends Document {
  name?: string;
  isGroupChat: boolean;
  members: Types.ObjectId[];
  admin?: Types.ObjectId | IUser;
  lastMessage?: Types.ObjectId | IMessage;
  createdAt?: Date;
  updatedAt?: Date;
}

const chatSchema = new Schema<IChat>(
  {
    name: {
      type: String,
      required: function (this: IChat) {
        return this.isGroupChat;
      },
    },
    isGroupChat: {
      type: Boolean,
      required: true,
      default: false,
    },
    // For one-to-one chats, store both members for fast querying
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: function (this: IChat) {
        return this.isGroupChat;
      },
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  { timestamps: true },
);

const Chat: Model<IChat> = mongoose.model<IChat>('Chat', chatSchema);

export default Chat;
