import { CookieOptions } from 'express';

const NODE_ENV = process.env.NODE_ENV || 'development';

export const COOKIE_OPTION: CookieOptions = {
  httpOnly: true,
  sameSite: 'none',
  secure: NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000, // 24 hrs
};
