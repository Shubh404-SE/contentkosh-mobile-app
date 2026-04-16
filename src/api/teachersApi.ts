import { apiGet, apiPost, apiPut } from './apiClient';
import type { ApiResponse } from './apiTypes';
import type { TeacherWithUser } from '../types/teacher';

export async function getTeacherByUserId(userId: number): Promise<TeacherWithUser> {
  const response = await apiGet<ApiResponse<TeacherWithUser>>(`/api/teachers/user/${userId}`);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to load teacher profile');
  }
  return response.data;
}

export type CreateTeacherProfileRequest = {
  businessId: number;
  userId: number;
  professional: {
    qualification: string;
    experienceYears: number;
    designation: string;
    bio?: string;
    languages?: string[];
  };
  personal?: {
    gender?: 'male' | 'female' | 'other';
    dob?: string;
    address?: string;
  };
};

export async function createTeacherProfile(body: CreateTeacherProfileRequest): Promise<TeacherWithUser> {
  const response = await apiPost<ApiResponse<TeacherWithUser>>('/api/teachers/profile', body);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to create teacher profile');
  }
  return response.data;
}

export type UpdateTeacherProfileRequest = {
  teacherId: number;
  professional: {
    qualification?: string;
    experienceYears?: number;
    designation?: string;
    bio?: string;
    languages?: string[];
  };
  personal?: {
    gender?: 'male' | 'female' | 'other';
    dob?: string;
    address?: string;
  };
};

export async function updateTeacherProfile(body: UpdateTeacherProfileRequest): Promise<TeacherWithUser> {
  const response = await apiPut<ApiResponse<TeacherWithUser>>(`/api/teachers/${body.teacherId}`, {
    professional: body.professional,
    personal: body.personal,
  });
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to update teacher profile');
  }
  return response.data;
}

