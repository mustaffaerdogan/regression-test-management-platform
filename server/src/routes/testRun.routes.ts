import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  cancelRun,
  getNextRunItem,
  getRun,
  listRunsHistory,
  startRun,
  updateRunItem,
} from '../controllers/testRun.controller';
import {
  cancelRunValidation,
  historyQueryValidation,
  runIdParamValidation,
  startRunValidation,
  updateRunItemValidation,
} from '../validation/testRun.validation';

const router = Router();

// All routes are protected
router.use(authMiddleware);

// IMPORTANT: define static routes before dynamic :runId routes to avoid conflicts
router.get('/history', validate(historyQueryValidation), listRunsHistory);
router.post('/start/:regressionSetId', validate(startRunValidation), startRun);
router.get('/:runId', validate(runIdParamValidation), getRun);
router.get('/:runId/next', validate(runIdParamValidation), getNextRunItem);
router.put('/update-item/:itemId', validate(updateRunItemValidation), updateRunItem);
router.put('/cancel/:runId', validate(cancelRunValidation), cancelRun);

export default router;


