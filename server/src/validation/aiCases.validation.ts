import { body } from 'express-validator';

export const generateAICasesValidation = [
  body('userStory')
    .isString()
    .withMessage('userStory must be a string')
    .trim()
    .isLength({ min: 10 })
    .withMessage('userStory must be at least 10 characters'),
  body('acceptanceCriteria')
    .isArray({ min: 1 })
    .withMessage('acceptanceCriteria must be a non-empty array'),
  body('acceptanceCriteria.*')
    .isString()
    .withMessage('Each acceptance criteria item must be a string')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Each acceptance criteria item must be at least 3 characters'),
];

