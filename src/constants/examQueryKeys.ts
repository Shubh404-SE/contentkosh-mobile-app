export const EXAM_QUERY_KEYS = {
  list: (businessId: number) => ['exams', 'list', businessId] as const,
  detail: (businessId: number, examId: number) => ['exams', 'detail', businessId, examId] as const,
};
