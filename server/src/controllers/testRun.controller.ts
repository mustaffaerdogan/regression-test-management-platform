import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import ExcelJS from 'exceljs';
import RegressionSet from '../models/RegressionSet.model';
import TestCase from '../models/TestCase.model';
import User from '../models/User.model';
import Run, { IRun } from '../models/Run';
import RunItem, { IRunItem } from '../models/RunItem';
import { ApiError } from '../middleware/error.middleware';
import { canAccessRegressionSet, canExecuteRegressionSet, getMyTeamIds } from '../utils/authorization';
import { createJiraIssue, addJiraComment, transitionJiraIssue, getJiraIssueTypes } from '../utils/jira';

interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
}

const ensureRunAccess = async (run: IRun, req: AuthedRequest): Promise<boolean> => {
  if (!req.user) return false;
  const regressionSet = await RegressionSet.findById(run.regressionSet);
  if (!regressionSet) return false;
  return await canAccessRegressionSet(regressionSet as any, req.user.id);
};

const ensureExecuteRunAccess = async (run: IRun, req: AuthedRequest): Promise<boolean> => {
  if (!req.user) return false;
  const regressionSet = await RegressionSet.findById(run.regressionSet);
  if (!regressionSet) return false;
  return await canExecuteRegressionSet(regressionSet as any, req.user.id);
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

    const allowed = await canExecuteRegressionSet(regressionSet as any, req.user.id);
    if (!allowed) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { 
      jiraProjectKey, 
      jiraAssignee, 
      jiraBoardId, 
      jiraStatus, 
      jiraBugIssueType,
      jiraBugStatus,
      jiraIssueKey,
      summary: runSummary,
      testCaseIds: selectedIds 
    } = req.body as { 
      jiraProjectKey?: string; 
      jiraAssignee?: string;
      jiraBoardId?: string;
      jiraStatus?: string;
      jiraBugIssueType?: string;
      jiraBugStatus?: string;
      jiraIssueKey?: string;
      summary?: string;
      testCaseIds?: string[];
    };

    const query: any = { regressionSet: regressionSet._id };
    if (selectedIds && selectedIds.length > 0) {
      query._id = { $in: selectedIds };
    }

    const testCases = await TestCase.find(query).sort({ createdAt: 1 }).lean().exec();

    if (testCases.length === 0) {
      res.status(400).json({ success: false, message: 'No test cases selected' });
      return;
    }

    let mainJiraKey: string | undefined = jiraIssueKey;

    if (jiraProjectKey && !mainJiraKey) {
      try {
        const jiraIssue = await createJiraIssue({
          projectKey: jiraProjectKey as string,
          summary: runSummary || `Regression Run - ${regressionSet.name} - ${new Date().toLocaleDateString()}`,
          description: `Regression run started for ${regressionSet.name}.\nTotal cases: ${testCases.length}\nStarted by: ${req.user.id}\nBoard: ${jiraBoardId || '-'}.`,
          assigneeId: jiraAssignee,
          issueType: 'Task',
        });
        mainJiraKey = jiraIssue.key;

        if (jiraStatus) {
          await transitionJiraIssue(mainJiraKey, jiraStatus);
        }
      } catch (err) {
        console.error('Failed to create main Jira task:', err);
      }
    } else if (mainJiraKey) {
      // If linking to existing, post a comment that a run has started linked to this
      try {
        const user = await User.findById(req.user.id);
        const userName = user?.name || 'A user';
        await addJiraComment(mainJiraKey, `💡 *Regression Run Linked*\nA new regression run for *${regressionSet.name}* has been linked to this task.\nTotal cases: ${testCases.length}\nStarted by: ${userName} (ID: ${req.user.id})`);
      } catch (err) {
        console.error('Failed to comment on existing Jira task:', err);
      }
    }

    const run: any = await Run.create({
      regressionSet: regressionSet._id,
      startedBy: new Types.ObjectId(req.user.id),
      status: 'In Progress',
      totalCases: testCases.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      jiraIssueKey: mainJiraKey,
      jiraBugIssueType,
      jiraBugStatus,
    } as any);

    const runItems: any[] = testCases.map((tc, index) => ({
      run: run._id,
      testCase: tc._id,
      order: index + 1,
      status: 'Not Executed',
    }));

    await RunItem.insertMany(runItems);

    res.status(201).json({
      success: true,
      message: 'Run started with Jira main task integration',
      data: { runId: run._id, jiraIssueKey: mainJiraKey },
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
    const { runId } = req.params;
    const run = await Run.findById(runId).populate('regressionSet', 'name platform');
    if (!run) {
      res.status(404).json({ success: false, message: 'Run not found' });
      return;
    }

    if (!(await ensureRunAccess(run, req))) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const runItems = await RunItem.find({ run: run._id })
      .sort({ order: 1 })
      .populate('testCase')
      .exec();

    res.status(200).json({
      success: true,
      data: { run, runItems },
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
    const { runId } = req.params;
    const run = await Run.findById(runId);
    if (!run) {
      res.status(404).json({ success: false, message: 'Run not found' });
      return;
    }

    if (!(await ensureRunAccess(run, req))) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const nextItem = await RunItem.findOne({ run: run._id, status: 'Not Executed' })
      .sort({ order: 1 })
      .populate('testCase')
      .exec();

    res.status(200).json({
      success: true,
      data: {
        done: !nextItem,
        item: nextItem || null,
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

    const runItem = await RunItem.findById(itemId).populate('testCase');
    if (!runItem) {
      const error: ApiError = new Error('Run item not found');
      error.statusCode = 404;
      throw error;
    }

    const run = await Run.findById(runItem.run).populate('regressionSet');
    if (!run) {
      const error: ApiError = new Error('Associated run not found');
      error.statusCode = 404;
      throw error;
    }

    if (!(await ensureExecuteRunAccess(run, req))) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
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
    runItem.executedBy = new Types.ObjectId(req.user.id) as any;

    await runItem.save();

    // 🔥 Automation: Auto-Bug on Failure
    if (status === 'Fail' && run.jiraIssueKey) {
      try {
        const tc = runItem.testCase as any;
        const bugDescription = `
*BUG REPORTED FROM REGRESSION RUN*
Run ID: ${run._id}
Main Task: ${run.jiraIssueKey}

Platform: ${tc.platform || '-'}
Module: ${String(tc.module || '-')}
Scenario: ${tc.testScenario || '-'}
Test Case: ${tc.testCase}
Pre-Conditions: ${tc.preConditions || '-'}
Test Data: ${tc.testData || '-'}
Test Steps: ${tc.testStep || '-'}
Expected Result: ${tc.expectedResult || '-'}

*Actual Results:* ${actualResults || 'N/A'}
        `.trim();

        // Extract project key from main task (e.g., PLAT-123 -> PLAT)
        if (!run.jiraIssueKey) throw new Error('Jira issue key is missing');
        const projectKey = run.jiraIssueKey.split('-')[0];
        if (!projectKey) throw new Error('Could not extract project key');

        // Dynamically resolve 'Bug' issue type if not explicitly set
        let bugTypeName = (run as any).jiraBugIssueType;
        if (!bugTypeName) {
          const issueTypes = await getJiraIssueTypes(projectKey) as Array<{ id: string; name: string }>;
          const bugType = issueTypes.find((t: { name: string }) => t.name.toLowerCase() === 'bug') || 
                          issueTypes.find((t: { name: string }) => t.name.toLowerCase().includes('bug')) || 
                          issueTypes[0];
          bugTypeName = bugType?.name || 'Bug';
        }

        const bugIssue = await createJiraIssue({
          projectKey,
          summary: `Bug: ${tc.testCase} (${tc.testCaseId})`,
          description: bugDescription,
          issueType: bugTypeName,
        });

        if (run.jiraBugStatus) {
          await transitionJiraIssue(bugIssue.key, run.jiraBugStatus);
        }

        (runItem as any).jiraIssueKey = bugIssue.key;
        await runItem.save();

        // Also comment on the main task
        await addJiraComment(run.jiraIssueKey as string, `❌ Test Failed: ${tc.testCaseId} - ${tc.testCase}. Bug created: ${bugIssue.key}`);
      } catch (err) {
        console.error('Failed to create Bug in Jira:', err);
      }
    } else if (status === 'Pass' && run.jiraIssueKey) {
      try {
        const tc = runItem.testCase as any;
        await addJiraComment(run.jiraIssueKey as string, `✅ Test Passed: ${tc.testCaseId} - ${tc.testCase}`);
      } catch (err) {
        console.error('Failed to comment on main Jira task:', err);
      }
    }

    const incObj: { passed?: number; failed?: number; skipped?: number } = {};
    if (previousStatus === 'Pass') incObj.passed = (incObj.passed || 0) - 1;
    if (previousStatus === 'Fail') incObj.failed = (incObj.failed || 0) - 1;
    if (previousStatus === 'Skipped') incObj.skipped = (incObj.skipped || 0) - 1;

    if (status === 'Pass') incObj.passed = (incObj.passed || 0) + 1;
    if (status === 'Fail') incObj.failed = (incObj.failed || 0) + 1;
    if (status === 'Skipped') incObj.skipped = (incObj.skipped || 0) + 1;

    let updatedRun: IRun | null = run;
    if (Object.keys(incObj).length > 0) {
      updatedRun = await Run.findByIdAndUpdate(
        run._id,
        { $inc: incObj },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      data: { item: runItem, run: updatedRun },
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
    const { runId } = req.params;
    const run = await Run.findById(runId);
    if (!run) {
      res.status(404).json({ success: false, message: 'Run not found' });
      return;
    }

    if (!(await ensureExecuteRunAccess(run, req))) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    run.status = 'Cancelled';
    run.completedAt = new Date();
    await run.save();

    res.status(200).json({ success: true, message: 'Run cancelled', data: run });
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
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const teamIds = await getMyTeamIds(req.user.id);
    const sets = await RegressionSet.find({ team: { $in: teamIds } }).select('_id');
    const setIds = sets.map(s => s._id);

    const { page = 1, limit = 10, status } = req.query as any;

    const query: any = { regressionSet: { $in: setIds } };
    if (status) query.status = status;
    
    const runs = await Run.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('regressionSet', 'name platform')
      .populate('startedBy', 'name');

    const total = await Run.countDocuments(query);

    res.status(200).json({
      success: true,
      data: runs,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateRunItems = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { runId } = req.params;
    const { status } = req.body as { status: 'Pass' | 'Fail' | 'Skipped' };

    const run = await Run.findById(runId).populate('regressionSet');
    if (!run) {
      res.status(404).json({ success: false, message: 'Run not found' });
      return;
    }

    if (!(await ensureExecuteRunAccess(run, req))) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const items = await RunItem.find({ run: run._id, status: 'Not Executed' }).populate('testCase');
    
    for (const item of items) {
      item.status = status;
      item.completedAt = new Date();
      item.executedBy = new Types.ObjectId(req.user?.id) as any;
      await item.save();
      
      // Auto-Bug on Bulk Failure
      if (status === 'Fail' && run.jiraIssueKey) {
        try {
          const tc = item.testCase as any;
          const projectKey = run.jiraIssueKey!.split('-')[0] as string;
          const bugIssue = await createJiraIssue({
            projectKey,
            summary: `Bug: ${tc.testCase} (${tc.testCaseId})`,
            description: `Auto-Bug from Bulk Fail in Run ${run._id}\n\nPlatform: ${tc.platform}\nModule: ${tc.module}`,
            issueType: 'Bug',
          });
          item.jiraIssueKey = bugIssue.key;
          await item.save();
          await addJiraComment(run.jiraIssueKey, `❌ Bulk Failed: ${tc.testCaseId}. Bug created: ${bugIssue.key}`);
        } catch (err) {
          console.error('Bulk bug creation error:', err);
        }
      } else if (status === 'Pass' && run.jiraIssueKey) {
        await addJiraComment(run.jiraIssueKey, `✅ Bulk Passed: ${(item.testCase as any).testCaseId}`);
      }
    }

    const count = items.length;
    if (status === 'Pass') run.passed += count;
    if (status === 'Fail') run.failed += count;
    if (status === 'Skipped') run.skipped += count;

    if (run.passed + run.failed + run.skipped === run.totalCases) {
      run.status = 'Completed';
      run.completedAt = new Date();
    }
    await run.save();

    res.status(200).json({ success: true, message: `Updated ${count} items`, data: run });
  } catch (error) {
    next(error);
  }
};

export const exportRunToExcel = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { runId } = req.params;
    const run = await Run.findById(runId).populate('regressionSet');
    if (!run) {
      res.status(404).json({ success: false, message: 'Run not found' });
      return;
    }

    const items = await RunItem.find({ run: run._id }).populate('testCase').populate('executedBy', 'name');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test Run Results');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Test Case', key: 'name', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Executed By', key: 'executedBy', width: 20 },
      { header: 'Actual Results', key: 'actual', width: 40 },
      { header: 'Jira Key', key: 'jira', width: 15 },
    ];

    items.forEach(item => {
      worksheet.addRow({
        id: (item.testCase as any)?.testCaseId,
        name: (item.testCase as any)?.testCase,
        status: item.status,
        executedBy: (item.executedBy as any)?.name || 'System',
        actual: item.actualResults,
        jira: item.jiraIssueKey || '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Run_${runId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

export const retestFailedSkipped = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { runId } = req.params;
    const oldRun = await Run.findById(runId);
    if (!oldRun) {
      res.status(404).json({ success: false, message: 'Run not found' });
      return;
    }

    const failedItems = await RunItem.find({ 
      run: oldRun._id, 
      status: { $in: ['Fail', 'Skipped'] } 
    }).sort({ order: 1 });

    if (failedItems.length === 0) {
      res.status(400).json({ success: false, message: 'No failed or skipped items to retest' });
      return;
    }

    const newRun = await Run.create({
      regressionSet: oldRun.regressionSet,
      startedBy: new Types.ObjectId(req.user?.id),
      status: 'In Progress',
      totalCases: failedItems.length,
      passed: 0,
      failed: 0,
      skipped: 0,
    });

    const newItems = failedItems.map((item, index) => ({
      run: newRun._id,
      testCase: item.testCase,
      order: index + 1,
      status: 'Not Executed',
    }));

    await RunItem.insertMany(newItems);

    res.status(201).json({ success: true, data: { runId: newRun._id } });
  } catch (error) {
    next(error);
  }
};
