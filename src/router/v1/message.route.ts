import { Router } from 'express';
import { validateUser } from '../../middleware/auth.middleware';
import { getAllMessagesForUser } from '../../controllers/message.controller';

const messageRouter = Router();

messageRouter.get('/:friendId', validateUser, getAllMessagesForUser);

export default messageRouter;
