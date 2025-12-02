import { body, param, query } from 'express-validator';

export const startRunValidation = [
  param('regressionSetId').isMongoId().withMessage('Invalid regression set id'),
];

export const runIdParamValidation = [param('runId').isMongoId().withMessage('Invalid run id')];

export const updateRunItemValidation = [
  param('itemId').isMongoId().withMessage('Invalid run item id'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['Pass', 'Fail', 'Skipped'])
    .withMessage('Status must be one of Pass, Fail, Skipped'),
  body('actualResults').optional().isString().withMessage('actualResults must be a string'),
];

export const cancelRunValidation = [
  param('runId').isMongoId().withMessage('Invalid run id'),
];

export const historyQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('platform')
    .optional()
    .isIn(['Web', 'iOS', 'Android', 'TV'])
    .withMessage('platform must be one of Web, iOS, Android, TV'),
  query('status')
    .optional()
    .isIn(['In Progress', 'Completed', 'Cancelled'])
    .withMessage('status must be one of In Progress, Completed, Cancelled'),
];


