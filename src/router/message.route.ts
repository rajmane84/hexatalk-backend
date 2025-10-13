import { Router } from 'express';
import { validateUser } from '../middleware/auth.middleware';
import { getAllMessagesForUser } from '../controllers/message.controller';

const router = Router();

router.get('/:friendId', validateUser, getAllMessagesForUser);

export default router;
