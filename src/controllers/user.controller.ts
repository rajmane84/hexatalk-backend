import { Request, Response } from 'express';
import User from '../schemas/user.schema';
import { addFriendSchema, removeFriendSchema } from '../zod/user.schema';
import FriendRequest from '../schemas/friendRequest.schema';
import { users } from '../ws/ws.utils';
import mongoose, { Document, Types } from 'mongoose';
import { IFriendRequest } from '../types/user.types';
import { IUser } from '../schemas/user.schema';
import Message from '../schemas/message.schema';

export async function addNewFriend(req: Request, res: Response) {
  const result = addFriendSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.format });
  }

  const { username } = result.data;

  const loggedInUserId = req.user?._id;

  try {
    // Fetch both users
    const [loggedInUser, receiver] = await Promise.all([
      User.findById<IUser>(loggedInUserId),
      User.findOne<IUser>({ username }),
    ]);

    if (!loggedInUser) {
      return res.status(404).json({ message: 'Logged-in user not found' });
    }

    if (!receiver) {
      return res
        .status(404)
        .json({ message: 'User with this username does not exist' });
    }

    if (loggedInUser.username === receiver.username) {
      return res.status(400).json({ message: 'You cannot add yourself' });
    }

    const alreadyFriends = loggedInUser.friends?.some(
      (f: Types.ObjectId) => f.toString() === receiver._id.toString(),
    );

    if (alreadyFriends) {
      return res
        .status(400)
        .json({ message: 'You are already friends with this user' });
    }

    const requestExists = await FriendRequest.findOne({
      from: loggedInUserId,
      to: receiver._id,
      status: 'PENDING',
    });

    if (requestExists) {
      return res
        .status(200)
        .json({ message: 'You’ve already sent a friend request to this user' });
    }

    await FriendRequest.create({
      from: loggedInUserId,
      to: receiver._id,
      status: 'PENDING',
    });

    const receiverSocket = users.get(receiver._id.toString());
    if (receiverSocket) {
      receiverSocket.send(
        JSON.stringify({
          type: 'FRIEND_REQUEST',
          from: req.user?.username,
        }),
      );
      console.log(`Sent friend request to ${receiver.username}`);
    }

    res.status(200).json({
      message: `Friend request to ${receiver.username} is sent successfully`,
    });
  } catch (error) {
    console.error('Failed to add friend:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function removeFriend(req: Request, res: Response) {
  const result = removeFriendSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.format });
  }

  const { username } = result.data;

  const loggedInUserId = req.user?._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fetch both users
    const [loggedInUser, userToRemove] = await Promise.all([
      User.findById<IUser>(loggedInUserId),
      User.findOne<IUser>({ username }),
    ]);

    if (!loggedInUser) {
      return res.status(404).json({ message: 'Logged-in user not found' });
    }

    if (!userToRemove) {
      return res
        .status(404)
        .json({ message: 'User with this username does not exist' });
    }

    if (loggedInUser.username === userToRemove.username) {
      return res.status(400).json({ message: 'You cannot remove yourself' });
    }

    const areFriends = loggedInUser.friends?.some(
      (f: Types.ObjectId) => f.toString() === userToRemove._id.toString(),
    );

    if (!areFriends) {
      return res.status(400).json({
        message: `You can't remove ${username} as you are not friends`,
      });
    }

    await Promise.all([
      User.findByIdAndUpdate(
        loggedInUserId,
        { $pull: { friends: userToRemove._id } },
        { session },
      ),
      User.findByIdAndUpdate(
        userToRemove._id,
        { $pull: { friends: loggedInUserId } },
        { session },
      ),
    ]);

    await session.commitTransaction();
    console.log('✅ Friends removed successfully');

    res.status(200).json({
      message: `${username} removed from friend successfully`,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Transaction failed:', error);

    return res.status(500).json({
      message: 'Something went wrong while removing friend',
      error: error instanceof Error ? error.message : error,
    });
  } finally {
    session.endSession();
  }
}

export async function acceptFriendRequest(req: Request, res: Response) {
  const { requestId } = req.params;

  if (!requestId || !Types.ObjectId.isValid(requestId)) {
    return res.status(400).json({ message: 'Please enter a valid request id' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const requestExists =
      await FriendRequest.findById<IFriendRequest>(requestId);

    if (!requestExists) {
      return res.status(404).json({
        message: 'No such request exists!! May be it is already accepted',
      });
    }

    await FriendRequest.findByIdAndUpdate(requestId, {
      status: 'ACCEPTED',
    });

    await Promise.all([
      User.findByIdAndUpdate(
        requestExists.to,
        {
          $addToSet: { friends: requestExists.from },
        },
        { session },
      ),
      User.findByIdAndUpdate(
        requestExists.from,
        {
          $addToSet: { friends: requestExists.to },
        },
        { session },
      ),
    ]);

    await session.commitTransaction();
    console.log('✅ New Friend added successfully');

    const receiverSocket = users.get(requestExists.from.toString());
    if (receiverSocket) {
      receiverSocket.send(
        JSON.stringify({
          type: 'FRIEND_REQUEST_ACCEPTED',
          message: `${req.user?.username} accepted your friend request`,
        }),
      );
    }

    return res.status(200).json({
      message: `🎉 New friend added`,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Transaction failed:', error);

    return res.status(500).json({
      message: 'Something went wrong while accepting request',
      error: error instanceof Error ? error.message : error,
    });
  } finally {
    session.endSession();
  }
}

export async function rejectFriendRequest(req: Request, res: Response) {
  try {
    const { requestId } = req.params;

    if (!requestId || !Types.ObjectId.isValid(requestId)) {
      return res
        .status(400)
        .json({ message: 'Please enter a valid request id' });
    }

    const requestExists =
      await FriendRequest.findById<IFriendRequest>(requestId);

    if (!requestExists) {
      return res.status(404).json({
        message: 'No such request exists!! May be it is already accepted',
      });
    }

    await FriendRequest.findByIdAndUpdate(requestId, {
      status: 'REJECTED',
    });

    return res.status(200).json({
      message: `Friend request rejected successfully`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getAllRequests(req: Request, res: Response) {
  try {
    const userId = req.user?._id;

    const allRequests = await FriendRequest.find<IFriendRequest>({
      to: userId,
    }).populate('from', 'username email').select('_id from status');

    if (allRequests.length === 0) {
      return res
        .status(200)
        .json({ message: "You don't have any friend requests" });
    }

    // const requests = allRequests.map(req => ({
    //   _id: req._id,
    //   from: req.from,
    //   status: req.status
    // }))

    return res.status(200).json({
      message: `you have ${allRequests.length} friend requests`,
      requests: allRequests,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getAllFriends(req: Request, res: Response) {
  const loggedInUserId = req.user?._id;

  try {
    const currentUser = await User.findById(loggedInUserId).populate(
      'friends',
      'username email',
    );
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friendsWithUnread = await Promise.all(
      (currentUser.friends as any[]).map(async (friend) => {
        if (!friend) return null;

        const unreadCount = await Message.countDocuments({
          from: friend._id,
          to: loggedInUserId,
          readBy: { $ne: loggedInUserId }, // "readBy array does NOT include me"
        });

        // Return a custom object merging friend details + unreadCount
        return {
          _id: friend._id,
          username: friend.username,
          email: friend.email,
          unreadCount: unreadCount,
        };
      }),
    );

    const validFriends = friendsWithUnread.filter((frnd) => {
      return frnd !== null && frnd.username !== req.user?.username;
    });

    return res.status(200).json({ friends: validFriends });
  } catch (error) {
    console.log(`Failed to fetch friends of ${req.user?.username}`);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
