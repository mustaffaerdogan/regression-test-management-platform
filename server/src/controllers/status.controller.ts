import { Request, Response } from 'express';

export const getStatus = (_req: Request, res: Response): void => {
  res.json({
    service: 'regression-test-management-api',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
};

