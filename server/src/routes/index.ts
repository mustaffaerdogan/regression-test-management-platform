import { Router } from 'express';

import { getStatus } from '../controllers/status.controller';
import authRoutes from './auth.routes';
import regressionSetRoutes from './regressionSet.routes';

const router = Router();

router.get('/status', getStatus);
router.use('/auth', authRoutes);
router.use('/regression-sets', regressionSetRoutes);

export default router;

