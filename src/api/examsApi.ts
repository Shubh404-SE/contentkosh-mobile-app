import type { ApiResponse } from './apiTypes';
import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';

export type CourseRef = {
  id?: number;
  name?: string;
  createdAt?: string;
};

export type ExamRecord = {
  id?: number;
  name?: string;
  description?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  businessId?: number;
  createdAt?: string;
  updatedAt?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  courses?: CourseRef[];
};

export type ExamWithCourses = ExamRecord;

export type CreateExamBody = {
  name: string;
  description?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  businessId: number;
};

export type UpdateExamBody = {
  name?: string;
  description?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  status?: 'ACTIVE' | 'INACTIVE';
};

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function getBusinessExams(
  businessId: number,
  include?: string
): Promise<ApiResponse<ExamWithCourses[]>> {
  const path = withQuery(`/api/business/${businessId}/exams`, { include });
  return apiGet<ApiResponse<ExamWithCourses[]>>(path);
}

export async function listBusinessExams(businessId: number, include?: string): Promise<ExamRecord[]> {
  const res = await getBusinessExams(businessId, include);
  if (!res.success) throw new Error(res.message || 'Failed to load exams');
  return res.data ?? [];
}

export async function getExam(businessId: number, examId: number, include?: string): Promise<ExamRecord> {
  const path = withQuery(`/api/business/${businessId}/exams/${examId}`, { include });
  const res = await apiGet<ApiResponse<ExamRecord>>(path);
  if (!res.success) throw new Error(res.message || 'Failed to load exam');
  if (!res.data) throw new Error('Exam not found');
  return res.data;
}

export async function createExam(businessId: number, body: CreateExamBody): Promise<ExamRecord> {
  const res = await apiPost<ApiResponse<ExamRecord>>(`/api/business/${businessId}/exams`, body);
  if (!res.success) throw new Error(res.message || 'Failed to create exam');
  if (!res.data) throw new Error('No exam returned');
  return res.data;
}

export async function updateExam(
  businessId: number,
  examId: number,
  body: UpdateExamBody
): Promise<ExamRecord> {
  const res = await apiPut<ApiResponse<ExamRecord>>(
    `/api/business/${businessId}/exams/${examId}`,
    body
  );
  if (!res.success) throw new Error(res.message || 'Failed to update exam');
  if (!res.data) throw new Error('No exam returned');
  return res.data;
}

export async function deleteExam(businessId: number, examId: number): Promise<void> {
  const res = await apiDelete<ApiResponse<unknown>>(`/api/business/${businessId}/exams/${examId}`);
  if (!res.success) throw new Error(res.message || 'Failed to delete exam');
}
