import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import RegressionSet, { IRegressionSet } from '../models/RegressionSet.model';
import TestCase from '../models/TestCase.model';
import { ApiError } from '../middleware/error.middleware';
import { canAccessRegressionSet, getMyTeamIds, isTeamMember } from '../utils/authorization';

interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
}

const ensureAccess = async (
  regressionSet: IRegressionSet,
  req: AuthedRequest,
  message: string,
): Promise<boolean> => {
  if (!req.user) {
    (req.res as Response).status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return false;
  }

  const allowed = await canAccessRegressionSet(regressionSet, req.user.id);
  if (!allowed) {
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

    const { name, description, platform, teamId } = req.body;

    let teamObjectId: Types.ObjectId | undefined;
    if (typeof teamId === 'string' && teamId.trim().length > 0) {
      const member = await isTeamMember(teamId, req.user.id);
      if (!member) {
        res.status(403).json({ success: false, message: 'Unauthorized' });
        return;
      }
      teamObjectId = new Types.ObjectId(teamId);
    }

    const regressionSet = await RegressionSet.create({
      name,
      description,
      platform,
      createdBy: req.user.id,
      ...(teamObjectId ? { team: teamObjectId } : {}),
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

    const { platform, search, teamId } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof teamId === 'string' && teamId.trim().length > 0) {
      const member = await isTeamMember(teamId, req.user.id);
      if (!member) {
        res.status(403).json({ success: false, message: 'Unauthorized' });
        return;
      }
      filter.team = new Types.ObjectId(teamId);
    } else {
      const myTeamIds = await getMyTeamIds(req.user.id);
      filter.$or = [
        { createdBy: new Types.ObjectId(req.user.id) },
        ...(myTeamIds.length > 0 ? [{ team: { $in: myTeamIds } }] : []),
      ];
    }

    if (typeof platform === 'string' && platform.length > 0) {
      filter.platform = platform;
    }

    if (typeof search === 'string' && search.trim().length > 0) {
      const regex = new RegExp(search.trim(), 'i');
      const searchOr = [{ name: regex }, { description: regex }];
      if (Array.isArray(filter.$or)) {
        // Combine existing $or (scope) with $and(search $or)
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
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

    if (!(await ensureAccess(regressionSet, req, 'Unauthorized'))) {
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

    if (!(await ensureAccess(regressionSet, req, 'Unauthorized'))) {
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

    if (!(await ensureAccess(regressionSet, req, 'Unauthorized'))) {
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

