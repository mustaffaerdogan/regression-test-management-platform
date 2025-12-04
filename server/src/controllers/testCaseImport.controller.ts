import { Request, Response, NextFunction } from 'express';
import { parse } from 'csv-parse/sync';
import RegressionSet from '../models/RegressionSet.model';
import TestCase from '../models/TestCase.model';
import { ApiError } from '../middleware/error.middleware';
import { Types } from 'mongoose';

interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
}

export const importTestCasesCsv = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const regressionSetId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    if (!req.file) {
      const error: ApiError = new Error('CSV file is required');
      error.statusCode = 400;
      throw error;
    }

    // Verify Regression Set belongs to the user
    const regSet = await RegressionSet.findById(regressionSetId);
    if (!regSet) {
      const error: ApiError = new Error('Regression set not found');
      error.statusCode = 404;
      throw error;
    }

    if (regSet.createdBy.toString() !== userId) {
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 403;
      throw error;
    }

    // Parse CSV
    const csvText = req.file.buffer.toString('utf-8');
    let records: Record<string, string>[];

    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError) {
      const error: ApiError = new Error('Invalid CSV format');
      error.statusCode = 400;
      throw error;
    }

    if (!Array.isArray(records) || records.length === 0) {
      const error: ApiError = new Error('CSV file is empty or invalid');
      error.statusCode = 400;
      throw error;
    }

    const imported: Array<{ _id: string; testCaseId: string }> = [];
    const skipped: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      if (!row) continue;

      // Required fields
      if (!row['Test Case ID'] || !row['Module'] || !row['Expected Result']) {
        skipped.push({
          row: i + 2, // +2 because: 1-indexed rows, and +1 for header row
          reason: 'Missing required fields (Test Case ID, Module, Expected Result)',
        });
        continue;
      }

      // Check duplicate Test Case ID
      const existing = await TestCase.findOne({
        regressionSet: new Types.ObjectId(regressionSetId),
        testCaseId: row['Test Case ID'],
      });

      if (existing) {
        skipped.push({
          row: i + 2,
          reason: `Duplicate Test Case ID: ${row['Test Case ID']}`,
        });
        continue;
      }

      // Insert test case
      const testCase = new TestCase({
        regressionSet: new Types.ObjectId(regressionSetId),
        testCaseId: row['Test Case ID'],
        userType: row['User Type'] || '',
        platform: row['Platform'] || '',
        module: row['Module'],
        testScenario: row['Test Scenario'] || '',
        testCase: row['Test Case'] || '',
        preConditions: row['Pre Conditions'] || '',
        testData: row['Test Data'] || '',
        testStep: row['Test Step'] || '',
        expectedResult: row['Expected Result'],
        actualResults: '',
        status: 'Not Executed',
      });

      await testCase.save();

      // Update regression set's testCases array
      if (!regSet.testCases.includes(testCase._id)) {
        regSet.testCases.push(testCase._id);
        await regSet.save();
      }

      imported.push({
        _id: testCase._id.toString(),
        testCaseId: testCase.testCaseId,
      });
    }

    res.status(200).json({
      success: true,
      message: `${imported.length} test cases imported`,
      data: {
        importedCount: imported.length,
        skipped,
      },
    });
  } catch (err) {
    next(err);
  }
};

