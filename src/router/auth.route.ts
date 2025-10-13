import { Request, Response, Router } from 'express';
import { validateUser } from '../middleware/auth.middleware';
import {
  handleUserLogin,
  handleUserLogout,
  handleUserSignup,
} from '../controllers/auth.controller';

const router = Router();

router.post('/sign-up', handleUserSignup);

router.post('/login', handleUserLogin);

router.get('/logout', validateUser, handleUserLogout);

export default router;
