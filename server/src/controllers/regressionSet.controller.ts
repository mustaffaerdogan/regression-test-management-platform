import { Request, Response, NextFunction } from 'express';
import RegressionSet, { IRegressionSet } from '../models/RegressionSet.model';
import TestCase from '../models/TestCase.model';
import { ApiError } from '../middleware/error.middleware';

interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
}

const ensureOwner = (regressionSet: IRegressionSet, req: AuthedRequest, message: string): boolean => {
  if (!req.user || regressionSet.createdBy.toString() !== req.user.id) {
    // As explicitly required by spec, return 403 here instead of throwing
    (req.res as Response).status(403).json({
      success: false,
      message,
    });
    return false;
  }
  return true;
};

export const createRegressionSet = async (
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

    const { name, description, platform } = req.body;

    const regressionSet = await RegressionSet.create({
      name,
      description,
      platform,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Regression set created',
      data: regressionSet,
    });
  } catch (error) {
    next(error);
  }
};

export const getRegressionSets = async (
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

    const { platform, search } = req.query;

    const filter: Record<string, unknown> = {
      createdBy: req.user.id,
    };

    if (typeof platform === 'string' && platform.length > 0) {
      filter.platform = platform;
    }

    if (typeof search === 'string' && search.trim().length > 0) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { description: regex }];
    }

    const regressionSets = await RegressionSet.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Regression sets fetched',
      data: regressionSets,
    });
  } catch (error) {
    next(error);
  }
};

export const getRegressionSetById = async (
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

    const { id } = req.params;

    const regressionSet = await RegressionSet.findById(id).populate('testCases');

    if (!regressionSet) {
      const error: ApiError = new Error('Regression set not found');
      error.statusCode = 404;
      throw error;
    }

    if (!ensureOwner(regressionSet, req, 'Unauthorized')) {
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Regression set fetched',
      data: regressionSet,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRegressionSet = async (
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

    const { id } = req.params;
    const { name, description, platform } = req.body;

    const regressionSet = await RegressionSet.findById(id);

    if (!regressionSet) {
      const error: ApiError = new Error('Regression set not found');
      error.statusCode = 404;
      throw error;
    }

    if (!ensureOwner(regressionSet, req, 'Unauthorized')) {
      return;
    }

    if (typeof name === 'string') {
      regressionSet.name = name;
    }

    if (typeof description === 'string' || description === null) {
      regressionSet.description = description ?? undefined;
    }

    if (typeof platform === 'string') {
      regressionSet.platform = platform as typeof regressionSet.platform;
    }

    await regressionSet.save();

    res.status(200).json({
      success: true,
      message: 'Regression set updated',
      data: regressionSet,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRegressionSet = async (
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

    const { id } = req.params;

    const regressionSet = await RegressionSet.findById(id);

    if (!regressionSet) {
      const error: ApiError = new Error('Regression set not found');
      error.statusCode = 404;
      throw error;
    }

    if (!ensureOwner(regressionSet, req, 'Unauthorized')) {
      return;
    }

    // Delete related test cases
    await TestCase.deleteMany({ regressionSet: regressionSet._id });

    // Delete regression set
    await regressionSet.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Regression set deleted',
    });
  } catch (error) {
    next(error);
  }
};

