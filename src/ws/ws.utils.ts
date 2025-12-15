import { WebSocket } from 'ws';
import FriendRequest from '../schemas/friendRequest.schema';
import Message from '../schemas/message.schema';
import Chat, { IChat } from '../schemas/chat.schema';
import User, { IUser } from '../schemas/user.schema';
import { Types } from 'mongoose';
import { getUserStats } from '../utils/message';
import { checkFriendship, validateRecipient } from './ws.helper';

export const users = new Map<string, WebSocket>();
export const waitingUsers: Map<string, WebSocket> = new Map();
export const randomPairs: Map<string, string> = new Map(); // key: userId, value: partnerId

export const sendToUser = (userId: string, data: unknown) => {
  if (users.has(userId)) {
    const ws = users.get(userId);
    ws?.send(JSON.stringify(data));
  }
};

// This is for group chat
export const broadcastToGroup = (groupMembers: string[], data: unknown) => {
  groupMembers.forEach((id) => sendToUser(id, data));
};

export const sendPendingRequests = async (userId: string) => {
  const pendingRequests = await FriendRequest.find({
    to: userId,
    status: 'PENDING',
  });

  if (pendingRequests.length !== 0) {
    if (users.has(userId)) {
      const ws = users.get(userId);
      ws?.send(
        JSON.stringify({ type: 'PENDING_REQUESTS', data: pendingRequests }),
      );
    }
  }
};

export async function updateLastMessage(userId: string) {
  try {
    const chats = await Chat.find({ members: userId });

    for (const chat of chats) {
      const lastMsg = await Message.findOne({ chat: chat._id })
        .sort({ createdAt: -1 })
        .select('_id');

      if (lastMsg) {
        chat.lastMessage = lastMsg._id as Types.ObjectId;
        await chat.save();
      }
    }
  } catch (err) {
    console.error('Error updating lastMessage:', err);
  }
}

export const handleSendMessages = async (
  message: string,
  recipientId: string,
  sender: IUser,
  ws: WebSocket,
) => {
  if (!recipientId) {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: 'Recipient Id is required',
      }),
    );
    return;
  }

  const result = await validateRecipient(recipientId.toString());

  if (!result.validationSuccess || !result.data) {
    ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
    return;
  }

  const { data: recipient } = result;

  const isFriend = await checkFriendship(sender, recipient);

  if (!isFriend) {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: `You are not friends with ${recipient.username}.`,
      }),
    );
    return;
  }

  let chat = await Chat.findOne({
    members: { $all: [sender._id, recipient._id] },
    isGroupChat: false,
  });

  if (!chat) {
    chat = await Chat.create({
      members: [sender._id, recipient._id],
      isGroupChat: false,
    });
  }

  await Message.create({
    chat: chat._id,
    from: sender._id,
    to: recipient._id,
    message,
    readBy: [sender._id], // since we have sent the message, so we by default have seen it
  });

  sendToUser(recipient._id.toString(), { from: sender.username, message });
  return;
};

export const handleReadMessages = async (
  sender: IUser,
  recipientId: string,
  ws: WebSocket,
) => {
  if (!recipientId) {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: 'Recipient Id is required',
      }),
    );
    return;
  }

  const result = await validateRecipient(recipientId.toString());

  if (!result.validationSuccess || !result.data) {
    ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
    return;
  }

  const { data: recipient } = result;

  const isFriend = checkFriendship(sender, recipient);

  if (!isFriend) {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: `You are not friends with ${recipient.username}.`,
      }),
    );
    return;
  }

  try {
    // Mark partner's messages to reader as read
    await Message.updateMany(
      { from: recipient._id, to: sender._id, readBy: { $ne: sender._id } },
      { $push: { readBy: sender._id } },
    );

    // Send updated unread count to the reader
    const updatedUnread = await getUserStats(sender._id.toString());
    ws.send(
      JSON.stringify({
        type: 'UNREAD_MSG_COUNT',
        data: updatedUnread,
      }),
    );

    // Notify chat partner if they are online
    const partnerSocket = users.get(recipient._id.toString());
    if (partnerSocket) {
      partnerSocket.send(
        JSON.stringify({
          type: 'MESSAGES_READ',
          data: {
            by: sender._id,
            chatWith: recipient._id,
          },
        }),
      );
    }
  } catch (err: unknown) {
    console.error(
      'Error handling read messages:',
      (err as Error).message || err,
    );
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: 'Failed to mark messages as read',
        error: err instanceof Error ? err.message : err,
      }),
    );
  }

  return;
};

