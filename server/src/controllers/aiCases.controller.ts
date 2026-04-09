import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/error.middleware';
import { generateRegressionSetsFromText, LLMRequestError } from '../utils/aiCases';
import { fetchAndExtractJiraData } from '../utils/jira';

export const generateCases = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const { userStory, acceptanceCriteria } = req.body as {
      userStory: string;
      acceptanceCriteria: string[];
    };

    const trimmedCriteria = acceptanceCriteria
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    try {
      const result = await generateRegressionSetsFromText({
        userStory: userStory.trim(),
        acceptanceCriteria: trimmedCriteria,
      });

      res.status(200).json({
        success: true,
        message: 'AI regression set suggestions generated (max 3 test cases per request)',
        data: {
          ...result,
          limits: {
            maxTestCasesPerRequest: 3,
            generatedTestCases: result.regressionSets[0]?.testCases.length ?? 0,
          },
        },
      });
    } catch (err) {
      const error: ApiError = new Error(
        err instanceof Error ? err.message : 'Failed to generate suggestions',
      );
      if (err instanceof LLMRequestError) {
        error.statusCode = err.statusCode;
      } else {
        error.statusCode = 502;
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

export const extractJira = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const { jiraUrl } = req.body as { jiraUrl: string };
    if (!jiraUrl) {
      const error: ApiError = new Error('jiraUrl is required');
      error.statusCode = 400;
      throw error;
    }

    const result = await fetchAndExtractJiraData(jiraUrl);

    res.status(200).json({
      success: true,
      message: 'Extracted data from Jira',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

