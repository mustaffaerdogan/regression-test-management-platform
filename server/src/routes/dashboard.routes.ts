import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  getDashboardOverview,
  getModuleFailures,
  getPassFailTrend,
  getPlatformStats,
  getRecentRuns,
  getSlowTests,
} from '../controllers/dashboard.controller';
import {
  moduleFailuresValidation,
  overviewValidation,
  passFailTrendValidation,
  platformStatsValidation,
  recentRunsValidation,
  slowTestsValidation,
} from '../validation/dashboard.validation';

const router = Router();

router.use(authMiddleware);

router.get('/overview', validate(overviewValidation), getDashboardOverview);
router.get('/recent-runs', validate(recentRunsValidation), getRecentRuns);
router.get('/pass-fail-trend', validate(passFailTrendValidation), getPassFailTrend);
router.get('/platform-stats', validate(platformStatsValidation), getPlatformStats);
router.get('/module-failures', validate(moduleFailuresValidation), getModuleFailures);
router.get('/slow-tests', validate(slowTestsValidation), getSlowTests);

export default router;

