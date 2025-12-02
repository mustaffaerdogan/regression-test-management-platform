import type { Run } from '../../../types/testRun';

interface ExecutionProgressBarProps {
  run: Run;
}

export const ExecutionProgressBar = ({ run }: ExecutionProgressBarProps) => {
  const executed = run.passed + run.failed + run.skipped;
  const total = run.totalCases || 1;
  const percent = Math.min(100, Math.round((executed / total) * 100));

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>
          Progress: {executed}/{run.totalCases}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <div
          className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

