import { WebSocketServer } from 'ws';
import { authenticateConnection } from './ws.auth';
import { handleConnectionClose, handleMessage } from './ws.handlers';
import { sendPendingRequests, users } from './ws.utils';
import { getUserStats } from '../utils/message';

export const initWebSocket = (serverPort: number) => {
  const wss = new WebSocketServer({ port: serverPort });
  console.log(`✅ WebSocket server running on port ${serverPort}`);

  wss.on('connection', async (ws, req) => {
    const user = await authenticateConnection(ws, req);
    if (!user) return;

    console.log(`${wss.clients.size} clients are connected to the WS Server`);

    const userId = user._id.toString();
    users.set(userId, ws);

    ws.send(
      JSON.stringify({ type: 'WELCOME', message: `Welcome ${user.username}` }),
    );

    // As soon as connection is made, inform user about pending requests
    sendPendingRequests(userId);

    // check if user has any unread messages, if yes then send its count and last message (optional)
    const unreadMsgCount = await getUserStats(userId);

    if (unreadMsgCount && unreadMsgCount.length !== 0) {
      ws.send(
        JSON.stringify({
          type: 'UNREAD_MSG_COUNT',
          data: unreadMsgCount,
        }),
      );
    }

    ws.on('message', (data) => handleMessage(ws, data, user));

    ws.on('close', () => {
      handleConnectionClose(userId, user);
    });
  });

  return wss;
};
