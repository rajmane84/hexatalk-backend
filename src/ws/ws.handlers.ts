import {
  handleCreateNewGroupChat,
  handleRandomChat,
  handleRandomChatInit,
  handleReadMessages,
  handleSendGroupMessage,
  handleSendMessages,
  randomPairs,
  updateLastMessage,
  users,
  waitingUsers,
} from './ws.utils';
import { IMessagePayload } from '../types/ws.types';
import { RawData, WebSocket } from 'ws';
import { IUser } from '../schemas/user.schema';

export async function handleMessage(
  ws: WebSocket,
  data: RawData,
  sender: IUser,
): Promise<void> {
  try {
    const payload: IMessagePayload = JSON.parse(data.toString());
    const { to: recipientId, message, type } = payload;

    if (
      type === 'SEND_MESSAGE' ||
      type === 'RANDOM_CHAT' ||
      type === 'GROUP_MESSAGE'
    ) {
      if (!message || message?.trim() === '') {
        ws.send(
          JSON.stringify({ type: 'ERROR', message: 'Message is required' }),
        );
        return;
      }
    }

    if (type === 'CREATE_GROUP_CHAT') {
      let { members } = payload;

      if (!payload.name || payload.name.trim() === '') {
        ws.send(
          JSON.stringify({ type: 'ERROR', message: 'Group Name is required' }),
        );
        return;
      }

      members = [...members, sender._id];

      if (members.length < 2) {
        ws.send(
          JSON.stringify({
            type: 'ERROR',
            message: 'Atleast 3 members should be there in a group',
          }),
        );
        return;
      }
    }

    switch (type) {
      case 'SEND_MESSAGE':
        await handleSendMessages(message, recipientId as string, sender, ws);
        break;
      case 'READ_MESSAGES':
        await handleReadMessages(sender, recipientId as string, ws);
        break;
      case 'RANDOM_CHAT_INIT':
        await handleRandomChatInit(sender, ws);
        break;
      case 'RANDOM_CHAT':
        await handleRandomChat(message, sender, ws);
        break;
      case 'CREATE_GROUP_CHAT':
        await handleCreateNewGroupChat(
          payload.name,
          sender,
          payload.members,
          ws,
        );
        break;
      case 'GROUP_MESSAGE':
        await handleSendGroupMessage(payload.chatId, message, sender, ws);
        break;
      default:
        ws.send(
          JSON.stringify({ type: 'ERROR', message: 'Unknown message type' }),
        );
        break;
    }
  } catch (err: unknown) {
    console.error('Message handling error:', (err as Error).message);
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

export async function handleConnectionClose(userId: string, user: IUser) {
  try {
    console.log(`❌ ${user.username} disconnected`);
    users.delete(userId);

    // Case 1: If the user was waiting for a partner
    if (waitingUsers.has(userId)) {
      waitingUsers.delete(userId);
      console.log(`🕓 Removed ${user.username} from waiting list.`);
    }

    // Case 2: If the user was in a random chat
    const partnerId = randomPairs.get(userId);
    if (partnerId) {
      // Remove both sides of the pairing
      randomPairs.delete(userId);
      randomPairs.delete(partnerId);

      // Inform the partner if they are still connected
      const partnerSocket = users.get(partnerId);
      if (partnerSocket) {
        partnerSocket.send(
          JSON.stringify({
            type: 'RANDOM_CHAT_DISCONNECTED',
            message: 'Your chat partner has disconnected.',
          }),
        );
      }

      console.log(`🔌 Disconnected pair: ${userId} ↔ ${partnerId}`);
    }

    // updating the lastMessages
    await updateLastMessage(userId);
  } catch (err) {
    console.error('🔥 Error in handleConnectionClose:', err);
  }
}
