import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import RegressionSet from '../models/RegressionSet.model';
import TestCase, { ITestCase } from '../models/TestCase.model';
import { ApiError } from '../middleware/error.middleware';

interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
}

const ensureOwnerByRegressionSetId = async (
  regressionSetId: string,
  req: AuthedRequest,
): Promise<boolean> => {
  const regressionSet = await RegressionSet.findById(regressionSetId);

  if (!regressionSet) {
    const error: ApiError = new Error('Regression set not found');
    error.statusCode = 404;
    throw error;
  }

  if (!req.user || regressionSet.createdBy.toString() !== req.user.id) {
    (req.res as Response).status(403).json({
      success: false,
      message: 'Unauthorized',
    });
    return false;
  }

  (req as any).regressionSet = regressionSet;
  return true;
};

const ensureOwnerByTestCase = async (testCase: ITestCase, req: AuthedRequest): Promise<boolean> => {
  const regressionSet = await RegressionSet.findById(testCase.regressionSet);

  if (!regressionSet) {
    const error: ApiError = new Error('Regression set not found');
    error.statusCode = 404;
    throw error;
  }

  if (!req.user || regressionSet.createdBy.toString() !== req.user.id) {
    (req.res as Response).status(403).json({
      success: false,
      message: 'Unauthorized',
    });
    return false;
  }

  return true;
};

export const createTestCase = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const { id } = req.params; // regression set id

    const regressionSetId = id as string;

    const isOwner = await ensureOwnerByRegressionSetId(regressionSetId, req);
    if (!isOwner) {
      return;
    }

    const {
      testCaseId,
      userType,
      platform,
      module,
      testScenario,
      testCase,
      preConditions,
      testData,
      testStep,
      expectedResult,
      actualResults,
      status,
    } = req.body;

    const created = await TestCase.create({
      regressionSet: new Types.ObjectId(regressionSetId),
      testCaseId,
      userType,
      platform,
      module,
      testScenario,
      testCase,
      preConditions,
      testData,
      testStep,
      expectedResult,
      actualResults,
      status,
    });

    // Attach to regression set
    await RegressionSet.findByIdAndUpdate(created.regressionSet, {
      $push: { testCases: created._id },
    });

    res.status(201).json({
      success: true,
      message: 'Test case added',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

export const getTestCasesForRegressionSet = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const { id } = req.params; // regression set id
    const regressionSetId = id as string;

    const isOwner = await ensureOwnerByRegressionSetId(regressionSetId, req);
    if (!isOwner) {
      return;
    }

    const testCases = await TestCase.find({ regressionSet: new Types.ObjectId(regressionSetId) }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: 'Test cases fetched',
      data: testCases,
    });
  } catch (error) {
    next(error);
  }
};

export const getTestCaseById = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const { caseId } = req.params;

    const testCase = await TestCase.findById(caseId);

    if (!testCase) {
      const error: ApiError = new Error('Test case not found');
      error.statusCode = 404;
      throw error;
    }

    const isOwner = await ensureOwnerByTestCase(testCase, req);
    if (!isOwner) {
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Test case fetched',
      data: testCase,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTestCase = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const { caseId } = req.params;

    const testCase = await TestCase.findById(caseId);

    if (!testCase) {
      const error: ApiError = new Error('Test case not found');
      error.statusCode = 404;
      throw error;
    }

    const isOwner = await ensureOwnerByTestCase(testCase, req);
    if (!isOwner) {
      return;
    }

    Object.assign(testCase, req.body);

    await testCase.save();

    res.status(200).json({
      success: true,
      message: 'Test case updated',
      data: testCase,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTestCase = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const { caseId } = req.params;

    const testCase = await TestCase.findById(caseId);

    if (!testCase) {
      const error: ApiError = new Error('Test case not found');
      error.statusCode = 404;
      throw error;
    }

    const isOwner = await ensureOwnerByTestCase(testCase, req);
    if (!isOwner) {
      return;
    }

    // Remove from regression set
    await RegressionSet.findByIdAndUpdate(testCase.regressionSet, {
      $pull: { testCases: testCase._id },
    });

    await testCase.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Test case deleted',
    });
  } catch (error) {
    next(error);
  }
};

