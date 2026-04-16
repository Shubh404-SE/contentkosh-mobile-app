import type { TestLanguage } from './tests';
import type { TestQuestion } from './testQuestions';

export type AttemptStatus = 0 | 1 | 2 | 3; // 0=IN_PROGRESS, 1=SUBMITTED, 2=AUTO_SUBMITTED, 3=EXPIRED

export type TestAttempt = {
  id: string;
  practiceTestId?: string;
  examTestId?: string;
  language: TestLanguage;
  status: AttemptStatus;
  startedAt: string;
  submittedAt?: string;
  score?: number;
  totalScore?: number;
  percentage?: number;
};

export type TestAnswerSubmission = {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
};

export type StartPracticeAttemptRequest = {
  practiceTestId: string;
  language: TestLanguage;
};

export type StartExamAttemptRequest = {
  examTestId: string;
  language: TestLanguage;
};

export type StartAttemptResponse<TTest> = {
  attemptId: string;
  test: TTest;
  questions: TestQuestion[];
  startedAt: string;
};

export type SubmitAttemptRequest = {
  answers: TestAnswerSubmission[];
};

export type SubmitAttemptResponse =
  | {
      attemptId: string;
      status: AttemptStatus;
      submittedAt: string;
    }
  | {
      attemptId: string;
      status: AttemptStatus;
      score: number;
      totalScore: number;
      percentage: number;
      submittedAt?: string;
      result?: { questions?: Array<{ questionId: string; obtainedMarks?: number | null; isCorrect?: boolean | null }> } | null;
    };

export type StudentAttemptQuestion = {
  question: TestQuestion;
  studentAnswer?:
    | {
        selectedOptionIds?: string[];
        textAnswer?: string | null;
        isCorrect?: boolean | null;
        obtainedMarks?: number | null;
      }
    | null;
  correctAnswer?:
    | {
        correctOptionIds?: string[];
        correctTextAnswer?: string | null;
      }
    | null;
};

export type AttemptDetails<TTest> = {
  attempt: TestAttempt;
  test: TTest;
  questions: StudentAttemptQuestion[];
};

