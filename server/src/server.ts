import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import { connectDatabase } from './config/db';

const PORT = Number(process.env.PORT) || 5000;

const bootstrap = async (): Promise<void> => {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`API server ready on http://localhost:${PORT}`);
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

