import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';
import type { ApiResponse } from './apiTypes';
import type { ExamAvailableTest, ExamTest, TestLanguage, TestStatus } from '../types/tests';
import type { CreateQuestionDTO, TestQuestion, UpdateQuestionDTO } from '../types/testQuestions';
import type {
  AttemptDetails,
  StartAttemptResponse,
  StartExamAttemptRequest,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
} from '../types/attempts';

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function unwrapData<T>(r: ApiResponse<T>): T {
  if (!r.success) throw new Error(r.message || 'Request failed');
  return r.data as T;
}

export async function listExamTests(args: {
  businessId: number;
  status?: TestStatus;
  batchId?: number;
}): Promise<ExamTest[]> {
  const path = withQuery(`/api/business/${args.businessId}/exam-tests`, {
    status: args.status === undefined ? undefined : String(args.status),
    batchId: args.batchId === undefined ? undefined : String(args.batchId),
  });
  const res = await apiGet<ApiResponse<ExamTest[]>>(path);
  return unwrapData(res) ?? [];
}

export async function getExamTest(args: { businessId: number; examTestId: string }): Promise<ExamTest> {
  const res = await apiGet<ApiResponse<ExamTest>>(
    `/api/business/${args.businessId}/exam-tests/${encodeURIComponent(args.examTestId)}`
  );
  return unwrapData(res);
}

export type UpdateExamTestDTO = {
  name?: string;
  description?: string;
  subjectId?: number | null;
  startAt?: string;
  deadlineAt?: string;
  durationMinutes?: number;
  defaultMarksPerQuestion?: number;
  negativeMarksPerQuestion?: number;
  status?: TestStatus;
  resultVisibility?: 0 | 1;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  language?: string;
};

export async function updateExamTest(args: {
  businessId: number;
  examTestId: string;
  body: UpdateExamTestDTO;
}): Promise<ExamTest> {
  const res = await apiPut<ApiResponse<ExamTest>>(
    `/api/business/${args.businessId}/exam-tests/${encodeURIComponent(args.examTestId)}`,
    args.body
  );
  return unwrapData(res);
}

export type CreateExamTestDTO = {
  batchId: number;
  subjectId?: number;
  name: string;
  description?: string;
  startAt: string;
  deadlineAt: string;
  durationMinutes: number;
  defaultMarksPerQuestion?: number;
  negativeMarksPerQuestion?: number;
  resultVisibility?: 0 | 1;
  language: TestLanguage;
};

export async function createExamTest(args: { businessId: number; body: CreateExamTestDTO }): Promise<ExamTest> {
  const payload = {
    ...args.body,
    batchId: String(args.body.batchId),
  } as unknown as Record<string, unknown>;
  const res = await apiPost<ApiResponse<ExamTest>>(`/api/business/${args.businessId}/exam-tests`, payload);
  return unwrapData(res);
}

export async function listExamQuestions(args: { businessId: number; examTestId: string }): Promise<TestQuestion[]> {
  const res = await apiGet<ApiResponse<TestQuestion[]>>(
    `/api/business/${args.businessId}/exam-tests/${encodeURIComponent(args.examTestId)}/questions`
  );
  return unwrapData(res) ?? [];
}

export async function createExamQuestion(args: {
  businessId: number;
  examTestId: string;
  body: CreateQuestionDTO;
}): Promise<TestQuestion> {
  const res = await apiPost<ApiResponse<TestQuestion>>(
    `/api/business/${args.businessId}/exam-tests/${encodeURIComponent(args.examTestId)}/questions`,
    args.body
  );
  return unwrapData(res);
}

export async function updateExamQuestion(args: {
  businessId: number;
  questionId: string;
  body: UpdateQuestionDTO;
}): Promise<TestQuestion> {
  const res = await apiPut<ApiResponse<TestQuestion>>(
    `/api/business/${args.businessId}/exam-tests/questions/${encodeURIComponent(args.questionId)}`,
    args.body
  );
  return unwrapData(res);
}

export async function deleteExamQuestion(args: { businessId: number; questionId: string }): Promise<void> {
  await apiDelete<ApiResponse<null>>(
    `/api/business/${args.businessId}/exam-tests/questions/${encodeURIComponent(args.questionId)}`
  );
}

export async function listAvailableExamTests(args: { businessId: number }): Promise<ExamAvailableTest[]> {
  const res = await apiGet<ApiResponse<ExamAvailableTest[]>>(`/api/business/${args.businessId}/exam-tests/available`);
  return unwrapData(res) ?? [];
}

export async function startExamAttempt(args: {
  businessId: number;
  examTestId: string;
  language?: TestLanguage;
}): Promise<StartAttemptResponse<ExamAvailableTest>> {
  const body: StartExamAttemptRequest = { examTestId: args.examTestId, language: args.language ?? 'en' };
  const res = await apiPost<ApiResponse<StartAttemptResponse<ExamAvailableTest>>>(
    `/api/business/${args.businessId}/exam-tests/attempts`,
    body
  );
  return unwrapData(res);
}

export async function getExamAttemptDetails(args: {
  businessId: number;
  attemptId: string;
}): Promise<AttemptDetails<ExamAvailableTest>> {
  const res = await apiGet<ApiResponse<AttemptDetails<ExamAvailableTest>>>(
    `/api/business/${args.businessId}/exam-tests/attempts/${encodeURIComponent(args.attemptId)}`
  );
  return unwrapData(res);
}

export async function submitExamAttempt(args: {
  businessId: number;
  attemptId: string;
  body: SubmitAttemptRequest;
}): Promise<SubmitAttemptResponse> {
  const res = await apiPost<ApiResponse<SubmitAttemptResponse>>(
    `/api/business/${args.businessId}/exam-tests/attempts/${encodeURIComponent(args.attemptId)}/submit`,
    args.body
  );
  return unwrapData(res);
}

export async function exportExamAnalyticsCsv(args: { businessId: number; examTestId: string }): Promise<string> {
  const res = await apiGet<string>(
    `/api/business/${args.businessId}/exam-tests/${encodeURIComponent(args.examTestId)}/analytics/export`
  );
  return res;
}

