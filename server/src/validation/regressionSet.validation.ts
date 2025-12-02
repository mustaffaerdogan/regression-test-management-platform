import { body, query } from 'express-validator';

export const createRegressionSetValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 3 })
    .withMessage('Name must be at least 3 characters'),
  body('platform')
    .trim()
    .notEmpty()
    .withMessage('Platform is required')
    .isIn(['Web', 'iOS', 'Android', 'TV'])
    .withMessage('Platform must be one of Web, iOS, Android, TV'),
  body('description').optional().isString().withMessage('Description must be a string'),
];

export const updateRegressionSetValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('Name must be at least 3 characters'),
  body('platform')
    .optional()
    .trim()
    .isIn(['Web', 'iOS', 'Android', 'TV'])
    .withMessage('Platform must be one of Web, iOS, Android, TV'),
  body('description').optional().isString().withMessage('Description must be a string'),
];

export const listRegressionSetsValidation = [
  query('platform')
    .optional()
    .isIn(['Web', 'iOS', 'Android', 'TV'])
    .withMessage('Platform must be one of Web, iOS, Android, TV'),
  query('search').optional().isString().withMessage('Search must be a string'),
];

