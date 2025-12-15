import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../schemas/user.schema';
import { IUser } from '../schemas/user.schema';
import BlacklistedToken from '../schemas/blacklist.schema';

export async function validateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token =
    req.header('Authorization')?.split(' ')[1] || req.cookies['token'];

  if (!token) {
    return res.status(403).json({ message: 'Token is required' });
  }

  const isBlacklisted = await BlacklistedToken.findOne({ token });

  if (isBlacklisted) {
    return res.status(401).json({ message: 'Token has been revoked' });
  }

  const decodedToken = jwt.decode(token) as jwt.JwtPayload;

  if (!decodedToken) {
    return res.status(403).json({ message: 'Invalid Token' });
  }

  const { _id, email, username } = decodedToken;

  let user: IUser | null;

  try {
    user = await User.findById(_id);
  } catch (_error) {
    return res.status(500).json({ message: 'Unexpected error' });
  }

  if (!user) {
    return res.status(403).json({ message: 'No such user exists' });
  }

  req.user = {
    _id,
    email,
    username,
  };

  next();
}
