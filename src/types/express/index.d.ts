import _express from 'express';
import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: Types.ObjectId;
        email: string;
        username: string;
      };
    }
  }
}
