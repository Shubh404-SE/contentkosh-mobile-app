import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';
import type { ApiResponse } from './apiTypes';
import type { PracticeAvailableTest, PracticeTest, TestLanguage, TestStatus } from '../types/tests';
import type { CreateQuestionDTO, TestQuestion, UpdateQuestionDTO } from '../types/testQuestions';
import type {
  AttemptDetails,
  StartAttemptResponse,
  StartPracticeAttemptRequest,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
} from '../types/attempts';
import type { TestAttempt } from '../types/attempts';

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

export async function listPracticeTests(args: {
  businessId: number;
  status?: TestStatus;
  batchId?: number;
}): Promise<PracticeTest[]> {
  const path = withQuery(`/api/business/${args.businessId}/practice-tests`, {
    status: args.status === undefined ? undefined : String(args.status),
    batchId: args.batchId === undefined ? undefined : String(args.batchId),
  });
  const res = await apiGet<ApiResponse<PracticeTest[]>>(path);
  return unwrapData(res) ?? [];
}

export async function getPracticeTest(args: { businessId: number; practiceTestId: string }): Promise<PracticeTest> {
  const res = await apiGet<ApiResponse<PracticeTest>>(
    `/api/business/${args.businessId}/practice-tests/${encodeURIComponent(args.practiceTestId)}`
  );
  return unwrapData(res);
}

export type UpdatePracticeTestDTO = {
  name?: string;
  description?: string;
  subjectId?: number | null;
  defaultMarksPerQuestion?: number;
  showExplanations?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  status?: TestStatus;
  language?: string;
};

export async function updatePracticeTest(args: {
  businessId: number;
  practiceTestId: string;
  body: UpdatePracticeTestDTO;
}): Promise<PracticeTest> {
  const res = await apiPut<ApiResponse<PracticeTest>>(
    `/api/business/${args.businessId}/practice-tests/${encodeURIComponent(args.practiceTestId)}`,
    args.body
  );
  return unwrapData(res);
}

export type CreatePracticeTestDTO = {
  batchId: number;
  subjectId?: number;
  name: string;
  description?: string;
  language: TestLanguage;
};

export async function createPracticeTest(args: { businessId: number; body: CreatePracticeTestDTO }): Promise<PracticeTest> {
  const payload = {
    ...args.body,
    batchId: String(args.body.batchId),
  } as unknown as Record<string, unknown>;
  const res = await apiPost<ApiResponse<PracticeTest>>(`/api/business/${args.businessId}/practice-tests`, payload);
  return unwrapData(res);
}

export async function listPracticeQuestions(args: {
  businessId: number;
  practiceTestId: string;
}): Promise<TestQuestion[]> {
  const res = await apiGet<ApiResponse<TestQuestion[]>>(
    `/api/business/${args.businessId}/practice-tests/${encodeURIComponent(args.practiceTestId)}/questions`
  );
  return unwrapData(res) ?? [];
}

export async function createPracticeQuestion(args: {
  businessId: number;
  practiceTestId: string;
  body: CreateQuestionDTO;
}): Promise<TestQuestion> {
  const res = await apiPost<ApiResponse<TestQuestion>>(
    `/api/business/${args.businessId}/practice-tests/${encodeURIComponent(args.practiceTestId)}/questions`,
    args.body
  );
  return unwrapData(res);
}

export async function updatePracticeQuestion(args: {
  businessId: number;
  questionId: string;
  body: UpdateQuestionDTO;
}): Promise<TestQuestion> {
  const res = await apiPut<ApiResponse<TestQuestion>>(
    `/api/business/${args.businessId}/practice-tests/questions/${encodeURIComponent(args.questionId)}`,
    args.body
  );
  return unwrapData(res);
}

export async function deletePracticeQuestion(args: { businessId: number; questionId: string }): Promise<void> {
  await apiDelete<ApiResponse<null>>(
    `/api/business/${args.businessId}/practice-tests/questions/${encodeURIComponent(args.questionId)}`
  );
}

export async function listAvailablePracticeTests(args: { businessId: number }): Promise<PracticeAvailableTest[]> {
  const res = await apiGet<ApiResponse<PracticeAvailableTest[]>>(
    `/api/business/${args.businessId}/practice-tests/available`
  );
  return unwrapData(res) ?? [];
}

export async function startPracticeAttempt(args: {
  businessId: number;
  practiceTestId: string;
  language?: TestLanguage;
}): Promise<StartAttemptResponse<PracticeAvailableTest>> {
  const body: StartPracticeAttemptRequest = { practiceTestId: args.practiceTestId, language: args.language ?? 'en' };
  const res = await apiPost<ApiResponse<StartAttemptResponse<PracticeAvailableTest>>>(
    `/api/business/${args.businessId}/practice-tests/attempts`,
    body
  );
  return unwrapData(res);
}

export async function getPracticeAttemptDetails(args: {
  businessId: number;
  attemptId: string;
}): Promise<AttemptDetails<PracticeAvailableTest>> {
  const res = await apiGet<ApiResponse<AttemptDetails<PracticeAvailableTest>>>(
    `/api/business/${args.businessId}/practice-tests/attempts/${encodeURIComponent(args.attemptId)}`
  );
  return unwrapData(res);
}

export async function submitPracticeAttempt(args: {
  businessId: number;
  attemptId: string;
  body: SubmitAttemptRequest;
}): Promise<SubmitAttemptResponse> {
  const res = await apiPost<ApiResponse<SubmitAttemptResponse>>(
    `/api/business/${args.businessId}/practice-tests/attempts/${encodeURIComponent(args.attemptId)}/submit`,
    args.body
  );
  return unwrapData(res);
}

export async function exportPracticeAnalyticsCsv(args: {
  businessId: number;
  practiceTestId: string;
}): Promise<string> {
  const res = await apiGet<string>(
    `/api/business/${args.businessId}/practice-tests/${encodeURIComponent(args.practiceTestId)}/analytics/export`
  );
  return res;
}

