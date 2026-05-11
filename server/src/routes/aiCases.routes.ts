import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { generateCases, extractJira } from '../controllers/aiCases.controller';
import { generateAICasesValidation } from '../validation/aiCases.validation';
import { crawlAndGenerate } from '../controllers/crawl.controller';
import { runAITests } from '../controllers/testRunner.controller';

const router = Router();

router.use(authMiddleware);
router.post('/generate', validate(generateAICasesValidation), generateCases);
router.post('/extract-jira', extractJira);
router.post('/crawl', crawlAndGenerate);
router.post('/run-tests', runAITests);

export default router;

