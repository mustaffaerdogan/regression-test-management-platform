import mongoose, { Schema, Document, Types } from 'mongoose';

export type RunItemStatus = 'Not Executed' | 'Pass' | 'Fail' | 'Skipped';

export interface IRunItem extends Document {
  run: Types.ObjectId;
  testCase: Types.ObjectId;
  order: number;
  status: RunItemStatus;
  actualResults?: string;
  startedAt?: Date;
  completedAt?: Date;
}

const runItemSchema = new Schema<IRunItem>(
  {
    run: {
      type: Schema.Types.ObjectId,
      ref: 'Run',
      required: true,
    },
    testCase: {
      type: Schema.Types.ObjectId,
      ref: 'TestCase',
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Not Executed', 'Pass', 'Fail', 'Skipped'],
      default: 'Not Executed',
    },
    actualResults: {
      type: String,
      default: '',
      trim: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: false,
  },
);

runItemSchema.index({ run: 1, order: 1 });

const RunItem = mongoose.model<IRunItem>('RunItem', runItemSchema);

export default RunItem;


