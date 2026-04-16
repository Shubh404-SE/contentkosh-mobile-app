import type { ApiResponse } from './apiTypes';
import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';

export type CourseStatus = 'ACTIVE' | 'INACTIVE';

export type SubjectRecord = {
  id?: number;
  name?: string;
  description?: string;
  status?: CourseStatus;
  courseId?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CourseRecord = {
  id?: number;
  name?: string;
  description?: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  status?: CourseStatus;
  examId?: number;
  createdAt?: string;
  updatedAt?: string;
  subjects?: SubjectRecord[];
};

export type CreateCourseBody = {
  name: string;
  description?: string;
  duration?: string;
  status?: CourseStatus;
  startDate?: string;
  endDate?: string;
  examId: number;
};

export type UpdateCourseBody = {
  name?: string;
  description?: string;
  duration?: string;
  status?: CourseStatus;
  startDate?: string;
  endDate?: string;
};

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function listCoursesForExam(
  examId: number,
  opts?: { include?: string; active?: boolean }
): Promise<CourseRecord[]> {
  const path = withQuery(`/api/exams/${examId}/courses`, {
    include: opts?.include,
    active: opts?.active === undefined ? undefined : String(opts.active),
  });
  const res = await apiGet<ApiResponse<CourseRecord[]>>(path);
  if (!res.success) throw new Error(res.message || 'Failed to load courses');
  return res.data ?? [];
}

export async function getCourse(examId: number, courseId: number, include?: string): Promise<CourseRecord> {
  const path = withQuery(`/api/exams/${examId}/courses/${courseId}`, { include });
  const res = await apiGet<ApiResponse<CourseRecord>>(path);
  if (!res.success) throw new Error(res.message || 'Failed to load course');
  if (!res.data) throw new Error('Course not found');
  return res.data;
}

export async function createCourse(examId: number, body: CreateCourseBody): Promise<CourseRecord> {
  const res = await apiPost<ApiResponse<CourseRecord>>(`/api/exams/${examId}/courses`, body);
  if (!res.success) throw new Error(res.message || 'Failed to create course');
  if (!res.data) throw new Error('No course returned');
  return res.data;
}

export async function updateCourse(
  examId: number,
  courseId: number,
  body: UpdateCourseBody
): Promise<CourseRecord> {
  const res = await apiPut<ApiResponse<CourseRecord>>(`/api/exams/${examId}/courses/${courseId}`, body);
  if (!res.success) throw new Error(res.message || 'Failed to update course');
  if (!res.data) throw new Error('No course returned');
  return res.data;
}

export async function deleteCourse(examId: number, courseId: number): Promise<void> {
  const res = await apiDelete<ApiResponse<unknown>>(`/api/exams/${examId}/courses/${courseId}`);
  if (!res.success) throw new Error(res.message || 'Failed to delete course');
}
