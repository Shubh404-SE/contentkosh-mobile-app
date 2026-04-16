import type { ApiResponse } from './apiTypes';
import type { BatchRecord, BatchUserRecord } from '../types/batch';
import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';

function unwrapData<T>(r: ApiResponse<T>): T {
  if (!r.success) {
    throw new Error(r.message || 'Request failed');
  }
  return r.data as T;
}

export type BatchListRow = {
  id?: number;
  displayName?: string;
  codeName?: string;
};

export type CreateBatchBody = {
  codeName: string;
  displayName: string;
  startDate: string;
  endDate: string;
  courseId: number;
  isActive?: boolean;
};

export type UpdateBatchBody = {
  codeName?: string;
  displayName?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
};

export type AddUserToBatchBody = {
  userId: number;
  batchId: number;
};

export type RemoveUserFromBatchBody = {
  userId: number;
  batchId: number;
};

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function getAllBatches(include?: string): Promise<BatchRecord[]> {
  const path = withQuery('/api/batches/all', { include });
  const res = await apiGet<ApiResponse<BatchRecord[]>>(path);
  return unwrapData(res) ?? [];
}

export async function getBatchesByCourse(
  courseId: number,
  opts?: { active?: boolean; include?: string }
): Promise<BatchRecord[]> {
  const path = withQuery(`/api/batches/course/${courseId}`, {
    active: opts?.active === undefined ? undefined : String(opts.active),
    include: opts?.include,
  });
  const res = await apiGet<ApiResponse<BatchRecord[]>>(path);
  return unwrapData(res) ?? [];
}

export async function getBatchById(batchId: number): Promise<BatchRecord> {
  const res = await apiGet<ApiResponse<BatchRecord>>(`/api/batches/${batchId}`);
  return unwrapData(res);
}

export async function createBatch(body: CreateBatchBody): Promise<BatchRecord> {
  const res = await apiPost<ApiResponse<BatchRecord>>('/api/batches', body);
  return unwrapData(res);
}

export async function updateBatch(batchId: number, body: UpdateBatchBody): Promise<BatchRecord> {
  const res = await apiPut<ApiResponse<BatchRecord>>(`/api/batches/${batchId}`, body);
  return unwrapData(res);
}

export async function deleteBatch(batchId: number): Promise<void> {
  await apiDelete<ApiResponse<null>>(`/api/batches/${batchId}`);
}

export async function getBatchUsers(
  batchId: number,
  role?: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'USER'
): Promise<BatchUserRecord[]> {
  const path = withQuery(`/api/batches/${batchId}/users`, { role });
  const res = await apiGet<ApiResponse<BatchUserRecord[]>>(path);
  return unwrapData(res) ?? [];
}

export async function removeUserFromBatch(body: RemoveUserFromBatchBody): Promise<void> {
  await apiPost<ApiResponse<null>>('/api/batches/remove-user', body);
}

export async function addUserToBatch(body: AddUserToBatchBody): Promise<void> {
  await apiPost<ApiResponse<unknown>>('/api/batches/add-user', body);
}
