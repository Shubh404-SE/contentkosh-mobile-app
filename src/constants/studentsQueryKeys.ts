export const STUDENTS_QUERY_KEYS = {
  students: (businessId: number) => ['students', 'business', businessId] as const,
  batchesWithUsers: () => ['batches', 'all', 'withUsers'] as const,
} as const;

