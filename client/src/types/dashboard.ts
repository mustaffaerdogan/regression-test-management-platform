import type { RegressionPlatform } from './regression';

export interface DashboardOverview {
  totalRegressionSets: number;
  totalTestCases: number;
  totalRuns: number;
  activeRuns: number;
  completedRuns: number;
  passRate: number; // 0-100
  failRate: number; // 0-100
  skippedRate: number; // 0-100
}

export interface DashboardRunSummary {
  runId: string;
  regressionSet: {
    id: string;
    name: string;
    platform: RegressionPlatform;
  } | null;
  status: 'In Progress' | 'Completed' | 'Cancelled';
  totalCases: number;
  passed: number;
  failed: number;
  skipped: number;
  createdAt: string;
  completedAt?: string;
}

export interface PassFailTrendPoint {
  date: string; // "YYYY-MM-DD"
  passed: number;
  failed: number;
  skipped: number;
}

export type PlatformKey = 'Web' | 'iOS' | 'Android' | 'TV';

export type PlatformStats = Record<PlatformKey, number>;

export interface ModuleFailure {
  module: string;
  failures: number;
}

export interface SlowTest {
  testCaseId: string;
  module: string;
  durationMs: number;
}


