import jwt from 'jsonwebtoken';
import { WebSocket } from 'ws';
import User from '../schemas/user.schema';
import { IncomingMessage } from 'http';
import { IUser } from '../schemas/user.schema';

export async function authenticateConnection(
  ws: WebSocket,
  req: IncomingMessage,
): Promise<null | IUser> {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    ws.send(JSON.stringify({ error: 'No authorization header' }));
    ws.close();
    return null;
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(
    token,
    process.env.TOKEN_SECRET!,
  ) as jwt.JwtPayload;

  if (!decoded) {
    ws.send(JSON.stringify({ error: 'Invalid token' }));
    ws.close();
    return null;
  }

  try {
    const user = await User.findById(decoded._id);

    if (!user) {
      ws.send(JSON.stringify({ error: 'User not found' }));
      ws.close();
      return null;
    }

    return user;
  } catch (error: any) {
    ws.send(JSON.stringify({ error: error.message }));
    ws.close();
    return null;
  }
}
