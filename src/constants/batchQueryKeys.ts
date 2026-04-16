export const BATCH_QUERY_KEYS = {
  allWithCourse: ['batches', 'all', 'course'] as const,
  byCourse: (courseId: number, include?: string) => ['batches', 'course', courseId, include ?? ''] as const,
  detail: (batchId: number) => ['batches', 'detail', batchId] as const,
  members: (batchId: number, role: string) => ['batches', batchId, 'users', role] as const,
  courses: (businessId: number) => ['batches', 'courses', businessId] as const,
} as const;
