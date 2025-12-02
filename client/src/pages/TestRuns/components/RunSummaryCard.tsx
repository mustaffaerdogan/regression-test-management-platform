import type { Run } from '../../../types/testRun';
import { RunStatusBadge } from './RunStatusBadge';

interface RunSummaryCardProps {
  run: Run;
}

const formatDate = (value?: string): string => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value ?? '';
  }
};

export const RunSummaryCard = ({ run }: RunSummaryCardProps) => {
  const regressionSet =
    typeof run.regressionSet === 'string' ? undefined : run.regressionSet;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-soft dark:shadow-soft-dark p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {regressionSet?.name ?? 'Regression Run'}
          </h2>
          {regressionSet?.platform && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Platform: {regressionSet.platform}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Started at: {formatDate(run.createdAt)}
          </p>
          {run.completedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Completed at: {formatDate(run.completedAt)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <RunStatusBadge status={run.status} />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Total: {run.totalCases} • Pass: {run.passed} • Fail: {run.failed} • Skipped:{' '}
            {run.skipped}
          </p>
        </div>
      </div>
    </div>
  );
};

