export type TestStatus = 0 | 1; // 0=DRAFT, 1=PUBLISHED

export type TestLanguage = 'en' | 'hi';

export type PracticeTest = {
  id: string;
  businessId: string;
  batchId: string;
  batchName?: string;
  subjectId?: number | null;
  subjectName?: string;
  name: string;
  description?: string;
  status: TestStatus;
  defaultMarksPerQuestion: number;
  showExplanations: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  language: string;
  totalQuestions?: number;
  totalMarks?: number;
  createdAt: string;
  updatedAt: string;
};

export type ExamTest = {
  id: string;
  businessId: string;
  batchId: string;
  batchName?: string;
  subjectId?: number | null;
  subjectName?: string;
  name: string;
  description?: string;
  startAt: string;
  deadlineAt: string;
  durationMinutes: number;
  status: TestStatus;
  defaultMarksPerQuestion?: number;
  negativeMarksPerQuestion?: number;
  resultVisibility?: 0 | 1;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  language: string;
  totalQuestions?: number;
  totalMarks?: number;
  createdAt: string;
  updatedAt: string;
};

export type PracticeAvailableTest = {
  id: string;
  businessId: string;
  batchId: string;
  batchName?: string;
  name: string;
  description?: string;
  status?: TestStatus;
  language: TestLanguage;
  totalQuestions: number;
  totalMarks: number;
  defaultMarksPerQuestion?: number;
  canAttempt?: boolean;
  attemptId?: string;
  attemptCount?: number;
  bestScore?: number;
  lastAttemptAt?: string;
};

export type ExamAvailableTest = {
  id: string;
  businessId: string;
  batchId: string;
  batchName?: string;
  name: string;
  description?: string;
  status?: TestStatus;
  language: TestLanguage;
  startAt: string;
  deadlineAt: string;
  durationMinutes: number;
  totalQuestions?: number;
  totalMarks?: number;
  defaultMarksPerQuestion?: number;
  negativeMarksPerQuestion?: number;
  resultVisibility?: 0 | 1;
  canAttempt?: boolean;
  lockedReason?: string;
  attemptsAllowed?: number;
  attemptsUsed?: number;
  hasAttempt?: boolean;
  attemptId?: string;
  lastAttemptAt?: string;
};

