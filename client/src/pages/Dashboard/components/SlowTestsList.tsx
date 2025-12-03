import type { SlowTest } from '../../../types/dashboard';

interface SlowTestsListProps {
  tests: SlowTest[];
  loading: boolean;
}

const formatSeconds = (ms: number): string => (ms / 1000).toFixed(1);

export const SlowTestsList = ({ tests, loading }: SlowTestsListProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={idx} className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!tests.length) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Slow Tests</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No slow tests available. Execute runs to see performance insights.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Slow Tests</h3>
      <ul className="space-y-2 text-sm">
        {tests.map((test) => (
          <li
            key={`${test.testCaseId}-${test.module}-${test.durationMs}`}
            className="flex items-center justify-between text-gray-900 dark:text-gray-100"
          >
            <div className="flex flex-col">
              <span className="font-medium">{test.testCaseId}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">{test.module}</span>
            </div>
            <span className="ml-4 text-xs font-medium text-amber-600 dark:text-amber-400">
              {formatSeconds(test.durationMs)}s
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};


