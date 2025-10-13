import { Router } from 'express';

const router = Router();

router.get('/leave-group', () => {
  // check if admin is leaving or a normal member
});

router.post('/add-member', () => {
  // Only admin can add new members
});

router.get('/remove-member', () => {
  // Only admin can remove members
});

router.delete('/delete-group', () => {
  // Only admin can delete group
});

export default router;
