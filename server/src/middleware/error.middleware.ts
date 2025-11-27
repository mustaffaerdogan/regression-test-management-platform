import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
}

export const errorMiddleware = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Handle rate limit errors specifically
  if (err.statusCode === 429) {
    res.status(429).json({
      success: false,
      message: err.message || 'Too many requests, please try again later.',
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
  });
};

