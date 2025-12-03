import { Router } from 'express';

import { getStatus } from '../controllers/status.controller';
import authRoutes from './auth.routes';
import regressionSetRoutes from './regressionSet.routes';
import testRunRoutes from './testRun.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.get('/status', getStatus);
router.use('/auth', authRoutes);
router.use('/regression-sets', regressionSetRoutes);
router.use('/test-runs', testRunRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;

