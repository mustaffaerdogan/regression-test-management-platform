import type {
  ApiResponse,
  RegressionSet,
  RegressionSetQueryParams,
  CreateRegressionSetPayload,
  UpdateRegressionSetPayload,
  TestCase,
  CreateTestCasePayload,
  UpdateTestCasePayload,
} from '../types/regression';

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

export const getRegressionSets = async (
  params: RegressionSetQueryParams = {},
): Promise<ApiResponse<RegressionSet[]>> => {
  const url = new URL(`${API_BASE_URL}/regression-sets`);

  if (params.search) url.searchParams.set('search', params.search);
  if (params.platform) url.searchParams.set('platform', params.platform);
  if (params.page) url.searchParams.set('page', String(params.page));
  if (params.limit) url.searchParams.set('limit', String(params.limit));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<RegressionSet[]>(response);
};

export const createRegressionSet = async (
  payload: CreateRegressionSetPayload,
): Promise<ApiResponse<RegressionSet>> => {
  const response = await fetch(`${API_BASE_URL}/regression-sets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleResponse<RegressionSet>(response);
};

export const getRegressionSetById = async (id: string): Promise<ApiResponse<RegressionSet>> => {
  const response = await fetch(`${API_BASE_URL}/regression-sets/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<RegressionSet>(response);
};

export const updateRegressionSet = async (
  id: string,
  payload: UpdateRegressionSetPayload,
): Promise<ApiResponse<RegressionSet>> => {
  const response = await fetch(`${API_BASE_URL}/regression-sets/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleResponse<RegressionSet>(response);
};

export const deleteRegressionSet = async (id: string): Promise<ApiResponse<null>> => {
  const response = await fetch(`${API_BASE_URL}/regression-sets/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return handleResponse<null>(response);
};

export const getTestCases = async (regressionSetId: string): Promise<ApiResponse<TestCase[]>> => {
  const response = await fetch(`${API_BASE_URL}/regression-sets/${regressionSetId}/test-cases`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<TestCase[]>(response);
};

export const createTestCase = async (
  regressionSetId: string,
  payload: CreateTestCasePayload,
): Promise<ApiResponse<TestCase>> => {
  const response = await fetch(`${API_BASE_URL}/regression-sets/${regressionSetId}/test-cases`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleResponse<TestCase>(response);
};

export const getTestCaseById = async (caseId: string): Promise<ApiResponse<TestCase>> => {
  const response = await fetch(`${API_BASE_URL}/regression-sets/test-cases/${caseId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<TestCase>(response);
};

export const updateTestCase = async (
  caseId: string,
  payload: UpdateTestCasePayload,
): Promise<ApiResponse<TestCase>> => {
  const response = await fetch(`${API_BASE_URL}/regression-sets/test-cases/${caseId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleResponse<TestCase>(response);
};

export const deleteTestCase = async (caseId: string): Promise<ApiResponse<null>> => {
  const response = await fetch(`${API_BASE_URL}/regression-sets/test-cases/${caseId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return handleResponse<null>(response);
};

export interface ImportCsvResponse {
  importedCount: number;
  skipped: Array<{ row: number; reason: string }>;
}

export const importTestCasesCsv = async (
  regressionSetId: string,
  file: File,
): Promise<ApiResponse<ImportCsvResponse>> => {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token');
  const response = await fetch(
    `${API_BASE_URL}/regression-sets/${regressionSetId}/test-cases/import`,
    {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    },
  );

  const json = (await response.json()) as ApiResponse<ImportCsvResponse>;

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to import CSV');
  }

  return json;
};


