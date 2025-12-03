import type { DashboardOverview } from '../../../types/dashboard';

interface OverviewCardsProps {
  overview: DashboardOverview | null;
  loading: boolean;
}

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

export const OverviewCards = ({ overview, loading }: OverviewCardsProps) => {
  if (loading && !overview) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 animate-pulse"
          >
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Total Runs
        </p>
        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
          {overview.totalRuns}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Active Runs
        </p>
        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
          {overview.activeRuns}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Completed: {overview.completedRuns}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Pass Rate
        </p>
        <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
          {formatPercent(overview.passRate)}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Fail: {formatPercent(overview.failRate)} · Skipped: {formatPercent(overview.skippedRate)}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Test Cases
        </p>
        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
          {overview.totalTestCases}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Regression sets: {overview.totalRegressionSets}
        </p>
      </div>
    </div>
  );
};


