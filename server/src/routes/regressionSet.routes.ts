import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createRegressionSet,
  deleteRegressionSet,
  getRegressionSetById,
  getRegressionSets,
  updateRegressionSet,
} from '../controllers/regressionSet.controller';
import {
  createTestCase,
  deleteTestCase,
  getTestCaseById,
  getTestCasesForRegressionSet,
  updateTestCase,
} from '../controllers/testCase.controller';
import {
  createRegressionSetValidation,
  listRegressionSetsValidation,
  updateRegressionSetValidation,
} from '../validation/regressionSet.validation';
import { createTestCaseValidation, updateTestCaseValidation } from '../validation/testCase.validation';

const router = Router();

// All routes are protected
router.use(authMiddleware);

// Regression set routes
router.post('/', validate(createRegressionSetValidation), createRegressionSet);
router.get('/', validate(listRegressionSetsValidation), getRegressionSets);
router.get('/:id', getRegressionSetById);
router.put('/:id', validate(updateRegressionSetValidation), updateRegressionSet);
router.delete('/:id', deleteRegressionSet);

// Nested test case routes under a regression set
router.post('/:id/test-cases', validate(createTestCaseValidation), createTestCase);
router.get('/:id/test-cases', getTestCasesForRegressionSet);

// Test case routes by case id
router.get('/test-cases/:caseId', getTestCaseById);
router.put('/test-cases/:caseId', validate(updateTestCaseValidation), updateTestCase);
router.delete('/test-cases/:caseId', deleteTestCase);

export default router;

