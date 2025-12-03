import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import RegressionSet from '../models/RegressionSet.model';
import TestCase from '../models/TestCase.model';
import Run from '../models/Run';
import RunItem from '../models/RunItem';
import { ApiError } from '../middleware/error.middleware';

interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
}

const parseDateRange = (req: Request): { from?: Date; to?: Date } => {
  const { from, to } = req.query;
  const range: { from?: Date; to?: Date } = {};

  if (typeof from === 'string') {
    range.from = new Date(from);
  }
  if (typeof to === 'string') {
    range.to = new Date(to);
  }

  return range;
};

const buildDateMatch = (field: string, from?: Date, to?: Date): Record<string, unknown> => {
  const match: Record<string, unknown> = {};
  const range: Record<string, Date> = {};

  if (from) range.$gte = from;
  if (to) range.$lte = to;

  if (Object.keys(range).length > 0) {
    match[field] = range;
  }

  return match;
};

export const getDashboardOverview = async (
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

    const userId = new Types.ObjectId(req.user.id);
    const { from, to } = parseDateRange(req);

    const regressionSetFilter: Record<string, unknown> = {
      createdBy: userId,
      ...buildDateMatch('createdAt', from, to),
    };

    const [totalRegressionSets, regressionSetIds] = await Promise.all([
      RegressionSet.countDocuments(regressionSetFilter),
      RegressionSet.find({ createdBy: userId }).select('_id').lean().exec(),
    ]);

    const regressionSetIdList = regressionSetIds.map((s) => s._id);

    const testCaseFilter: Record<string, unknown> = {
      regressionSet: { $in: regressionSetIdList },
      ...buildDateMatch('createdAt', from, to),
    };

    const totalTestCases = regressionSetIdList.length
      ? await TestCase.countDocuments(testCaseFilter)
      : 0;

    const runMatch: Record<string, unknown> = {
      startedBy: userId,
      ...buildDateMatch('createdAt', from, to),
    };

    const runsSummary = await Run.aggregate<{
      totalRuns: number;
      activeRuns: number;
      completedRuns: number;
      passed: number;
      failed: number;
      skipped: number;
      totalCases: number;
    }>([
      { $match: runMatch },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: 1 },
          activeRuns: {
            $sum: {
              $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0],
            },
          },
          completedRuns: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0],
            },
          },
          passed: { $sum: '$passed' },
          failed: { $sum: '$failed' },
          skipped: { $sum: '$skipped' },
          totalCases: { $sum: '$totalCases' },
        },
      },
    ]);

    const summary = runsSummary[0] ?? {
      totalRuns: 0,
      activeRuns: 0,
      completedRuns: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      totalCases: 0,
    };

    const executedCases = summary.totalCases || summary.passed + summary.failed + summary.skipped;
    const divisor = executedCases || 1;

    const passRate = executedCases ? (summary.passed / divisor) * 100 : 0;
    const failRate = executedCases ? (summary.failed / divisor) * 100 : 0;
    const skippedRate = executedCases ? (summary.skipped / divisor) * 100 : 0;

    res.status(200).json({
      success: true,
      message: 'Dashboard overview fetched',
      data: {
        totalRegressionSets,
        totalTestCases,
        totalRuns: summary.totalRuns,
        activeRuns: summary.activeRuns,
        completedRuns: summary.completedRuns,
        passRate: Number(passRate.toFixed(1)),
        failRate: Number(failRate.toFixed(1)),
        skippedRate: Number(skippedRate.toFixed(1)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentRuns = async (
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

    const userId = new Types.ObjectId(req.user.id);
    const limit = Math.min(
      Number(req.query.limit) && Number(req.query.limit) > 0
        ? Number(req.query.limit)
        : 5,
      50,
    );

    const runs = await Run.find({ startedBy: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('regressionSet', 'name platform')
      .lean()
      .exec();

    const data = runs.map((run) => {
      const regressionSet =
        typeof run.regressionSet === 'object' && run.regressionSet
          ? (run.regressionSet as any)
          : null;
      return {
        runId: run._id,
        regressionSet: regressionSet
          ? {
              id: regressionSet._id,
              name: regressionSet.name,
              platform: regressionSet.platform,
            }
          : null,
        status: run.status,
        totalCases: run.totalCases,
        passed: run.passed,
        failed: run.failed,
        skipped: run.skipped,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
      };
    });

    res.status(200).json({
      success: true,
      message: 'Recent runs fetched',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getPassFailTrend = async (
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

    const userId = new Types.ObjectId(req.user.id);
    const { range, from, to } = req.query as {
      range?: string;
      from?: string;
      to?: string;
    };

    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (from || to) {
      if (from) fromDate = new Date(from);
      if (to) toDate = new Date(to);
    } else if (range) {
      const days = parseInt(range.replace('d', ''), 10);
      toDate = new Date();
      fromDate = new Date();
      fromDate.setDate(toDate.getDate() - days + 1);
    }

    const match: Record<string, unknown> = {
      startedBy: userId,
      ...buildDateMatch('createdAt', fromDate, toDate),
    };

    const trend = await Run.aggregate<{
      _id: string;
      passed: number;
      failed: number;
      skipped: number;
    }>([
      { $match: match },
      {
        $project: {
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          passed: 1,
          failed: 1,
          skipped: 1,
        },
      },
      {
        $group: {
          _id: '$date',
          passed: { $sum: '$passed' },
          failed: { $sum: '$failed' },
          skipped: { $sum: '$skipped' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const data = trend.map((t) => ({
      date: t._id,
      passed: t.passed,
      failed: t.failed,
      skipped: t.skipped,
    }));

    res.status(200).json({
      success: true,
      message: 'Pass/Fail trend fetched',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlatformStats = async (
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

    const userId = new Types.ObjectId(req.user.id);
    const { from, to } = parseDateRange(req);

    const match: Record<string, unknown> = {
      startedBy: userId,
      ...buildDateMatch('createdAt', from, to),
    };

    const stats = await Run.aggregate<{ _id: string; count: number }>([
      { $match: match },
      {
        $lookup: {
          from: 'regressionsets',
          localField: 'regressionSet',
          foreignField: '_id',
          as: 'regressionSet',
        },
      },
      { $unwind: '$regressionSet' },
      {
        $group: {
          _id: '$regressionSet.platform',
          count: { $sum: 1 },
        },
      },
    ]);

    const data: Record<string, number> = {
      Web: 0,
      iOS: 0,
      Android: 0,
      TV: 0,
    };

    stats.forEach((s) => {
      if (data[s._id] !== undefined) {
        data[s._id] = s.count;
      }
    });

    res.status(200).json({
      success: true,
      message: 'Platform stats fetched',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getModuleFailures = async (
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

    const userId = new Types.ObjectId(req.user.id);
    const { from, to } = parseDateRange(req);
    const limit = Math.min(
      Number(req.query.limit) && Number(req.query.limit) > 0
        ? Number(req.query.limit)
        : 10,
      50,
    );

    const matchRun: Record<string, unknown> = {
      startedBy: userId,
      ...buildDateMatch('createdAt', from, to),
    };

    const failures = await RunItem.aggregate<{
      _id: string;
      failures: number;
    }>([
      { $match: { status: 'Fail' } },
      {
        $lookup: {
          from: 'runs',
          localField: 'run',
          foreignField: '_id',
          as: 'run',
        },
      },
      { $unwind: '$run' },
      { $match: matchRun },
      {
        $lookup: {
          from: 'testcases',
          localField: 'testCase',
          foreignField: '_id',
          as: 'testCase',
        },
      },
      { $unwind: '$testCase' },
      {
        $group: {
          _id: '$testCase.module',
          failures: { $sum: 1 },
        },
      },
      { $sort: { failures: -1 } },
      { $limit: limit },
    ]);

    const data = failures.map((f) => ({
      module: f._id,
      failures: f.failures,
    }));

    res.status(200).json({
      success: true,
      message: 'Module failure stats fetched',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getSlowTests = async (
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

    const userId = new Types.ObjectId(req.user.id);
    const { from, to } = parseDateRange(req);
    const limit = Math.min(
      Number(req.query.limit) && Number(req.query.limit) > 0
        ? Number(req.query.limit)
        : 5,
      50,
    );

    const matchRun: Record<string, unknown> = {
      startedBy: userId,
      ...buildDateMatch('createdAt', from, to),
    };

    const slowTests = await RunItem.aggregate<{
      testCaseId: string;
      module: string;
      durationMs: number;
    }>([
      {
        $match: {
          startedAt: { $ne: null },
          completedAt: { $ne: null },
        },
      },
      {
        $lookup: {
          from: 'runs',
          localField: 'run',
          foreignField: '_id',
          as: 'run',
        },
      },
      { $unwind: '$run' },
      { $match: matchRun },
      {
        $lookup: {
          from: 'testcases',
          localField: 'testCase',
          foreignField: '_id',
          as: 'testCase',
        },
      },
      { $unwind: '$testCase' },
      {
        $project: {
          testCaseId: '$testCase.testCaseId',
          module: '$testCase.module',
          durationMs: {
            $subtract: ['$completedAt', '$startedAt'],
          },
        },
      },
      { $sort: { durationMs: -1 } },
      { $limit: limit },
    ]);

    res.status(200).json({
      success: true,
      message: 'Slow tests fetched',
      data: slowTests,
    });
  } catch (error) {
    next(error);
  }
};

