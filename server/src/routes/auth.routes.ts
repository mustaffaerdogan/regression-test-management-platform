import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  getMe,
  registerValidations,
  loginValidations,
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Stricter rate limiting for auth endpoints
// Development: More lenient, Production: Stricter
const isDevelopment = process.env.NODE_ENV !== 'production';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 5, // Development: 50 requests, Production: 5 requests
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    if (isDevelopment && req.ip === '::1') return true;
    if (isDevelopment && req.ip === '127.0.0.1') return true;
    return false;
  },
});

router.post('/register', authLimiter, validate(registerValidations), register);
router.post('/login', authLimiter, validate(loginValidations), login);
router.get('/me', authMiddleware, getMe);

export default router;

