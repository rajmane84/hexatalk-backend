import { Router } from 'express';
import { handleUserLogin, handleUserLogout, handleUserSignup } from '../../controllers/auth.controller';
import { validateUser } from '../../middleware/auth.middleware';

const authRouter = Router();

authRouter.get('/logout', validateUser, handleUserLogout);

authRouter.post('/sign-up', handleUserSignup);

authRouter.post('/login', handleUserLogin);

export default authRouter;