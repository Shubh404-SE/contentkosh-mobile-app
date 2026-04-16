import { apiGet } from './apiClient';
import type { ApiResponse, UserRole } from './apiTypes';

export type DashboardStatBlock = Record<string, number | undefined>;

export type AdminDashboard = {
  stats?: {
    totalUsers?: number;
    totalTeachers?: number;
    totalStudents?: number;
    totalExams?: number;
    totalCourses?: number;
    totalBatches?: number;
    totalContent?: number;
    activeAnnouncements?: number;
  };
  recentUsers?: Array<{
    id?: number;
    name?: string;
    email?: string;
    role?: Exclude<UserRole, 'SUPERADMIN'>;
    createdAt?: string;
  }>;
  recentAnnouncements?: Array<{
    id?: number;
    heading?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

export type TeacherDashboard = {
  stats?: {
    totalBatches?: number;
    totalStudents?: number;
    totalContent?: number;
    activeAnnouncements?: number;
  };
  myBatches?: Array<{
    id?: number;
    displayName?: string;
    courseName?: string;
    studentCount?: number;
    isActive?: boolean;
  }>;
  recentAnnouncements?: Array<{
    id?: number;
    heading?: string;
    startDate?: string;
    endDate?: string;
  }>;
  recentContent?: Array<{
    id?: number;
    title?: string;
    batchName?: string;
    createdAt?: string;
  }>;
};

export type StudentDashboard = {
  stats?: {
    enrolledBatches?: number;
    totalContent?: number;
    activeAnnouncements?: number;
  };
  myBatches?: Array<{
    id?: number;
    displayName?: string;
    courseName?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }>;
  recentAnnouncements?: Array<{
    id?: number;
    heading?: string;
    content?: string;
    startDate?: string;
    endDate?: string;
  }>;
  recentContent?: Array<{
    id?: number;
    title?: string;
    batchName?: string;
    type?: 'PDF' | 'IMAGE' | 'DOC';
    createdAt?: string;
  }>;
};

export type DashboardResponse = AdminDashboard | TeacherDashboard | StudentDashboard;

export async function getDashboard(): Promise<DashboardResponse> {
  const response = await apiGet<ApiResponse<DashboardResponse>>('/api/dashboard');
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to load dashboard');
  }
  return response.data;
}

