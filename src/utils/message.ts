import { Types } from 'mongoose';
import Message from '../schemas/message.schema';

interface IUserStats {
  unreadCount: Number;
  lastMessage: {
    text: String;
  };
  friendId: Types.ObjectId;
  username: String;
}

export const getUserStats = async (userId: string): Promise<null | IUserStats[]> => {
  try {
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          to: new Types.ObjectId(userId),
          readBy: { $ne: new Types.ObjectId(userId) },
        },
      },
      {
        $group: {
          _id: '$from',
          unreadCount: { $sum: 1 },
          lastMessage: { $last: '$$ROOT' }, // store the latest message object
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'sender',
        },
      },
      { $unwind: '$sender' },
      {
        $project: {
          _id: 0,
          friendId: '$_id',
          username: '$sender.username',
          unreadCount: 1,
          lastMessage: {
            text: '$lastMessage.message',
            createdAt: '$lastMessage.createdAt',
          },
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }, // optional: sort by latest message
      },
    ]);

    return unreadCounts;
  } catch (error) {
    console.log('Error occured while fetching the count of unread messages');
    return null;
  }
};
