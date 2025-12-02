import mongoose, { Schema, Document, Types } from 'mongoose';

export type Platform = 'Web' | 'iOS' | 'Android' | 'TV';

export interface IRegressionSet extends Document {
  name: string;
  description?: string;
  platform: Platform;
  createdBy: Types.ObjectId;
  testCases: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const regressionSetSchema = new Schema<IRegressionSet>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    platform: {
      type: String,
      required: [true, 'Platform is required'],
      enum: ['Web', 'iOS', 'Android', 'TV'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    testCases: [
      {
        type: Schema.Types.ObjectId,
        ref: 'TestCase',
      },
    ],
  },
  {
    timestamps: true,
  },
);

const RegressionSet = mongoose.model<IRegressionSet>('RegressionSet', regressionSetSchema);

export default RegressionSet;


