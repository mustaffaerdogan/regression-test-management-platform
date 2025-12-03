import type { PassFailTrendPoint } from '../../../types/dashboard';

interface PassFailTrendChartProps {
  data: PassFailTrendPoint[];
  loading: boolean;
}

export const PassFailTrendChart = ({ data, loading }: PassFailTrendChartProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-40 w-full bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Pass / Fail Trend
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No runs in this period. Adjust the date range to see history.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Pass / Fail Trend
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs sm:text-sm">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th className="py-1 pr-4">Date</th>
              <th className="py-1 pr-4 text-emerald-600 dark:text-emerald-400">Passed</th>
              <th className="py-1 pr-4 text-red-600 dark:text-red-400">Failed</th>
              <th className="py-1 pr-4 text-yellow-600 dark:text-yellow-400">Skipped</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.date} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-1 pr-4 text-gray-900 dark:text-gray-100">{point.date}</td>
                <td className="py-1 pr-4 text-gray-900 dark:text-gray-100">{point.passed}</td>
                <td className="py-1 pr-4 text-gray-900 dark:text-gray-100">{point.failed}</td>
                <td className="py-1 pr-4 text-gray-900 dark:text-gray-100">{point.skipped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


