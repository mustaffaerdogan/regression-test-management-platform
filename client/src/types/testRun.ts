import type { RegressionSet, TestCase, ApiResponse } from './regression';

export type RunStatus = 'In Progress' | 'Completed' | 'Cancelled';

export type RunItemStatus = 'Not Executed' | 'Pass' | 'Fail' | 'Skipped';

export interface Run {
  _id: string;
  regressionSet: string | Pick<RegressionSet, '_id' | 'name' | 'platform'>;
  startedBy: { _id: string; name: string } | string;
  status: RunStatus;
  createdAt: string;
  completedAt?: string;
  totalCases: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface RunItem {
  _id: string;
  run: string;
  testCase: TestCase;
  order: number;
  status: RunItemStatus;
  actualResults: string;
  startedAt?: string;
  completedAt?: string;
}

export interface RunSummary {
  run: Run;
  items: RunItem[];
}

export interface RunHistoryQuery {
  page?: number;
  limit?: number;
  platform?: string;
  status?: RunStatus;
}

export type ApiRunResponse<T> = ApiResponse<T>;


