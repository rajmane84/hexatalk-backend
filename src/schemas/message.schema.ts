import mongoose, { Document, Model, Schema } from 'mongoose';
import { IUser } from './user.schema';
import { IChat } from './chat.schema';

export interface IMessage extends Document {
  chat: IChat;
  from: IUser;
  to?: IUser;
  message: string;
  readBy: IUser[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema: Schema<IMessage> = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  message: {
    type: String,
    required: true,
  },
  readBy: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  },
});

const Message: Model<IMessage> = mongoose.model<IMessage>(
  'Message',
  messageSchema,
);

export default Message;
