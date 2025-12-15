import { Router } from 'express';

const chatRouter = Router();

chatRouter.get('/leave-group', () => {
  // check if admin is leaving or a normal member
});

chatRouter.get('/remove-member', () => {
  // Only admin can remove members
});

chatRouter.post('/add-member', () => {
  // Only admin can add new members
});

chatRouter.delete('/delete-group', () => {
  // Only admin can delete group
});

export default chatRouter;
