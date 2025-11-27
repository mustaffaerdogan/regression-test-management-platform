import { Router } from 'express';

import { getStatus } from '../controllers/status.controller';
import authRoutes from './auth.routes';

const router = Router();

router.get('/status', getStatus);
router.use('/auth', authRoutes);

export default router;

