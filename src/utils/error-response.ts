import { Response } from 'express';

type SendErrorResponseOptions = {
  res: Response;
  statusCode?: number;
  message?: string;
};

export function sendErrorResponse({
  res,
  statusCode = 500,
  message = 'Internal server error',
}: SendErrorResponseOptions) {
  return res.status(statusCode).json({
    message,
  });
}
