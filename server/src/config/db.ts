import mongoose from 'mongoose';

const { MONGODB_URI, MONGODB_DB } = process.env;

export const connectDatabase = async (): Promise<void> => {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI environment variable.');
  }

  const connectionString = MONGODB_URI;
  const dbName = MONGODB_DB ?? 'regression_test_management';

  try {
    await mongoose.connect(connectionString, { dbName });
    console.log(`MongoDB connected to ${dbName}`);
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    // Exit so container orchestrators can restart the service.
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.connection.close();
};

