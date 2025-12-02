import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getRunHistory } from '../../api/testRuns';
import type { RunStatus, RunHistoryQuery, Run } from '../../types/testRun';
import { RunHistoryTable } from './components/RunHistoryTable';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';

const STATUS_OPTIONS: (RunStatus | 'All')[] = ['All', 'In Progress', 'Completed', 'Cancelled'];
const PLATFORM_OPTIONS = ['All', 'Web', 'iOS', 'Android', 'TV'] as const;

export const TestRunHistoryPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<RunStatus | 'All'>('All');
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number]>('All');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchData = async (params?: Partial<RunHistoryQuery>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRunHistory({
        page,
        limit,
        status: status === 'All' ? undefined : status,
        platform: platform === 'All' ? undefined : platform,
        ...params,
      });
      const payload = response.data!;
      setRuns(payload.runs);
      setTotal(payload.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load run history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, platform]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleView = (runId: string) => {
    navigate(`/test-runs/${runId}`);
  };

  const handleExecute = (runId: string) => {
    navigate(`/test-runs/${runId}/execute`);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Test Run History</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Review and continue your previous regression runs.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as RunStatus | 'All');
            }}
            className="w-full md:w-40 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Platform</label>
          <select
            value={platform}
            onChange={(e) => {
              setPage(1);
              setPlatform(e.target.value as (typeof PLATFORM_OPTIONS)[number]);
            }}
            className="w-full md:w-40 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <Button
          type="button"
          variant="secondary"
          className="px-4 py-2"
          onClick={() => {
            setPage(1);
            void fetchData({ page: 1 });
          }}
        >
          Refresh
        </Button>
      </div>

      {loading && (
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading test runs...</p>
      )}

      {error && (
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
      )}

      {!loading && !error && (
        <>
          <RunHistoryTable runs={runs} onView={handleView} onExecute={handleExecute} />

          {total > 0 && (
            <div className="flex items-center justify-between mt-4 text-xs text-gray-600 dark:text-gray-400">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-1"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-1"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {!total && (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              No runs found yet. Start a run from a regression set.
            </p>
          )}
        </>
      )}
    </div>
  );
};

