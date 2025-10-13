import mongoose, { Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password?: string;
  username: string;
  friends: Types.ObjectId[]; // when we populate the friends we have to do some extra things
  createdAt: Date;
  updatedAt: Date;
}

const userSchema: mongoose.Schema<IUser> = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true },
);

const User: mongoose.Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
