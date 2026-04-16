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
    DRAWER_ANNOUNCEMENTS: 'App.Announcements',
    DRAWER_EXAMS: 'App.Exams',
    DRAWER_COURSES: 'App.Courses',
    DRAWER_STUDENTS: 'App.Students',
    DRAWER_ADMIN_USERS: 'App.AdminUsers',
    DRAWER_SETTINGS: 'App.Settings',
    FORBIDDEN: 'App.Forbidden',
  },
  TABS: {
    HOME: 'Tabs.Home',
    BATCHES: 'Tabs.Batches',
    TESTS: 'Tabs.Tests',
    CONTENT: 'Tabs.Content',
    ANNOUNCEMENTS: 'Tabs.Announcements',
    MORE: 'Tabs.More',
  },
} as const;

export type DrawerItemConfig = {
  label: string;
  routeName: (typeof ROUTES.APP)[keyof typeof ROUTES.APP];
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
    routeName: ROUTES.APP.DRAWER_ANNOUNCEMENTS,
    roles: ['ADMIN', 'TEACHER', 'STUDENT'],
    permissions: [PERMISSION_CODES.ANNOUNCEMENT_VIEW],
  },
  {
    label: 'Exams',
    routeName: ROUTES.APP.DRAWER_EXAMS,
    roles: ['ADMIN', 'SUPERADMIN'],
  },
  {
    label: 'Courses / Subjects',
    routeName: ROUTES.APP.DRAWER_COURSES,
    roles: ['ADMIN', 'SUPERADMIN'],
  },
  {
    label: 'Students',
    routeName: ROUTES.APP.DRAWER_STUDENTS,
    roles: ['ADMIN', 'TEACHER'],
  },
  {
    label: 'Admin Users',
    routeName: ROUTES.APP.DRAWER_ADMIN_USERS,
    roles: ['ADMIN', 'SUPERADMIN'],
  },
  {
    label: 'Settings',
    routeName: ROUTES.APP.DRAWER_SETTINGS,
  },
] as const;

