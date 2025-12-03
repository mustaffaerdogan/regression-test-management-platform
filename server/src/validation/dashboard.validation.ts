import { query } from 'express-validator';

export const overviewValidation = [
  query('from').optional().isISO8601().withMessage('from must be a valid ISO date'),
  query('to').optional().isISO8601().withMessage('to must be a valid ISO date'),
];

export const recentRunsValidation = [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
];

export const passFailTrendValidation = [
  query('range')
    .optional()
    .isIn(['7d', '30d', '90d', '180d', '365d'])
    .withMessage('range must be one of 7d, 30d, 90d, 180d, 365d'),
  query('from').optional().isISO8601().withMessage('from must be a valid ISO date'),
  query('to').optional().isISO8601().withMessage('to must be a valid ISO date'),
];

export const platformStatsValidation = [
  query('from').optional().isISO8601().withMessage('from must be a valid ISO date'),
  query('to').optional().isISO8601().withMessage('to must be a valid ISO date'),
];

export const moduleFailuresValidation = [
  query('from').optional().isISO8601().withMessage('from must be a valid ISO date'),
  query('to').optional().isISO8601().withMessage('to must be a valid ISO date'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
];

export const slowTestsValidation = [
  query('from').optional().isISO8601().withMessage('from must be a valid ISO date'),
  query('to').optional().isISO8601().withMessage('to must be a valid ISO date'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
];

