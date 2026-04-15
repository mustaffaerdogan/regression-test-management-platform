import { Request, Response, NextFunction } from 'express';
import { 
  getJiraBaseUrl, 
  getJiraAuthHeaders, 
  createJiraIssue, 
  transitionJiraIssue, 
  getJiraProjects, 
  getJiraBoards,
  getJiraPriorities,
  getJiraUsers,
  getJiraStatuses, 
  searchJiraIssues as getJiraIssues,
  getJiraIssueTypes,
  addJiraComment,
  getJiraComments
} from '../utils/jira';
import RegressionSet from '../models/RegressionSet.model';
import TestCase from '../models/TestCase.model';

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getJiraProjects();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getBoards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectKey } = req.query as { projectKey?: string };
    const data = await getJiraBoards(projectKey);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getPriorities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getJiraPriorities();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectKey } = req.query as { projectKey: string };
    const data = await getJiraUsers(projectKey);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getStatuses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectKey } = req.query as { projectKey: string };
    const data = await getJiraStatuses(projectKey);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getIssueTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectKey } = req.query as { projectKey: string };
    const data = await getJiraIssueTypes(projectKey);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getIssues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectKey, status } = req.query as { projectKey: string, status?: string };
    const data = await getJiraIssues(projectKey, status);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const receiveExternalResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Placeholder for external results integration
    console.log('Received External Jira Results:', req.body);
    res.json({ success: true, message: 'External results received' });
  } catch (error) {
    next(error);
  }
};

export const exportCases = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { regressionSetId, testCaseIds, summary, jiraProjectKey, jiraAssignee, priorityId, jiraStatus } = req.body;

    const regressionSet = await RegressionSet.findById(regressionSetId);
    if (!regressionSet) {
      return res.status(404).json({ success: false, message: 'Regression set not found' });
    }

    const testCases = await TestCase.find({
      _id: { $in: testCaseIds },
      regressionSet: regressionSetId
    }).sort({ createdAt: 1 });

    if (!testCases.length) {
      return res.status(400).json({ success: false, message: 'No test cases selected or found' });
    }

    const mainIssue = await createJiraIssue({
      projectKey: jiraProjectKey,
      summary: summary || `Exported Test Cases - ${new Date().toLocaleDateString()}`,
      description: `Batch export of ${testCases.length} test cases from Regression Platform.\nTotal Cases: ${testCases.length}`,
      assigneeId: jiraAssignee || undefined,
      priorityId: priorityId || undefined,
      issueType: 'Task',
    });

    if (jiraStatus) {
      await transitionJiraIssue(mainIssue.key, jiraStatus);
    }

    for (const tc of testCases) {
      const caseDetail = `
*TEST CASE EXPORTED*
ID: ${tc.testCaseId}
Platform: ${tc.platform || '-'}
Module: ${tc.module || '-'}
Scenario: ${tc.testScenario || '-'}
Test Case: ${tc.testCase}
Pre-Conditions: ${tc.preConditions || '-'}
Test Data: ${tc.testData || '-'}
Test Steps: ${tc.testStep || '-'}
Expected Result: ${tc.expectedResult || '-'}
      `.trim();

      await addJiraComment(mainIssue.key, caseDetail);
    }

    res.status(200).json({
      success: true,
      message: `Successfully exported ${testCases.length} cases into Jira task: ${mainIssue.key}`,
      data: { jiraIssueKey: mainIssue.key },
    });
  } catch (error) {
    next(error);
  }
};

export const importFromJiraComments = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { issueKey, setName } = req.body;
    if (!issueKey) {
      return res.status(400).json({ success: false, message: 'Jira Issue Key is required' });
    }

    const commentData: any = await getJiraComments(issueKey);
    const comments = commentData.comments || [];
    
    const testCasesToCreate: any[] = [];

    comments.forEach((c: any) => {
      const body = typeof c.body === 'string' ? c.body : '';
      if (body.includes('*TEST CASE EXPORTED*') || body.includes('ID: TC-')) {
        const lines = body.split('\n').map((l: string) => l.trim().replace(/^\*/, '').replace(/\*$/, ''));
        const extracted: any = {
          module: 'General',
          testScenario: 'Imported Scenario',
          testCase: '',
          expectedResult: 'Expected result to be verified'
        };
        
        let currentField: string | null = null;
        lines.forEach((line: string) => {
          const trimmedLine = line.trim();
          if (line.startsWith('ID: ')) {
            extracted.testCaseId = line.substring(4).trim();
            currentField = 'testCaseId';
          } else if (line.startsWith('Platform: ')) {
            extracted.platform = line.substring(10).trim();
            currentField = 'platform';
          } else if (line.startsWith('Module: ')) {
            extracted.module = line.substring(8).trim();
            currentField = 'module';
          } else if (line.startsWith('Scenario: ')) {
            extracted.testScenario = line.substring(10).trim();
            currentField = 'testScenario';
          } else if (line.startsWith('Test Case: ')) {
            extracted.testCase = line.substring(11).trim();
            currentField = 'testCase';
          } else if (line.startsWith('Pre-Conditions: ')) {
            extracted.preConditions = line.substring(16).trim();
            currentField = 'preConditions';
          } else if (line.startsWith('Test Data: ')) {
            extracted.testData = line.substring(11).trim();
            currentField = 'testData';
          } else if (line.startsWith('Test Steps: ')) {
            extracted.testStep = line.substring(12).trim();
            currentField = 'testStep';
          } else if (line.startsWith('Expected Result: ')) {
            extracted.expectedResult = line.substring(17).trim();
            currentField = 'expectedResult';
          } else if (currentField && trimmedLine) {
            // Continuation of multiline fields
            if (currentField === 'testStep') extracted.testStep = (extracted.testStep || '') + '\n' + trimmedLine;
            else if (currentField === 'preConditions') extracted.preConditions = (extracted.preConditions || '') + '\n' + trimmedLine;
            else if (currentField === 'expectedResult') extracted.expectedResult = (extracted.expectedResult || '') + '\n' + trimmedLine;
            else if (currentField === 'testData') extracted.testData = (extracted.testData || '') + '\n' + trimmedLine;
          }
        });

        if (extracted.testCase) {
          testCasesToCreate.push(extracted);
        }
      }
    });

    if (testCasesToCreate.length === 0) {
      return res.status(404).json({ success: false, message: 'No exported test cases found in Jira comments' });
    }

    const newSet = new RegressionSet({
      name: setName || `Imported from ${issueKey}`,
      platform: testCasesToCreate[0].platform || 'Web',
      description: `Automatically imported from Jira Issue: ${issueKey}`,
      createdBy: req.user.id,
      teamId: req.user.teamId,
    });
    await newSet.save();

    const createdCases = await Promise.all(testCasesToCreate.map(async (tc) => {
      const testCase = new TestCase({
        ...tc,
        regressionSet: newSet._id,
      });
      return await testCase.save();
    }));

    newSet.testCases = createdCases.map((c: any) => c._id);
    await newSet.save();

    res.status(201).json({
      success: true,
      message: `Successfully imported ${createdCases.length} cases from Jira comments`,
      data: {
        regressionSetId: newSet._id,
        count: createdCases.length
      }
    });
  } catch (error) {
    next(error);
  }
};
