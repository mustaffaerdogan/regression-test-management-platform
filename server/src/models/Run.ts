import mongoose, { Schema, Document, Types } from 'mongoose';

export type RunStatus = 'In Progress' | 'Completed' | 'Cancelled';

export interface IRun extends Document {
  regressionSet: Types.ObjectId;
  startedBy: Types.ObjectId;
  status: RunStatus;
  createdAt: Date;
  completedAt?: Date;
  totalCases: number;
  passed: number;
  failed: number;
  skipped: number;
}

const runSchema = new Schema<IRun>(
  {
    regressionSet: {
      type: Schema.Types.ObjectId,
      ref: 'RegressionSet',
      required: true,
    },
    startedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['In Progress', 'Completed', 'Cancelled'],
      default: 'In Progress',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    totalCases: {
      type: Number,
      required: true,
      default: 0,
    },
    passed: {
      type: Number,
      required: true,
      default: 0,
    },
    failed: {
      type: Number,
      required: true,
      default: 0,
    },
    skipped: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: false,
  },
);

const Run = mongoose.model<IRun>('Run', runSchema);

export default Run;


