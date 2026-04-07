import type { ApiResponse } from '../types/regression';
import type { AICasesResponse } from '../types/aiCases';

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

export const generateAICases = async (payload: {
  userStory: string;
  acceptanceCriteria: string[];
}): Promise<ApiResponse<AICasesResponse>> => {
  const response = await fetch(`${API_BASE_URL}/ai-cases/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleResponse<AICasesResponse>(response);
};

