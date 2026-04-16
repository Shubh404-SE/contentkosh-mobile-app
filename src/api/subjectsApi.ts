import type { ApiResponse } from './apiTypes';
import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';
import type { CourseStatus, SubjectRecord } from './coursesApi';

export type { SubjectRecord } from './coursesApi';

export type CreateSubjectBody = {
  name: string;
  description?: string;
  status?: CourseStatus;
  courseId: number;
};

export type UpdateSubjectBody = {
  name?: string;
  description?: string;
  status?: CourseStatus;
};

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function listSubjectsForCourse(
  examId: number,
  courseId: number,
  active?: boolean
): Promise<SubjectRecord[]> {
  const path = withQuery(`/api/exams/${examId}/courses/${courseId}/subjects`, {
    active: active === undefined ? undefined : String(active),
  });
  const res = await apiGet<ApiResponse<SubjectRecord[]>>(path);
  if (!res.success) throw new Error(res.message || 'Failed to load subjects');
  return res.data ?? [];
}

export async function getSubject(
  examId: number,
  courseId: number,
  subjectId: number
): Promise<SubjectRecord> {
  const res = await apiGet<ApiResponse<SubjectRecord>>(
    `/api/exams/${examId}/courses/${courseId}/subjects/${subjectId}`
  );
  if (!res.success) throw new Error(res.message || 'Failed to load subject');
  if (!res.data) throw new Error('Subject not found');
  return res.data;
}

export async function createSubject(
  examId: number,
  courseId: number,
  body: CreateSubjectBody
): Promise<SubjectRecord> {
  const res = await apiPost<ApiResponse<SubjectRecord>>(
    `/api/exams/${examId}/courses/${courseId}/subjects`,
    body
  );
  if (!res.success) throw new Error(res.message || 'Failed to create subject');
  if (!res.data) throw new Error('No subject returned');
  return res.data;
}

export async function updateSubject(
  examId: number,
  courseId: number,
  subjectId: number,
  body: UpdateSubjectBody
): Promise<SubjectRecord> {
  const res = await apiPut<ApiResponse<SubjectRecord>>(
    `/api/exams/${examId}/courses/${courseId}/subjects/${subjectId}`,
    body
  );
  if (!res.success) throw new Error(res.message || 'Failed to update subject');
  if (!res.data) throw new Error('No subject returned');
  return res.data;
}

export async function deleteSubject(examId: number, courseId: number, subjectId: number): Promise<void> {
  const res = await apiDelete<ApiResponse<unknown>>(
    `/api/exams/${examId}/courses/${courseId}/subjects/${subjectId}`
  );
  if (!res.success) throw new Error(res.message || 'Failed to delete subject');
}

/** Role-aware subjects for current user (same as web contents page). */
export async function listSubjectsForCurrentUser(): Promise<SubjectRecord[]> {
  const res = await apiGet<ApiResponse<SubjectRecord[]>>('/api/business/subjects/all');
  if (!res.success) throw new Error(res.message || 'Failed to load subjects');
  return res.data ?? [];
}
