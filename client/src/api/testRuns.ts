import type { ApiResponse } from '../types/regression';
import type {
  Run,
  RunItem,
  RunHistoryQuery,
  RunItemStatus,
} from '../types/testRun';

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

export const startRun = async (
  regressionSetId: string,
): Promise<ApiResponse<{ runId: string; totalCases: number }>> => {
  const response = await fetch(`${API_BASE_URL}/test-runs/start/${regressionSetId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  return handleResponse<{ runId: string; totalCases: number }>(response);
};

export const getRunById = async (
  runId: string,
): Promise<ApiResponse<{ run: Run; items: RunItem[] }>> => {
  const response = await fetch(`${API_BASE_URL}/test-runs/${runId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const base = await handleResponse<{ run: Run; runItems: RunItem[] }>(response);

  return {
    ...base,
    data: base.data
      ? {
          run: base.data.run,
          items: base.data.runItems,
        }
      : undefined,
  };
};

export const getNextRunItem = async (
  runId: string,
): Promise<ApiResponse<{ done: boolean; item?: RunItem; run: Run }>> => {
  const response = await fetch(`${API_BASE_URL}/test-runs/${runId}/next`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const base = await handleResponse<{ done: boolean; item?: RunItem }>(response);

  const runResponse = await getRunById(runId);

  return {
    success: true,
    message: base.message,
    data: {
      done: base.data?.done ?? false,
      item: base.data?.item,
      run: runResponse.data!.run,
    },
  };
};

export const updateRunItem = async (
  itemId: string,
  payload: { status: RunItemStatus; actualResults?: string },
): Promise<ApiResponse<{ item: RunItem; run: Run }>> => {
  const response = await fetch(`${API_BASE_URL}/test-runs/update-item/${itemId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleResponse<{ item: RunItem; run: Run }>(response);
};

export const cancelRun = async (runId: string): Promise<ApiResponse<Run>> => {
  const response = await fetch(`${API_BASE_URL}/test-runs/cancel/${runId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });

  return handleResponse<Run>(response);
};

export const getRunHistory = async (
  params: RunHistoryQuery = {},
): Promise<ApiResponse<{ runs: Run[]; pagination: { page: number; limit: number; total: number } }>> => {
  const url = new URL(`${API_BASE_URL}/test-runs/history`);

  if (params.page) url.searchParams.set('page', String(params.page));
  if (params.limit) url.searchParams.set('limit', String(params.limit));
  if (params.platform) url.searchParams.set('platform', params.platform);
  if (params.status) url.searchParams.set('status', params.status);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const base = await handleResponse<Run[]>(response);

  return {
    success: true,
    message: base.message,
    data: {
      runs: base.data ?? [],
      pagination: base.pagination ?? { page: params.page ?? 1, limit: params.limit ?? 10, total: 0 },
    },
  };
};


