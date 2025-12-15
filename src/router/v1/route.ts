import { Router } from 'express';
import authRouter from './auth.route';
import messageRouter from './message.route';
import chatRouter from './chat.route';
import userRouter from './user.route';

const V1Router = Router();

V1Router.use('/auth', authRouter);
V1Router.use('/message', messageRouter);
V1Router.use('/chat', chatRouter);
V1Router.use('/user', userRouter);

export default V1Router;
