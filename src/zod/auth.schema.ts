import z from 'zod';
import { TitleCase } from '../utils';

export const SignUpSchema = z.object({
  fullname: z
    .string({ message: 'Name is required' })
    .min(1, { message: 'Name cannot be empty' })
    .transform((val) => TitleCase(val)),

  email: z
    .string({ message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' }),

  password: z
    .string({ message: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters long' }),

  username: z
    .string({ message: 'Username is required' })
    .min(3, { message: 'Username must be at least 3 characters long' })
    .max(20, { message: 'Username cannot exceed 20 characters' }),
});

export const LoginSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email({ message: 'Invalid email address' }),

  password: z
    .string({ message: 'Password is required' })
    .min(1, { message: 'Password is required' }),
});
