import type { RunStatus, RunItemStatus } from '../../../types/testRun';

interface RunStatusBadgeProps {
  status: RunStatus | RunItemStatus;
}

export const RunStatusBadge = ({ status }: RunStatusBadgeProps) => {
  let classes = 'bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-300'; // Default / Cancelled

  if (status === 'Pass' || status === 'Completed') {
    classes = 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  } else if (status === 'Fail') {
    classes = 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  } else if (status === 'Skipped') {
    classes = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
  } else if (status === 'In Progress' || status === 'Not Executed') {
    classes = 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}
    >
      {status}
    </span>
  );
};

