import jwt from 'jsonwebtoken';
import { WebSocket } from 'ws';
import User from '../schemas/user.schema';
import { IncomingMessage } from 'http';
import { IUser } from '../schemas/user.schema';
import url from 'url';

export async function authenticateConnection(
  ws: WebSocket,
  req: IncomingMessage,
): Promise<null | IUser> {
  let token: string | undefined;

  const authHeader = req.headers['authorization'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!authHeader) {
    const parsedUrl = url.parse(req.url || '', true);
    token = parsedUrl.query?.token as string | undefined;
  }

  if (!token) {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: 'Authentication Error: Valdiation token is required',
      }),
    );
    ws.close();
    return null;
  }

  const decoded = jwt.verify(
    token,
    process.env.TOKEN_SECRET!,
  ) as jwt.JwtPayload;

  if (!decoded) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid token' }));
    ws.close();
    return null;
  }

  try {
    const user = await User.findById(decoded._id);

    if (!user) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'User not found' }));
      ws.close();
      return null;
    }

    return user;
  } catch (error: unknown) {
    ws.send(
      JSON.stringify({ type: 'ERROR', message: (error as Error).message }),
    );
    ws.close();
    return null;
  }
}
