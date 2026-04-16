import type { CourseRecord } from '../api/coursesApi';

/**
 * Mirrors web `calculateCourseStatus`: date window decides ACTIVE/INACTIVE when both provided.
 */
export function resolveDisplayedCourseStatus(course: CourseRecord): 'ACTIVE' | 'INACTIVE' {
  if (course.status === 'INACTIVE') return 'INACTIVE';
  if (!course.startDate || !course.endDate) return 'ACTIVE';
  const now = new Date();
  const start = new Date(course.startDate);
  const end = new Date(course.endDate);
  if (now > end || now < start) return 'INACTIVE';
  return 'ACTIVE';
}
