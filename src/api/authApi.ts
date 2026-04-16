import { apiPost } from './apiClient';
import type { ApiResponse, User } from './apiTypes';

export type LoginRequest = {
  email: string;
  password: string;
  businessId?: string;
};

export type SignupRequest = {
  name: string;
  email: string;
  password: string;
  mobile?: string;
};

export async function login(request: LoginRequest): Promise<User> {
  const response = await apiPost<ApiResponse<User>>('/api/auth/login', request);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Login failed');
  }
  return response.data;
}

export async function signup(request: SignupRequest): Promise<User> {
  const response = await apiPost<ApiResponse<User>>('/api/auth/signup', request);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Signup failed');
  }
  return response.data;
}

export async function refresh(): Promise<void> {
  await apiPost('/api/auth/refresh');
}

export async function logout(): Promise<void> {
  await apiPost('/api/auth/logout');
}

