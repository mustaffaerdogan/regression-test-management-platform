import type {
  Team,
  TeamResponse,
  TeamsListResponse,
  CreateTeamPayload,
  UpdateTeamPayload,
} from '../types/team';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'An error occurred');
  }
  return data as T;
};

export const createTeam = async (payload: CreateTeamPayload): Promise<TeamResponse> => {
  const response = await fetch(`${API_BASE_URL}/teams`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<TeamResponse>(response);
};

export const getMyTeams = async (): Promise<TeamsListResponse> => {
  const response = await fetch(`${API_BASE_URL}/teams`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<TeamsListResponse>(response);
};

export const getTeamById = async (id: string): Promise<TeamResponse> => {
  const response = await fetch(`${API_BASE_URL}/teams/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<TeamResponse>(response);
};

export const updateTeam = async (id: string, payload: UpdateTeamPayload): Promise<TeamResponse> => {
  const response = await fetch(`${API_BASE_URL}/teams/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<TeamResponse>(response);
};

export const deleteTeam = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/teams/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ success: boolean; message: string }>(response);
};

export const inviteMember = async (teamId: string, email: string): Promise<TeamResponse> => {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/invite`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email }),
  });
  return handleResponse<TeamResponse>(response);
};

export const joinTeam = async (inviteCode: string): Promise<TeamResponse> => {
  const response = await fetch(`${API_BASE_URL}/teams/join`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ inviteCode }),
  });
  return handleResponse<TeamResponse>(response);
};

export const removeMember = async (teamId: string, userId: string): Promise<TeamResponse> => {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<TeamResponse>(response);
};

export const leaveTeam = async (teamId: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/leave`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ success: boolean; message: string }>(response);
};

export const regenerateInviteCode = async (
  teamId: string,
): Promise<{ success: boolean; message: string; data: { inviteCode: string } }> => {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/regenerate-invite`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ success: boolean; message: string; data: { inviteCode: string } }>(
    response,
  );
};

export type { Team };
