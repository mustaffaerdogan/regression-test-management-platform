import type { ApiResponse } from '../types/regression';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraStatus {
  id: string;
  name: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: string;
}

export interface JiraPriority {
  id: string;
  name: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
}

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

export const getJiraProjects = async (): Promise<ApiResponse<JiraProject[]>> => {
  const response = await fetch(`${API_BASE_URL}/jira/projects`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<JiraProject[]>(response);
};

export const getJiraBoards = async (projectKey: string): Promise<ApiResponse<JiraBoard[]>> => {
  const response = await fetch(`${API_BASE_URL}/jira/boards?projectKey=${projectKey}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<JiraBoard[]>(response);
};

export const getJiraPriorities = async (): Promise<ApiResponse<JiraPriority[]>> => {
  const response = await fetch(`${API_BASE_URL}/jira/priorities`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<JiraPriority[]>(response);
};

export const getJiraUsers = async (projectKey: string): Promise<ApiResponse<JiraUser[]>> => {
  const response = await fetch(`${API_BASE_URL}/jira/users?projectKey=${projectKey}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<JiraUser[]>(response);
};

export const getJiraStatuses = async (projectKey: string): Promise<ApiResponse<JiraStatus[]>> => {
  const response = await fetch(`${API_BASE_URL}/jira/statuses?projectKey=${projectKey}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<JiraStatus[]>(response);
};

export const getJiraIssueTypes = async (projectKey: string): Promise<ApiResponse<JiraIssueType[]>> => {
  const response = await fetch(`${API_BASE_URL}/jira/issue-types?projectKey=${projectKey}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<JiraIssueType[]>(response);
};

export const getJiraIssues = async (projectKey: string, status?: string): Promise<ApiResponse<any[]>> => {
  const url = new URL(`${API_BASE_URL}/jira/issues`);
  url.searchParams.set('projectKey', projectKey);
  if (status) url.searchParams.set('status', status);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<any[]>(response);
};

export const exportCasesToJira = async (data: any): Promise<ApiResponse<any>> => {
  const response = await fetch(`${API_BASE_URL}/jira/export-cases`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<any>(response);
};

export const importFromJiraComments = async (issueKey: string, setName?: string): Promise<ApiResponse<any>> => {
  const response = await fetch(`${API_BASE_URL}/jira/import-comments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ issueKey, setName }),
  });
  return handleResponse<any>(response);
};

export const fetchJiraTaskDetails = async (url: string): Promise<ApiResponse<any>> => {
  const response = await fetch(`${API_BASE_URL}/jira/fetch-details`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url }),
  });
  return handleResponse<any>(response);
};
