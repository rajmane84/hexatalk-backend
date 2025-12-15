import { Router } from 'express';
import {
  acceptFriendRequest,
  addNewFriend,
  getAllFriends,
  getAllRequests,
  handleUpdateAvatar,
  handleUpdateUser,
  rejectFriendRequest,
  removeFriend,
} from '../../controllers/user.controller';
import { validateUser } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/multer.middleware';

const userRouter = Router();

userRouter.use(validateUser);

userRouter.get('/all-requests', getAllRequests);
userRouter.get('/accept-request/:requestId', acceptFriendRequest);
userRouter.get('/reject-request/:requestId', rejectFriendRequest);
userRouter.get('/friends', getAllFriends);

userRouter.post('/add-friend', addNewFriend);

userRouter.patch('/update', handleUpdateUser);
userRouter.patch('/update-avatar', upload.single('avatar'), handleUpdateAvatar);

userRouter.delete('remove-friend', removeFriend);

export default userRouter;
