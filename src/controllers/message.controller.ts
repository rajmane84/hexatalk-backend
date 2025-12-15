import { Request, Response } from 'express';
import { FilterQuery, Types } from 'mongoose';
import User from '../schemas/user.schema';
import { IUser } from '../schemas/user.schema';
import Message, { IMessage } from '../schemas/message.schema';

export const getAllMessagesForUser = async (req: Request, res: Response) => {
  const { friendId } = req.params;

  if (!friendId || !Types.ObjectId.isValid(friendId)) {
    return res.status(400).json({ message: 'Please enter a valid userId' });
  }

  const loggedInUser = req.user;
  const cursor = req.query.cursor as string | undefined;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    const userExists = await User.findById<IUser>(friendId);

    if (!userExists) {
      return res.status(404).json({ message: 'No such user exists' });
    }

    const areFriends = userExists._id.toString() === friendId;

    if (!areFriends) {
      return res
        .status(400)
        .json({ message: `You are not friends with ${userExists.username}` });
    }

    const query: FilterQuery<IMessage> = {
      $or: [
        { from: loggedInUser?._id, to: friendId },
        { from: friendId, to: loggedInUser?._id },
      ],
    };

    if (cursor) {
      query._id = { $lt: new Types.ObjectId(cursor) };
    }

    const messages: IMessage[] = await Message.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }

    const nextCursor: string | null =
      messages.length > 0
        ? (messages[messages.length - 1]._id as Types.ObjectId).toString()
        : null;

    await Message.updateMany(
      {
        from: friendId,
        to: loggedInUser?._id,
        readBy: { $ne: loggedInUser?._id },
      },
      { $addToSet: { readBy: loggedInUser?._id } },
    );

    const unreadCount = await Message.countDocuments({
      from: friendId,
      to: loggedInUser?._id,
      readBy: { $ne: loggedInUser?._id },
    });

    return res.status(200).json({
      message: `Your messages with ${userExists.username} fetched successfully`,
      messages: messages.reverse(),
      nextCursor,
      hasMore,
      limit,
      unreadCount,
    });
  } catch (error) {
    console.error('Some error occurred while fetching messages', error);

    return res.status(500).json({
      message: 'Something went wrong fetching messages',
      error: error instanceof Error ? error.message : error,
    });
  }
};
