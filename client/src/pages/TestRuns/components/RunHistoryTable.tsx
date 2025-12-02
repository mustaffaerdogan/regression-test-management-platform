import type { Run } from '../../../types/testRun';
import { RunStatusBadge } from './RunStatusBadge';

interface RunHistoryTableProps {
  runs: Run[];
  onView: (runId: string) => void;
  onExecute: (runId: string) => void;
}

const shortId = (id: string): string => {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
};

export const RunHistoryTable = ({ runs, onView, onExecute }: RunHistoryTableProps) => {
  if (runs.length === 0) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        No runs found yet. Start a run from a regression set.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/60">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Run ID
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Regression Set
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Platform
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Status
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Summary
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Created At
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {runs.map((run) => {
            const regressionSet =
              typeof run.regressionSet === 'string' ? undefined : run.regressionSet;

            return (
              <tr key={run._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">
                  {shortId(run._id)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                  {regressionSet?.name ?? '—'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                  {regressionSet?.platform ?? '—'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <RunStatusBadge status={run.status} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                  {run.passed}/{run.totalCases} passed, {run.failed} failed, {run.skipped} skipped
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                  {new Date(run.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => onView(run._id)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline mr-3"
                  >
                    View
                  </button>
                  {run.status === 'In Progress' && (
                    <button
                      type="button"
                      onClick={() => onExecute(run._id)}
                      className="text-sm text-green-600 dark:text-green-400 hover:underline"
                    >
                      Execute
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

