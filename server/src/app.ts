import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import apiRouter from './routes';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
// In development we accept any localhost / 127.0.0.1 origin so that Vite can fall back to 5174/5175
// when 5173 is busy. In production CLIENT_URL is the single allowed origin.
const envOrigin = process.env.CLIENT_URL;
const isDev = process.env.NODE_ENV !== 'production';

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // non-browser clients (curl, Postman) or same-origin
  if (envOrigin && origin === envOrigin) return true;
  if (!isDev) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} reddedildi`));
    },
    credentials: true,
  }),
);

// Rate limiting - prevent brute force attacks
// Development: More lenient, Production: Stricter
const isDevelopment = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Development: 1000 requests, Production: 100 requests
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    if (isDevelopment && req.ip === '::1') return true;
    if (isDevelopment && req.ip === '127.0.0.1') return true;
    return false;
  },
});

// Apply rate limiting to all requests
app.use(limiter);

// Body parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api', apiRouter);

// Error handling middleware (must be last)
app.use(errorMiddleware);

export default app;

