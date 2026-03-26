import { body, param } from 'express-validator';

export const createTeamValidations = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Team name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
];

export const updateTeamValidations = [
  param('id').isMongoId().withMessage('Invalid team ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
];

export const inviteMemberValidations = [
  param('id').isMongoId().withMessage('Invalid team ID'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address'),
];

export const joinTeamValidations = [
  body('inviteCode')
    .trim()
    .notEmpty()
    .withMessage('Invite code is required'),
];

export const removeMemberValidations = [
  param('id').isMongoId().withMessage('Invalid team ID'),
  param('userId').isMongoId().withMessage('Invalid user ID'),
];
