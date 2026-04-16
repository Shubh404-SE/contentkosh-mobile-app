import type { SubjectRecord } from '../api/coursesApi';

export type SubjectsByCourseIndex = {
  subjectsByCourseId: Map<number, SubjectRecord[]>;
  subjectIdsByCourseId: Map<number, Set<number>>;
};

export function buildSubjectsByCourseIndex(subjects: SubjectRecord[]): SubjectsByCourseIndex {
  const subjectsByCourseId = new Map<number, SubjectRecord[]>();
  const subjectIdsByCourseId = new Map<number, Set<number>>();

  for (const subject of subjects) {
    const courseId = subject.courseId;
    if (typeof courseId !== 'number') continue;

    const subjectsForCourse = subjectsByCourseId.get(courseId) ?? [];
    subjectsForCourse.push(subject);
    subjectsByCourseId.set(courseId, subjectsForCourse);

    if (typeof subject.id !== 'number') continue;
    const subjectIdsForCourse = subjectIdsByCourseId.get(courseId) ?? new Set<number>();
    subjectIdsForCourse.add(subject.id);
    subjectIdsByCourseId.set(courseId, subjectIdsForCourse);
  }

  return { subjectsByCourseId, subjectIdsByCourseId };
}
