import type { UserRole } from '../api/apiTypes';

export const BATCHES_STACK = {
  HUB: 'BatchesHub',
  DETAIL: 'BatchDetail',
  FORM: 'BatchForm',
} as const;

export const COURSES_STACK = {
  LIST: 'CourseList',
  SUBJECTS: 'CourseSubjects',
  COURSE_FORM: 'CourseForm',
  SUBJECT_FORM: 'SubjectForm',
} as const;

export const EXAMS_STACK = {
  LIST: 'ExamList',
  FORM: 'ExamForm',
} as const;

export const CONTENT_STACK = {
  LIBRARY: 'ContentLibrary',
  UPLOAD: 'ContentUpload',
  EDIT: 'ContentEdit',
} as const;

export const STUDENTS_STACK = {
  LIST: 'StudentsList',
  DETAIL: 'StudentDetail',
} as const;

export const ADMIN_USERS_STACK = {
  LIST: 'AdminUsersList',
  TEACHER_DETAIL: 'TeacherProfile',
} as const;

export const TESTS_STACK = {
  HUB: 'TestsHub',
  CREATE_TEST: 'CreateTest',
  PRACTICE_DETAIL: 'PracticeTestDetail',
  EXAM_DETAIL: 'ExamTestDetail',
  PRACTICE_QUESTION_EDITOR: 'PracticeQuestionEditor',
  EXAM_QUESTION_EDITOR: 'ExamQuestionEditor',
  PRACTICE_ATTEMPT: 'PracticeAttempt',
  EXAM_ATTEMPT: 'ExamAttempt',
  TEST_RESULT: 'TestResult',
} as const;

export const ROUTES = {
  AUTH: {
    LOGIN: 'Auth.Login',
    REGISTER: 'Auth.Register',
  },
  APP: {
    DRAWER_TABS: 'App.Tabs',
    FORBIDDEN: 'App.Forbidden',
  },
  TABS: {
    HOME: 'Tabs.Home',
    BATCHES: 'Tabs.Batches',
    TESTS: 'Tabs.Tests',
    CONTENT: 'Tabs.Content',
    ANNOUNCEMENTS: 'Tabs.Announcements',
    EXAMS: 'Tabs.Exams',
    COURSES: 'Tabs.Courses',
    ADMIN_USERS: 'Tabs.AdminUsers',
    SETTINGS: 'Tabs.Settings',
    MORE: 'Tabs.More',
  },
} as const;

export type DrawerItemConfig = {
  label: string;
  tabRouteName: (typeof ROUTES.TABS)[keyof typeof ROUTES.TABS];
  roles?: readonly UserRole[];
  permissions?: readonly string[];
};

// Backend currently seeds a small set. Expand as backend adds more.
export const PERMISSION_CODES = {
  ANNOUNCEMENT_VIEW: 'ANNOUNCEMENT_VIEW',
  CONTENT_VIEW: 'CONTENT_VIEW',
} as const;

export const DRAWER_ITEMS: readonly DrawerItemConfig[] = [
  {
    label: 'Announcements',
    tabRouteName: ROUTES.TABS.ANNOUNCEMENTS,
    roles: ['ADMIN', 'TEACHER', 'STUDENT'],
    permissions: [PERMISSION_CODES.ANNOUNCEMENT_VIEW],
  },
  {
    label: 'Exams',
    tabRouteName: ROUTES.TABS.EXAMS,
    roles: ['ADMIN', 'SUPERADMIN'],
  },
  {
    label: 'Courses / Subjects',
    tabRouteName: ROUTES.TABS.COURSES,
    roles: ['ADMIN', 'SUPERADMIN'],
  },
  {
    label: 'Admin Users',
    tabRouteName: ROUTES.TABS.ADMIN_USERS,
    roles: ['ADMIN', 'SUPERADMIN'],
  },
  {
    label: 'Settings',
    tabRouteName: ROUTES.TABS.SETTINGS,
  },
] as const;

