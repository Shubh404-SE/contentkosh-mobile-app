import type { ApiResponse } from './apiTypes';
import { apiDelete, apiFetchForm, apiGetBinary, apiGet, apiPut } from './apiClient';

export type ContentType = 'PDF' | 'IMAGE' | 'DOC';

export type ContentStatus = 'ACTIVE' | 'INACTIVE';

export type ContentRecord = {
  id?: number;
  batchId: number;
  subjectId?: number;
  title: string;
  type: ContentType;
  filePath: string;
  fileSize: number;
  status?: ContentStatus;
  subject?: { id?: number; name?: string };
  batch?: { id?: number; codeName?: string; displayName?: string };
  createdAt?: string;
  updatedAt?: string;
};

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function listBatchContents(
  batchId: number,
  opts?: { type?: ContentType; status?: ContentStatus; search?: string }
): Promise<ContentRecord[]> {
  const path = withQuery(`/api/batches/${batchId}/contents`, {
    type: opts?.type,
    status: opts?.status,
    search: opts?.search?.trim() ? opts.search.trim() : undefined,
  });
  const res = await apiGet<ApiResponse<ContentRecord[]>>(path);
  if (!res.success) throw new Error(res.message || 'Failed to load contents');
  return res.data ?? [];
}

export async function getContent(contentId: number): Promise<ContentRecord> {
  const res = await apiGet<ApiResponse<ContentRecord>>(`/api/contents/${contentId}`);
  if (!res.success) throw new Error(res.message || 'Failed to load content');
  if (!res.data) throw new Error('Content not found');
  return res.data;
}

export async function fetchContentFileArrayBuffer(contentId: number): Promise<ArrayBuffer> {
  return apiGetBinary(`/api/contents/${contentId}/file`);
}

export type UploadContentBody = {
  batchId: number;
  subjectId: number;
  title: string;
  status?: ContentStatus;
  file: { uri: string; name: string; mimeType?: string };
};

export async function uploadBatchContent(body: UploadContentBody): Promise<ContentRecord> {
  const form = new FormData();
  form.append('title', body.title);
  form.append('subjectId', String(body.subjectId));
  if (body.status) form.append('status', body.status);
  // RN FormData file shape
  form.append(
    'file',
    {
      uri: body.file.uri,
      name: body.file.name,
      type: body.file.mimeType || 'application/octet-stream',
    } as unknown as Blob
  );

  const res = await apiFetchForm<ApiResponse<ContentRecord>>(`/api/batches/${body.batchId}/contents`, {
    method: 'POST',
    form,
  });

  if (!res.success) throw new Error(res.message || 'Failed to upload');
  if (!res.data) throw new Error('No content returned');
  return res.data;
}

export type UpdateContentBody = {
  title?: string;
  status?: ContentStatus;
  subjectId: number;
};

export async function updateContent(contentId: number, body: UpdateContentBody): Promise<ContentRecord> {
  const res = await apiPut<ApiResponse<ContentRecord>>(`/api/contents/${contentId}`, body);
  if (!res.success) throw new Error(res.message || 'Failed to update content');
  if (!res.data) throw new Error('No content returned');
  return res.data;
}

export async function deleteContent(contentId: number): Promise<void> {
  const res = await apiDelete<ApiResponse<null>>(`/api/contents/${contentId}`);
  if (!res.success) throw new Error(res.message || 'Failed to delete content');
}
