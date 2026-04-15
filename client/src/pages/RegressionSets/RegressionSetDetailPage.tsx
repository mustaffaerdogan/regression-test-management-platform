import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  deleteRegressionSet,
  deleteTestCase,
  getRegressionSetById,
} from '../../api/regressionSets';
import { startRun } from '../../api/testRuns';
import type { RegressionSet, TestCase } from '../../types/regression';
import { RegressionSetFormModal } from '../../components/RegressionSetFormModal';
import { TestCaseFormModal } from '../../components/TestCaseFormModal';
import { TestCaseTable } from '../../components/TestCaseTable';
import { Button } from '../../components/Button';
import { ImportCsvModal } from './components/ImportCsvModal';
import { JiraStartRunModal } from '../../components/JiraStartRunModal';
import { exportCasesToJira } from '../../api/jira';

const formatDate = (value?: string): string => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export const RegressionSetDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [regressionSet, setRegressionSet] = useState<RegressionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [isTestCaseModalOpen, setIsTestCaseModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | undefined>(undefined);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [startingRun, setStartingRun] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getRegressionSetById(id);
      setRegressionSet(response.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load regression set');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDeleteSet = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this regression set?')) return;
    try {
      await deleteRegressionSet(id);
      navigate('/regression-sets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete regression set');
    }
  };

  const handleAddTestCase = () => {
    setEditingTestCase(undefined);
    setIsTestCaseModalOpen(true);
  };

  const handleEditTestCase = (testCase: TestCase) => {
    setEditingTestCase(testCase);
    setIsTestCaseModalOpen(true);
  };

  const handleDeleteTestCase = async (testCaseId: string) => {
    if (!window.confirm('Are you sure you want to delete this test case?')) return;
    try {
      await deleteTestCase(testCaseId);
      await fetchData();
      setSuccessMessage('Test case deleted successfully');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete test case');
    }
  };

  const handleRegressionSetSaved = async () => {
    await fetchData();
    setSuccessMessage('Regression set saved successfully');
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const [jiraMode, setJiraMode] = useState<'start' | 'export'>('start');

  const handleStartRun = async () => {
    if (!regressionSet || !id) return;
    setStartingRun(true);
    setError(null);
    try {
      const response = await startRun(id);
      const runId = response.data?.runId;
      if (runId) {
        navigate(`/test-runs/${runId}/execute`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start test run');
    } finally {
      setStartingRun(false);
    }
  };


  const handleExportToJira = () => {
    setJiraMode('export');
    setIsJiraModalOpen(true);
  };

  const confirmJiraAction = async (jiraData?: { 
    jiraProjectKey?: string; 
    jiraAssignee?: string; 
    jiraBoardId?: string;
    testCaseIds?: string[];
    summary?: string;
    priorityId?: string;
    jiraStatus?: string;
    jiraBugIssueType?: string;
    jiraBugStatus?: string;
  }) => {
    if (!regressionSet || !id) return;
    setStartingRun(true);
    setError(null);
    try {
      if (jiraMode === 'start') {
        const response = await startRun(id, jiraData);
        const runId = response.data?.runId;
        if (runId) {
          navigate(`/test-runs/${runId}/execute`);
        }
      } else {
        if (jiraData?.jiraProjectKey && jiraData.testCaseIds && jiraData.summary) {
          await exportCasesToJira({
            regressionSetId: id,
            jiraProjectKey: jiraData.jiraProjectKey,
            jiraAssignee: jiraData.jiraAssignee,
            jiraBoardId: jiraData.jiraBoardId,
            testCaseIds: jiraData.testCaseIds,
            summary: jiraData.summary,
            priorityId: jiraData.priorityId,
            jiraStatus: jiraData.jiraStatus,
          });
          setSuccessMessage(`${jiraData.testCaseIds.length} test cases exported to Jira successfully`);
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Jira operation failed');
    } finally {
      setStartingRun(false);
      setIsJiraModalOpen(false);
    }
  };

  const handleTestCaseSaved = async () => {
    await fetchData();
    setSuccessMessage('Test case saved successfully');
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading regression set...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
          {error}{' '}
          <button
            type="button"
            onClick={() => {
              void fetchData();
            }}
            className="underline ml-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!regressionSet) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400">Regression set not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {regressionSet.name}
            </h1>
            <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
              {regressionSet.platform}
            </span>
          </div>
          {regressionSet.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              {regressionSet.description}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            Created: {formatDate(regressionSet.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="px-6 py-2.5 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold"
            onClick={handleStartRun}
            disabled={startingRun || (regressionSet.testCases?.length ?? 0) === 0}
          >
            Start Manual Run
          </Button>
          <Button
            type="button"
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-bold"
            onClick={handleExportToJira}
            disabled={startingRun || (regressionSet.testCases?.length ?? 0) === 0}
            loading={startingRun && jiraMode === 'export'}
          >
            Export to Jira
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 px-4 py-2"
              onClick={() => setIsSetModalOpen(true)}
            >
              Edit
            </Button>
            <Button
              type="button"
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700"
              onClick={handleDeleteSet}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-700 dark:text-green-200 border border-green-100 dark:border-green-800 font-bold animate-in fade-in slide-in-from-top-1">
          {successMessage}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Test Cases</h2>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="px-4 py-2"
              onClick={() => setIsImportModalOpen(true)}
            >
              Import CSV
            </Button>
            <Button
              type="button"
              className="px-4 py-2 rounded-full"
              onClick={handleAddTestCase}
            >
              Add Test Case
            </Button>
          </div>
        </div>
        <TestCaseTable
          testCases={regressionSet.testCases ?? []}
          onEdit={handleEditTestCase}
          onDelete={handleDeleteTestCase}
        />
      </section>

      <RegressionSetFormModal
        isOpen={isSetModalOpen}
        onClose={() => setIsSetModalOpen(false)}
        onSuccess={handleRegressionSetSaved}
        initialValues={regressionSet}
      />

      <TestCaseFormModal
        isOpen={isTestCaseModalOpen}
        onClose={() => setIsTestCaseModalOpen(false)}
        onSuccess={handleTestCaseSaved}
        regressionSetId={regressionSet._id}
        initialValues={editingTestCase}
      />

      <ImportCsvModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        regressionSetId={regressionSet._id}
        onImported={fetchData}
      />

      <JiraStartRunModal
        isOpen={isJiraModalOpen}
        onClose={() => setIsJiraModalOpen(false)}
        onConfirm={confirmJiraAction}
        loading={startingRun}
        mode={jiraMode}
        testCases={regressionSet.testCases}
      />
    </div>
  );
};

