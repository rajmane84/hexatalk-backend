import { Types } from 'mongoose';

export interface IFriendRequest extends Document {
  _id: Types.ObjectId;
  from: Types.ObjectId;
  to: Types.ObjectId;
  status: ['PENDING', 'ACCEPTED', 'REJECTED'];
}
