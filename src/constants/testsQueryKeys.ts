export const TESTS_QUERY_KEYS = {
  practiceList: (businessId: number, args: { status?: 0 | 1; batchId?: number }) =>
    ['tests', 'practice', 'list', businessId, args.status ?? 'all', args.batchId ?? 'all'] as const,
  examList: (businessId: number, args: { status?: 0 | 1; batchId?: number }) =>
    ['tests', 'exam', 'list', businessId, args.status ?? 'all', args.batchId ?? 'all'] as const,
} as const;

