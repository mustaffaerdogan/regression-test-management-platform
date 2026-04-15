import { Router } from 'express';
import { receiveExternalResults, getProjects, getBoards, exportCases, getPriorities, getUsers, getStatuses, getIssueTypes, getIssues, importFromJiraComments } from '../controllers/jira.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Endpoint for external systems to post results
router.post('/external-results', authMiddleware, receiveExternalResults);

// Fetch available Jira projects
router.get('/projects', authMiddleware, getProjects);

// Fetch available Jira boards
router.get('/boards', authMiddleware, getBoards);

// Fetch available Jira priorities
router.get('/priorities', authMiddleware, getPriorities);

// Fetch available Jira users for a project
router.get('/users', authMiddleware, getUsers);

// Fetch available Jira statuses for a project
router.get('/statuses', authMiddleware, getStatuses);

// Fetch available Jira issue types for a project
router.get('/issue-types', authMiddleware, getIssueTypes);

// Fetch available Jira issues for a project (by status)
router.get('/issues', authMiddleware, getIssues);

// Export test cases to new Jira tasks
router.post('/export-cases', authMiddleware, exportCases);

// Import test cases from Jira comments
router.post('/import-comments', authMiddleware, importFromJiraComments);

export default router;
