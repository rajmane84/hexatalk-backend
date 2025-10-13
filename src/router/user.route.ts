import { Router } from 'express';
import { validateUser } from '../middleware/auth.middleware';
import {
  acceptFriendRequest,
  addNewFriend,
  getAllFriends,
  getAllRequests,
  rejectFriendRequest,
  removeFriend,
} from '../controllers/user.controller';

const router = Router();

router.use(validateUser);

router.post('/add-friend', addNewFriend);
router.delete('remove-friend', removeFriend);
router.get('/all-requests', getAllRequests);
router.get('/accept-request/:requestId', acceptFriendRequest);
router.get('/reject-request/:requestId', rejectFriendRequest);
router.get('/friends', getAllFriends);

export default router;
