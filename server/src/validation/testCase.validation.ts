import { body } from 'express-validator';

export const createTestCaseValidation = [
  body('testCaseId').trim().notEmpty().withMessage('testCaseId is required'),
  body('module').trim().notEmpty().withMessage('module is required'),
  body('testScenario').trim().notEmpty().withMessage('testScenario is required'),
  body('testCase').trim().notEmpty().withMessage('testCase is required'),
  body('expectedResult').trim().notEmpty().withMessage('expectedResult is required'),
  body('status')
    .optional()
    .isIn(['Pass', 'Fail', 'Not Executed'])
    .withMessage('status must be one of Pass, Fail, Not Executed'),
];

export const updateTestCaseValidation = [
  body('status')
    .optional()
    .isIn(['Pass', 'Fail', 'Not Executed'])
    .withMessage('status must be one of Pass, Fail, Not Executed'),
];

