import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { cancelRun, getNextRunItem, updateRunItem } from '../../api/testRuns';
import type { Run, RunItemStatus, RunItem } from '../../types/testRun';
import { RunSummaryCard } from './components/RunSummaryCard';
import { ExecutionProgressBar } from './components/ExecutionProgressBar';
import { ExecutionControls } from './components/ExecutionControls';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';

export const TestRunExecutePage = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [run, setRun] = useState<Run | null>(null);
  const [currentItem, setCurrentItem] = useState<RunItem | null>(null);
  const [loadingItem, setLoadingItem] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualResults, setActualResults] = useState('');

  const loadNext = async () => {
    if (!runId) return;
    setLoadingItem(true);
    setError(null);
    try {
      const response = await getNextRunItem(runId);
      if (response.data) {
        setRun(response.data.run);
        if (response.data.done) {
          setDone(true);
          setCurrentItem(null);
        } else if (response.data.item) {
          setCurrentItem(response.data.item);
          setActualResults(response.data.item.actualResults ?? '');
          setDone(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load next test case');
    } finally {
      setLoadingItem(false);
    }
  };

  useEffect(() => {
    void loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleExecute = async (status: RunItemStatus, results: string) => {
    if (!currentItem) return;
    setSaving(true);
    setError(null);
    try {
      const response = await updateRunItem(currentItem._id, {
        status,
        actualResults: results,
      });
      if (response.data) {
        setRun(response.data.run);
      }
      await loadNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update test case');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRun = async () => {
    if (!runId || !run) return;
    if (!window.confirm('Are you sure you want to cancel this run?')) return;
    setSaving(true);
    try {
      const response = await cancelRun(runId);
      setRun(response.data ?? null);
      navigate(`/test-runs/${runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel run');
    } finally {
      setSaving(false);
    }
  };

  const isInProgress = run?.status === 'In Progress';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Execute Test Run
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Work through each test case step by step and record the outcome.
          </p>
        </div>
        <div className="flex gap-3">
          {isInProgress && (
            <Button
              type="button"
              variant="secondary"
              className="px-4 py-2"
              onClick={handleCancelRun}
              disabled={saving}
            >
              Cancel Run
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            className="px-4 py-2"
            onClick={() => navigate(`/test-runs/${runId}`)}
          >
            View Summary
          </Button>
        </div>
      </div>

      {run && <RunSummaryCard run={run} />}

      {run && <ExecutionProgressBar run={run} />}

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {loadingItem && (
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading next test case...</p>
      )}

      {!loadingItem && done && (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-800 dark:text-green-200">
          This run is completed. You can review the results in the summary view.
        </div>
      )}

      {!loadingItem && !done && currentItem && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-soft dark:shadow-soft-dark p-4 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Test Case: {currentItem.testCase.testCaseId}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Module: {currentItem.testCase.module} • User Type: {currentItem.testCase.userType}
            </p>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <div>
                <h3 className="font-medium">Scenario</h3>
                <p>{currentItem.testCase.testScenario}</p>
              </div>
              <div>
                <h3 className="font-medium">Test Case</h3>
                <p>{currentItem.testCase.testCase}</p>
              </div>
              {currentItem.testCase.preConditions && (
                <div>
                  <h3 className="font-medium">Pre Conditions</h3>
                  <p>{currentItem.testCase.preConditions}</p>
                </div>
              )}
              {currentItem.testCase.testData && (
                <div>
                  <h3 className="font-medium">Test Data</h3>
                  <p>{currentItem.testCase.testData}</p>
                </div>
              )}
              {currentItem.testCase.testStep && (
                <div>
                  <h3 className="font-medium">Test Step</h3>
                  <p>{currentItem.testCase.testStep}</p>
                </div>
              )}
              <div>
                <h3 className="font-medium">Expected Result</h3>
                <p>{currentItem.testCase.expectedResult}</p>
              </div>
            </div>
          </div>
          <ExecutionControls
            disabled={!isInProgress}
            onExecute={handleExecute}
            actualResults={actualResults}
            onChangeActualResults={setActualResults}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
};

