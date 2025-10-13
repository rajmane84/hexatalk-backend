import z from 'zod';

export const SignUpSchema = z.object({
  email: z.email().nonempty(),
  password: z.string().min(6),
  username: z.string().min(3).max(20),
});

export const LoginSchema = z.object({
  email: z.email().nonempty(),
  password: z.string().min(6),
});
