import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { bulkUpdateRunItems, getRunById } from '../../api/testRuns';
import type { Run, RunItem } from '../../types/testRun';
import { RunSummaryCard } from './components/RunSummaryCard';
import { RunStatusBadge } from './components/RunStatusBadge';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';

export const TestRunDetailPage = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [run, setRun] = useState<Run | null>(null);
  const [items, setItems] = useState<RunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const handleBulkMark = async (status: 'Pass' | 'Fail' | 'Skipped') => {
    if (!runId || !run) return;
    if (!window.confirm(`Mark all remaining test cases as ${status}?`)) return;
    setBulkLoading(true);
    setError(null);
    try {
      await bulkUpdateRunItems(runId, status);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk update run items');
    } finally {
      setBulkLoading(false);
    }
  };


  const fetchData = async () => {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getRunById(runId);
      if (response.data) {
        setRun(response.data.run);
        setItems(response.data.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test run');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading test run...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
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

  if (!run) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400">Run not found.</p>
      </div>
    );
  }

  const regressionSet =
    typeof run.regressionSet === 'string' ? undefined : run.regressionSet;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Test Run Summary
          </h1>
          {regressionSet && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Regression Set: {regressionSet.name} ({regressionSet.platform})
            </p>
          )}
        </div>
        {run.status === 'In Progress' && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="px-4 py-2 rounded-full"
              onClick={() => navigate(`/test-runs/${run._id}/execute`)}
            >
              Continue Execution
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-2"
              onClick={() => {
                void handleBulkMark('Pass');
              }}
              disabled={bulkLoading}
            >
              Mark Remaining Pass
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-2"
              onClick={() => {
                void handleBulkMark('Fail');
              }}
              disabled={bulkLoading}
            >
              Mark Remaining Fail
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-2"
              onClick={() => {
                void handleBulkMark('Skipped');
              }}
              disabled={bulkLoading}
            >
              Mark Remaining Skipped
            </Button>
          </div>
        )}
      </div>

      <RunSummaryCard run={run} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Executed Test Cases
          </h2>
          <RunStatusBadge status={run.status} />
        </div>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/60">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                  Order
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                  Test Case ID
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                  Module
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                  Scenario
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                  Status
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                  Completed At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">
                    {item.order}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                    {item.testCase.testCaseId}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                    {item.testCase.module}
                  </td>
                  <td
                    className="px-3 py-2 max-w-xs text-gray-700 dark:text-gray-200 truncate"
                    title={item.testCase.testScenario}
                  >
                    {item.testCase.testScenario}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <RunStatusBadge
                      // map RunItemStatus -> one of badge styles by reusing text
                      status={
                        item.status === 'Not Executed'
                          ? 'In Progress'
                          : item.status === 'Pass'
                          ? 'Completed'
                          : 'Cancelled'
                      }
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                    {item.completedAt
                      ? new Date(item.completedAt).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

