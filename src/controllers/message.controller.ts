import { Request, Response } from 'express';
import { Types } from 'mongoose';
import User from '../schemas/user.schema';
import { IUser } from '../schemas/user.schema';
import Message from '../schemas/message.schema';

// This is page based pagination, change it to cursor based pagination to implement infinite scroll
// TODO: Implement cursor based pagination
// Not only this but we want to implement that all unread messages should be marked as seen after opening the chat

// We'll use this controller when the user open's a particular chat
export const getAllMessagesForUser = async (req: Request, res: Response) => {
  const { friendId } = req.params;

  if (!friendId || Types.ObjectId.isValid(friendId)) {
    return res.status(400).json({ message: 'Please enter a valid userId' });
  }

  const loggedInUser = req.user;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const userExists = await User.findById<IUser>(friendId);

    if (!userExists) {
      return res.status(404).json({ message: 'No such user exists' });
    }

    const areFriends = userExists.friends.some(
      (f: Types.ObjectId) => f.toString() === loggedInUser?._id.toString(),
    );

    if (!areFriends) {
      return res
        .status(400)
        .json({ message: `You are not friends with ${userExists.username}` });
    }

    const messages = await Message.find({
      $or: [
        { from: loggedInUser?._id, to: friendId },
        { from: friendId, to: loggedInUser?._id },
      ],
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    // marking all messages as seen
    await Message.updateMany(
      {
        from: friendId,
        to: loggedInUser?._id,
        readBy: { $ne: loggedInUser?._id },
      },
      { $addToSet: { readBy: loggedInUser?._id } },
    );

    const totalMessages = await Message.countDocuments({
      $or: [
        { from: loggedInUser?._id, to: friendId },
        { from: friendId, to: loggedInUser?._id },
      ],
    });

    return res.status(200).json({
      message: `Your messages with ${userExists.username} is fetched successfullty`,
      page,
      limit,
      totalMessages,
      totalPages: Math.ceil(totalMessages / limit),
      messages,
    });
  } catch (error) {
    console.error('Some error occurred while fetching messages', error);

    return res.status(500).json({
      message: 'Something went wrong fetching messages',
      error: error instanceof Error ? error.message : error,
    });
  }
};
