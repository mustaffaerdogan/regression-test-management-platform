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

export const extractJiraDataFromApi = async (
  jiraUrl: string
): Promise<ApiResponse<{ userStory: string; acceptanceCriteria: string[] }>> => {
  const response = await fetch(`${API_BASE_URL}/ai-cases/extract-jira`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ jiraUrl }),
  });

  return handleResponse<{ userStory: string; acceptanceCriteria: string[] }>(response);
};

export const crawlUrl = async (payload: {
  url?: string;
  html?: string;
  cookies?: string;
}): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/ai-cases/crawl`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || 'Sayfa yüklenemedi veya erişim engellendi');
  }
  return response.json();
};

/* ────────────────────────────────────────────────────────────────────────
   Playwright auto-run types & API
   ──────────────────────────────────────────────────────────────────────── */

export interface AIStepResult {
  step: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  durationMs: number;
}

export interface AITestRunResult {
  testCaseId: string;
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  errorMessage?: string;
  stepResults: AIStepResult[];
  screenshotBase64?: string;
  finalUrl?: string;
  durationMs: number;
}

export interface AIRunTestsOutput {
  url: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: { total: number; passed: number; failed: number; skipped: number };
  results: AITestRunResult[];
}

export const runAICasesOnUrl = async (payload: {
  url: string;
  headed?: boolean;
  testCases: Array<{
    id: string;
    title: string;
    preconditions: string[];
    steps: string[];
    expectedResults: string[];
  }>;
}): Promise<AIRunTestsOutput> => {
  const response = await fetch(`${API_BASE_URL}/ai-cases/run-tests`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || 'Test koşumu başarısız oldu');
  }
  return response.json();
};
