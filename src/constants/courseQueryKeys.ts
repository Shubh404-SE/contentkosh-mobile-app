export const COURSE_QUERY_KEYS = {
  exams: (businessId: number) => ['courses', 'exams', businessId] as const,
  courses: (examId: number) => ['courses', 'list', examId] as const,
  courseDetail: (examId: number, courseId: number) =>
    ['courses', 'detail', examId, courseId] as const,
  subjects: (examId: number, courseId: number) =>
    ['courses', 'subjects', examId, courseId] as const,
};
