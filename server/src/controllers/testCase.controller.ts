import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import RegressionSet from '../models/RegressionSet.model';
import TestCase, { ITestCase } from '../models/TestCase.model';
import { ApiError } from '../middleware/error.middleware';
import { canAccessRegressionSet } from '../utils/authorization';

interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
}

const ensureAccessByRegressionSetId = async (
  regressionSetId: string,
  req: AuthedRequest,
): Promise<boolean> => {
  const regressionSet = await RegressionSet.findById(regressionSetId);

  if (!regressionSet) {
    const error: ApiError = new Error('Regression set not found');
    error.statusCode = 404;
    throw error;
  }

  if (!req.user) {
    (req.res as Response).status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return false;
  }

  const allowed = await canAccessRegressionSet(regressionSet as any, req.user.id);
  if (!allowed) {
    (req.res as Response).status(403).json({
      success: false,
      message: 'Unauthorized',
    });
    return false;
  }

  (req as any).regressionSet = regressionSet;
  return true;
};

const ensureAccessByTestCase = async (testCase: ITestCase, req: AuthedRequest): Promise<boolean> => {
  const regressionSet = await RegressionSet.findById(testCase.regressionSet);

  if (!regressionSet) {
    const error: ApiError = new Error('Regression set not found');
    error.statusCode = 404;
    throw error;
  }

  if (!req.user) {
    (req.res as Response).status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return false;
  }

  const allowed = await canAccessRegressionSet(regressionSet as any, req.user.id);
  if (!allowed) {
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

    const allowed = await ensureAccessByRegressionSetId(regressionSetId, req);
    if (!allowed) {
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

    const allowed = await ensureAccessByRegressionSetId(regressionSetId, req);
    if (!allowed) {
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

    const allowed = await ensureAccessByTestCase(testCase, req);
    if (!allowed) {
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

    const allowed = await ensureAccessByTestCase(testCase, req);
    if (!allowed) {
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

    const allowed = await ensureAccessByTestCase(testCase, req);
    if (!allowed) {
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

