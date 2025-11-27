import express from 'express';
import cors from 'cors';

import apiRouter from './routes';

const app = express();

const allowedOrigin = process.env.CLIENT_URL ?? 'http://localhost:5173';

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api', apiRouter);

export default app;

