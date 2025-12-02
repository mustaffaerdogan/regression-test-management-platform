import mongoose, { Schema, Document, Types } from 'mongoose';

export type TestStatus = 'Pass' | 'Fail' | 'Not Executed';

export interface ITestCase extends Document {
  regressionSet: Types.ObjectId;
  testCaseId: string;
  userType?: string;
  platform?: string;
  module: string;
  testScenario: string;
  testCase: string;
  preConditions?: string;
  testData?: string;
  testStep?: string;
  expectedResult: string;
  actualResults?: string;
  status: TestStatus;
  createdAt: Date;
}

const testCaseSchema = new Schema<ITestCase>(
  {
    regressionSet: {
      type: Schema.Types.ObjectId,
      ref: 'RegressionSet',
      required: true,
    },
    testCaseId: {
      type: String,
      required: [true, 'Test case ID is required'],
      trim: true,
    },
    userType: {
      type: String,
      trim: true,
    },
    platform: {
      type: String,
      trim: true,
    },
    module: {
      type: String,
      required: [true, 'Module is required'],
      trim: true,
    },
    testScenario: {
      type: String,
      required: [true, 'Test scenario is required'],
      trim: true,
    },
    testCase: {
      type: String,
      required: [true, 'Test case is required'],
      trim: true,
    },
    preConditions: {
      type: String,
      trim: true,
    },
    testData: {
      type: String,
      trim: true,
    },
    testStep: {
      type: String,
      trim: true,
    },
    expectedResult: {
      type: String,
      required: [true, 'Expected result is required'],
      trim: true,
    },
    actualResults: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pass', 'Fail', 'Not Executed'],
      default: 'Not Executed',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

const TestCase = mongoose.model<ITestCase>('TestCase', testCaseSchema);

export default TestCase;


