import z from 'zod';

export const addFriendSchema = z.object({
  username: z.string().min(3).max(20),
});

export const removeFriendSchema = addFriendSchema;