export const handleRandomChatInit = async (sender: IUser, ws: WebSocket) => {
  if (waitingUsers.size === 0) {
    waitingUsers.set(sender._id.toString(), ws);
    ws.send(
      JSON.stringify({
        type: 'RANDOM_CHAT_WAITING',
        message: 'Waiting for another user...',
      }),
    );
    return;
  }

  const waitingList = Array.from(waitingUsers.entries());
  const [randomUserId, randomSocket] =
    waitingList[Math.floor(Math.random() * waitingList.length)];

  // Pair both
  waitingUsers.delete(randomUserId);
  randomPairs.set(sender._id.toString(), randomUserId);
  randomPairs.set(randomUserId, sender._id.toString());

  const randomUser = await User.findById<IUser>(randomUserId);

  ws.send(
    JSON.stringify({
      type: 'RANDOM_CHAT_CONNECTED',
      message: 'You are now connected to a random user!',
      partnerUsername: randomUser?.username,
    }),
  );

  randomSocket.send(
    JSON.stringify({
      type: 'RANDOM_CHAT_CONNECTED',
      message: 'You are now connected to a random user!',
      partnerUsername: sender.username,
    }),
  );

  return;
};

export const handleRandomChat = async (
  message: string,
  sender: IUser,
  ws: WebSocket,
) => {
  const partnerId = randomPairs.get(sender._id.toString());
  if (!partnerId) {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: 'You are not connected to anyone',
      }),
    );

    return;
  }

  const partnerSocket = users.get(partnerId);
  if (partnerSocket) {
    partnerSocket.send(
      JSON.stringify({
        type: 'RANDOM_CHAT_MESSAGE',
        from: sender.username,
        message,
      }),
    );

    return;
  } else {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: 'Partner is disconnected.',
      }),
    );
    return;
  }
};

export const handleCreateNewGroupChat = async (
  groupName: string,
  sender: IUser,
  members: Types.ObjectId[],
  ws: WebSocket,
) => {
  const groupExists = await Chat.findOne<IChat>({
    name: groupName,
    admin: sender._id,
  });

  if (groupExists) {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: 'You have already created a group with this name',
      }),
    );
    return;
  }

  // Validate members are friends
  const senderFriends: string[] = sender.friends.map((id: Types.ObjectId) =>
    id.toString(),
  );
  const memberIds: string[] = members.map((id) => id.toString());

  const filteredMembers = memberIds.filter(
    (id) => id !== sender._id.toString(),
  );
  const allAreFriends = filteredMembers.every((id) =>
    senderFriends.includes(id),
  );

  if (!allAreFriends) {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: 'You can create a group only with your friends',
      }),
    );
    return;
  }

  const finalMembers = [...new Set([...members, sender._id])];
  await Chat.create({
    name: groupName,
    isGroupChat: true,
    members: finalMembers,
    admin: sender._id,
  });

  for (const memberId of filteredMembers) {
    const memberSocket = users.get(memberId.toString());
    if (memberSocket) {
      memberSocket.send(
        JSON.stringify({
          type: 'NOTIFICATION',
          message: `You are added to a new group "${groupName}" by ${sender.username}`,
        }),
      );
    }
  }

  // TODO: Implement a functionality such that, The users which are not online will get the message once they are online.
  // Create a notification schema for the above

  ws.send(
    JSON.stringify({
      type: 'NEW_GROUP_CREATED',
      message: `New group ${groupName} created successfully`,
    }),
  );
};

export const handleSendGroupMessage = async (
  chatId: string,
  message: string,
  sender: IUser,
  ws: WebSocket,
) => {
  const groupExists = await Chat.findOne<IChat>({
    _id: chatId,
    members: sender._id,
  }).exec();

  if (!groupExists) {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: 'Group not found or you are not a member of this group',
      }),
    );
    return;
  }

  const newMessage = await Message.create({
    chat: groupExists._id,
    from: sender._id,
    message,
    readBy: [sender._id],
  });

  const filteredMembers = groupExists.members
    .filter((id) => id.toString() !== sender._id.toString())
    .map((id) => id.toString());

  // for (const memberId of filteredMembers) {
  //   const memberSocket = users.get(memberId.toString());
  //   if (memberSocket) {
  //     memberSocket.send(
  //       JSON.stringify({
  //         type: 'GROUP_CHAT',
  //         data: {
  //           chatId: groupExists._id,
  //           message: newMessage.message,
  //           from: sender._id,
  //           createdAt: newMessage.createdAt,
  //         },
  //       }),
  //     );
  //   }
  // }

  const data = {
    chatId: groupExists._id,
    message: newMessage.message,
    from: sender._id,
    createdAt: newMessage.createdAt,
  };

  broadcastToGroup(filteredMembers, data);

  ws.send(
    JSON.stringify({
      type: 'GROUP_MESSAGE_SENT',
      data: newMessage,
    }),
  );
};
