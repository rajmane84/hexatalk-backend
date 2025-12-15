import { Types } from 'mongoose';

export type IMessagePayload =
  | {
      type: 'SEND_MESSAGE';
      to: string | Types.ObjectId;
      message: string;
    }
  | {
      type: 'READ_MESSAGES';
      to: string | Types.ObjectId;
      message?: undefined; // explicitly no message
    }
  | {
      type: 'RANDOM_CHAT_INIT';
      to?: undefined;
      message?: undefined; // explicitly no message
    }
  | {
      type: 'RANDOM_CHAT';
      to?: undefined;
      message: string;
    }
  | ICreateGroupChat
  | ISendMessageInGroupChat;

export type WSMessageType =
  | 'GROUP'
  | 'WELCOME'
  | 'PENDING_REQUESTS'
  | 'UNREAD_MSG_COUNT'
  | 'ERROR'
  | 'READ_MESSAGES'
  | 'CREATE_GROUP_CHAT';

export interface ICreateGroupChat {
  type: 'CREATE_GROUP_CHAT';
  members: Types.ObjectId[];
  name: string;
  message?: undefined;
  to?: undefined;
}

export interface ISendMessageInGroupChat {
  type: 'GROUP_MESSAGE';
  message: string;
  to?: undefined;
  chatId: string;
}
