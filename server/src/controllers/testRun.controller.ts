import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import RegressionSet from '../models/RegressionSet.model';
import TestCase from '../models/TestCase.model';
import Run, { IRun } from '../models/Run';
import RunItem, { IRunItem } from '../models/RunItem';
import { ApiError } from '../middleware/error.middleware';

interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
}

const ensureRunOwner = (run: IRun, req: AuthedRequest): boolean => {
  if (!req.user || run.startedBy.toString() !== req.user.id) {
    (req.res as Response).status(403).json({
      success: false,
      message: 'Unauthorized',
    });
    return false;
  }
  return true;
};

export const startRun = async (
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

    const { regressionSetId } = req.params;

    const regressionSet = await RegressionSet.findById(regressionSetId);

    if (!regressionSet) {
      const error: ApiError = new Error('Regression set not found');
      error.statusCode = 404;
      throw error;
    }

    if (regressionSet.createdBy.toString() !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const testCases = await TestCase.find({ regressionSet: regressionSet._id })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    const totalCases = testCases.length;

    const run = await Run.create({
      regressionSet: regressionSet._id,
      startedBy: new Types.ObjectId(req.user.id),
      status: 'In Progress',
      totalCases,
      passed: 0,
      failed: 0,
      skipped: 0,
    });

    if (totalCases > 0) {
      const runItems: Partial<IRunItem>[] = testCases.map((tc, index) => ({
        run: run._id,
        testCase: tc._id as Types.ObjectId,
        order: index + 1,
        status: 'Not Executed',
      }));

      await RunItem.insertMany(runItems);
    }

    res.status(201).json({
      success: true,
      message: 'Run started',
      data: {
        runId: run._id,
        totalCases,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRun = async (
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

    const { runId } = req.params;

    const run = await Run.findById(runId)
      .populate('regressionSet', 'name platform')
      .populate('startedBy', 'name')
      .lean()
      .exec();

    if (!run) {
      const error: ApiError = new Error('Run not found');
      error.statusCode = 404;
      throw error;
    }

    if (run.startedBy && (run.startedBy as any)._id?.toString() !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const runItems = await RunItem.find({ run: run._id })
      .sort({ order: 1 })
      .populate('testCase', 'testCaseId module testScenario status')
      .lean()
      .exec();

    res.status(200).json({
      success: true,
      message: 'Run fetched',
      data: {
        run,
        runItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getNextRunItem = async (
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

    const { runId } = req.params;

    const run = await Run.findById(runId);

    if (!run) {
      const error: ApiError = new Error('Run not found');
      error.statusCode = 404;
      throw error;
    }

    if (!ensureRunOwner(run, req)) {
      return;
    }

    const nextItem = await RunItem.findOne({ run: run._id, status: 'Not Executed' })
      .sort({ order: 1 })
      .populate(
        'testCase',
        'testCaseId userType platform module testScenario testCase preConditions testData testStep expectedResult actualResults status',
      )
      .lean()
      .exec();

    if (!nextItem) {
      res.status(200).json({
        success: true,
        message: 'Run completed',
        data: {
          done: true,
          run,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Next run item fetched',
      data: {
        done: false,
        item: nextItem,
        run,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateRunItem = async (
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

    const { itemId } = req.params;
    const { status, actualResults } = req.body as { status: 'Pass' | 'Fail' | 'Skipped'; actualResults?: string };

    const runItem = await RunItem.findById(itemId);

    if (!runItem) {
      const error: ApiError = new Error('Run item not found');
      error.statusCode = 404;
      throw error;
    }

    const run = await Run.findById(runItem.run);

    if (!run) {
      const error: ApiError = new Error('Associated run not found');
      error.statusCode = 404;
      throw error;
    }

    if (!ensureRunOwner(run, req)) {
      return;
    }

    const previousStatus = runItem.status;

    runItem.status = status;
    if (typeof actualResults === 'string') {
      runItem.actualResults = actualResults;
    }
    if (!runItem.startedAt) {
      runItem.startedAt = new Date();
    }
    runItem.completedAt = new Date();

    await runItem.save();

    const inc: { passed?: number; failed?: number; skipped?: number } = {};
    const dec: { passed?: number; failed?: number; skipped?: number } = {};

    const bump = (map: { passed?: number; failed?: number; skipped?: number }, s: string, value: number) => {
      if (s === 'Pass') map.passed = (map.passed ?? 0) + value;
      if (s === 'Fail') map.failed = (map.failed ?? 0) + value;
      if (s === 'Skipped') map.skipped = (map.skipped ?? 0) + value;
    };

    bump(inc, status, 1);
    bump(dec, previousStatus, -1);

    const update: Record<string, unknown> = {};
    if (inc.passed || dec.passed) update.passed = { $inc: { passed: (inc.passed ?? 0) + (dec.passed ?? 0) } };
    if (inc.failed || dec.failed) update.failed = { $inc: { failed: (inc.failed ?? 0) + (dec.failed ?? 0) } };
    if (inc.skipped || dec.skipped) update.skipped = { $inc: { skipped: (inc.skipped ?? 0) + (dec.skipped ?? 0) } };

    // Apply summary update atomically using $inc
    const incObj: { passed?: number; failed?: number; skipped?: number } = {};
    if ((inc.passed ?? 0) + (dec.passed ?? 0) !== 0) {
      incObj.passed = (inc.passed ?? 0) + (dec.passed ?? 0);
    }
    if ((inc.failed ?? 0) + (dec.failed ?? 0) !== 0) {
      incObj.failed = (inc.failed ?? 0) + (dec.failed ?? 0);
    }
    if ((inc.skipped ?? 0) + (dec.skipped ?? 0) !== 0) {
      incObj.skipped = (inc.skipped ?? 0) + (dec.skipped ?? 0);
    }

    let updatedRun: IRun | null = run;

    if (Object.keys(incObj).length > 0) {
      updatedRun = await Run.findByIdAndUpdate(
        run._id,
        {
          $inc: incObj,
        },
        { new: true },
      );
    }

    if (!updatedRun) {
      const error: ApiError = new Error('Failed to update run summary');
      error.statusCode = 500;
      throw error;
    }

    const remaining = await RunItem.countDocuments({ run: updatedRun._id, status: 'Not Executed' });

    if (remaining === 0 && updatedRun.status === 'In Progress') {
      updatedRun = await Run.findByIdAndUpdate(
        updatedRun._id,
        {
          status: 'Completed',
          completedAt: new Date(),
        },
        { new: true },
      );
    }

    res.status(200).json({
      success: true,
      message: 'Run item updated',
      data: {
        item: runItem,
        run: updatedRun,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelRun = async (
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

    const { runId } = req.params;

    const run = await Run.findById(runId);

    if (!run) {
      const error: ApiError = new Error('Run not found');
      error.statusCode = 404;
      throw error;
    }

    if (!ensureRunOwner(run, req)) {
      return;
    }

    run.status = 'Cancelled';
    run.completedAt = new Date();
    await run.save();

    res.status(200).json({
      success: true,
      message: 'Run cancelled',
      data: run,
    });
  } catch (error) {
    next(error);
  }
};

export const listRunsHistory = async (
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

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { platform, status } = req.query as {
      platform?: string;
      status?: 'In Progress' | 'Completed' | 'Cancelled';
    };

    const runFilter: Record<string, unknown> = {
      startedBy: new Types.ObjectId(req.user.id),
    };

    if (status) {
      runFilter.status = status;
    }

    if (platform) {
      const sets = await RegressionSet.find({
        createdBy: new Types.ObjectId(req.user.id),
        platform,
      })
        .select('_id')
        .lean()
        .exec();

      const ids = sets.map((s) => s._id);

      if (ids.length === 0) {
        res.status(200).json({
          success: true,
          message: 'Runs history fetched',
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
          },
        });
        return;
      }

      runFilter.regressionSet = { $in: ids };
    }

    const [runs, total] = await Promise.all([
      Run.find(runFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('regressionSet', 'name platform')
        .lean()
        .exec(),
      Run.countDocuments(runFilter),
    ]);

    res.status(200).json({
      success: true,
      message: 'Runs history fetched',
      data: runs,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};


