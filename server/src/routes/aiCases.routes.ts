import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { generateCases } from '../controllers/aiCases.controller';
import { generateAICasesValidation } from '../validation/aiCases.validation';

const router = Router();

router.use(authMiddleware);
router.post('/generate', validate(generateAICasesValidation), generateCases);

export default router;

