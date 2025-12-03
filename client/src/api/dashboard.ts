import type { ApiResponse } from '../types/regression';
import type {
  DashboardOverview,
  DashboardRunSummary,
  PassFailTrendPoint,
  PlatformStats,
  ModuleFailure,
  SlowTest,
} from '../types/dashboard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const data = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'An error occurred');
  }

  return data;
};

const buildQueryString = (params?: Record<string, string | number | undefined>): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

export const getDashboardOverview = async (
  params?: { from?: string; to?: string },
): Promise<ApiResponse<DashboardOverview>> => {
  const query = buildQueryString(params);
  const response = await fetch(`${API_BASE_URL}/dashboard/overview${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<DashboardOverview>(response);
};

export const getDashboardRecentRuns = async (
  params?: { limit?: number },
): Promise<ApiResponse<DashboardRunSummary[]>> => {
  const query = buildQueryString(
    params
      ? {
          limit: params.limit,
        }
      : undefined,
  );

  const response = await fetch(`${API_BASE_URL}/dashboard/recent-runs${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<DashboardRunSummary[]>(response);
};

export const getDashboardPassFailTrend = async (
  params?: { range?: '7d' | '30d' | '90d' | '180d' | '365d'; from?: string; to?: string },
): Promise<ApiResponse<PassFailTrendPoint[]>> => {
  const query = buildQueryString(params);

  const response = await fetch(`${API_BASE_URL}/dashboard/pass-fail-trend${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<PassFailTrendPoint[]>(response);
};

export const getDashboardPlatformStats = async (
  params?: { from?: string; to?: string },
): Promise<ApiResponse<PlatformStats>> => {
  const query = buildQueryString(params);

  const response = await fetch(`${API_BASE_URL}/dashboard/platform-stats${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<PlatformStats>(response);
};

export const getDashboardModuleFailures = async (
  params?: { from?: string; to?: string; limit?: number },
): Promise<ApiResponse<ModuleFailure[]>> => {
  const query = buildQueryString(params);

  const response = await fetch(`${API_BASE_URL}/dashboard/module-failures${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<ModuleFailure[]>(response);
};

export const getDashboardSlowTests = async (
  params?: { from?: string; to?: string; limit?: number },
): Promise<ApiResponse<SlowTest[]>> => {
  const query = buildQueryString(params);

  const response = await fetch(`${API_BASE_URL}/dashboard/slow-tests${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<SlowTest[]>(response);
};


