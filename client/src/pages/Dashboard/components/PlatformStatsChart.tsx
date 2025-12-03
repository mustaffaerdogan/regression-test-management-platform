import type { PlatformStats } from '../../../types/dashboard';

interface PlatformStatsChartProps {
  stats: PlatformStats | null;
  loading: boolean;
}

export const PlatformStatsChart = ({ stats, loading }: PlatformStatsChartProps) => {
  const entries = stats
    ? (Object.entries(stats) as [keyof PlatformStats, number][])
    : ([] as [keyof PlatformStats, number][]);

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

  if (!stats) {
    return null;
  }

  const max = entries.reduce((acc, [, value]) => Math.max(acc, value), 0) || 1;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Runs by Platform
      </h3>
      <div className="space-y-2">
        {entries.map(([platform, value]) => (
          <div key={platform} className="flex items-center gap-2">
            <span className="w-14 text-xs text-gray-600 dark:text-gray-400">{platform}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-xs text-gray-700 dark:text-gray-200 text-right">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};


