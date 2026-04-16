export const CONTENT_QUERY_KEYS = {
  batches: () => ['content', 'batches'] as const,
  subjectsUser: () => ['content', 'subjectsUser'] as const,
  batchContents: (batchId: number) => ['content', 'batch', batchId] as const,
};
