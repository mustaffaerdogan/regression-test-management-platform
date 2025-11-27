import type {
  AuthResponse,
  ErrorResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = (await response.json()) as T | ErrorResponse;

  if (!response.ok) {
    const error = data as ErrorResponse;
    throw new Error(error.message || 'An error occurred');
  }

  return data as T;
};

export const login = async (
  credentials: LoginCredentials,
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  return handleResponse<AuthResponse>(response);
};

export const register = async (
  credentials: RegisterCredentials,
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: credentials.name,
      email: credentials.email,
      password: credentials.password,
    }),
  });

  return handleResponse<AuthResponse>(response);
};

export const fetchMe = async (): Promise<{ success: boolean; message: string; user: User }> => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<{ success: boolean; message: string; user: User }>(response);
};

