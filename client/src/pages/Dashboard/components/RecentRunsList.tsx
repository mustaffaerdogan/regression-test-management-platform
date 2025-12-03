import type { DashboardRunSummary } from '../../../types/dashboard';
import { RunStatusBadge } from '../../TestRuns/components/RunStatusBadge';
import { useNavigate } from 'react-router-dom';

interface RecentRunsListProps {
  runs: DashboardRunSummary[];
  loading: boolean;
}

export const RecentRunsList = ({ runs, loading }: RecentRunsListProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <div
            key={idx}
            className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 animate-pulse"
          >
            <div className="space-y-2">
              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!runs.length) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        No recent runs. Start a run from a regression set to see activity here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div
          key={run.runId}
          className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
        >
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/test-runs/${run.runId}`)}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {run.regressionSet?.name ?? 'Unnamed regression set'}
              </button>
              {run.regressionSet && (
                <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300">
                  {run.regressionSet.platform}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              {run.passed}/{run.totalCases} passed · {run.failed} failed · {run.skipped} skipped
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              Started {new Date(run.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <RunStatusBadge status={run.status} />
            <button
              type="button"
              onClick={() => navigate(`/test-runs/${run.runId}/execute`)}
              disabled={run.status !== 'In Progress'}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 disabled:text-gray-400 dark:disabled:text-gray-500 hover:underline disabled:no-underline"
            >
              {run.status === 'In Progress' ? 'Continue' : 'View'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};


