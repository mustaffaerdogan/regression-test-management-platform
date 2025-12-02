import type { RunStatus } from '../../../types/testRun';

interface RunStatusBadgeProps {
  status: RunStatus;
}

export const RunStatusBadge = ({ status }: RunStatusBadgeProps) => {
  const classes =
    status === 'In Progress'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      : status === 'Completed'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-300';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}
    >
      {status}
    </span>
  );
};

