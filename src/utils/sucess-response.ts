import type { Response, CookieOptions } from 'express';

type CookiePayload = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function sendSuccessResponse<T>({
  res,
  statusCode = 200,
  message = 'Success',
  data = null as T,
  cookies = [],
}: {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T;
  cookies?: CookiePayload[];
}) {
  cookies.forEach(({ name, value, options }) => {
    res.cookie(name, value, options as CookieOptions);
  });

  return res.status(statusCode).json({
    message,
    data,
  });
}
