import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/generateToken';
import { ApiError } from './error.middleware';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error: ApiError = new Error('No token provided');
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);
      req.user = { id: decoded.id };
      next();
    } catch (error) {
      const authError: ApiError = new Error('Invalid or expired token');
      authError.statusCode = 401;
      throw authError;
    }
  } catch (error) {
    next(error);
  }
};

