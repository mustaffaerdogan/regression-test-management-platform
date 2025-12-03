import { useEffect, useState } from 'react';
import type {
  DashboardOverview,
  DashboardRunSummary,
  PassFailTrendPoint,
  PlatformStats,
  ModuleFailure,
  SlowTest,
} from '../../types/dashboard';
import {
  getDashboardModuleFailures,
  getDashboardOverview,
  getDashboardPassFailTrend,
  getDashboardPlatformStats,
  getDashboardRecentRuns,
  getDashboardSlowTests,
} from '../../api/dashboard';
import { OverviewCards } from './components/OverviewCards';
import { RecentRunsList } from './components/RecentRunsList';
import { PassFailTrendChart } from './components/PassFailTrendChart';
import { PlatformStatsChart } from './components/PlatformStatsChart';
import { ModuleFailuresList } from './components/ModuleFailuresList';
import { SlowTestsList } from './components/SlowTestsList';
import { DateRangeFilter } from './components/DateRangeFilter';
import { Button } from '../../components/Button';

export const DashboardPage = () => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recentRuns, setRecentRuns] = useState<DashboardRunSummary[]>([]);
  const [trend, setTrend] = useState<PassFailTrendPoint[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [moduleFailures, setModuleFailures] = useState<ModuleFailure[]>([]);
  const [slowTests, setSlowTests] = useState<SlowTest[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const overviewPromise = getDashboardOverview();
      const trendPromise = getDashboardPassFailTrend({ range });
      const recentRunsPromise = getDashboardRecentRuns({ limit: 5 });
      const platformStatsPromise = getDashboardPlatformStats();
      const moduleFailuresPromise = getDashboardModuleFailures({ limit: 5 });
      const slowTestsPromise = getDashboardSlowTests({ limit: 5 });

      const [
        overviewRes,
        trendRes,
        recentRunsRes,
        platformStatsRes,
        moduleFailuresRes,
        slowTestsRes,
      ] = await Promise.all([
        overviewPromise,
        trendPromise,
        recentRunsPromise,
        platformStatsPromise,
        moduleFailuresPromise,
        slowTestsPromise,
      ]);

      setOverview(overviewRes.data ?? null);
      setTrend(trendRes.data ?? []);
      setRecentRuns(recentRunsRes.data ?? []);
      setPlatformStats(platformStatsRes.data ?? null);
      setModuleFailures(moduleFailuresRes.data ?? []);
      setSlowTests(slowTestsRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            High-level view of your regression activity, quality trends, and platform coverage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter value={range} onChange={setRange} />
          <Button
            type="button"
            variant="secondary"
            className="px-4 py-2"
            onClick={() => {
              void fetchData();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200 flex items-center justify-between">
          <span>{error}</span>
          <Button
            type="button"
            variant="secondary"
            className="ml-4 px-3 py-1 text-xs"
            onClick={() => {
              void fetchData();
            }}
          >
            Retry
          </Button>
        </div>
      )}

      <OverviewCards overview={overview} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-6 lg:col-span-2">
          <PassFailTrendChart data={trend} loading={loading} />
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent p-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Recent Runs
            </h2>
            <RecentRunsList runs={recentRuns} loading={loading} />
          </div>
        </div>
        <div className="space-y-6">
          <PlatformStatsChart stats={platformStats} loading={loading} />
          <ModuleFailuresList modules={moduleFailures} loading={loading} />
          <SlowTestsList tests={slowTests} loading={loading} />
        </div>
      </div>
    </div>
  );
};


