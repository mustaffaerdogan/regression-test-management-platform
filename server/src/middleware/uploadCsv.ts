import multer from 'multer';
import { ApiError } from './error.middleware';

const storage = multer.memoryStorage();

export const uploadCsv = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.endsWith('.csv')) {
      const error: ApiError = new Error('Only CSV files are allowed');
      error.statusCode = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

