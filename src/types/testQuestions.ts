export type QuestionType = 0 | 1 | 2 | 3 | 4; // 0=SINGLE, 1=MULTI, 2=TRUE_FALSE, 3=NUMERICAL, 4=FILL_BLANK

export type TestOption = {
  id?: string;
  text: string;
  mediaUrl?: string;
};

export type TestQuestion = {
  id: string;
  type: QuestionType;
  questionText: string;
  /** Legacy alias; prefer `questionText`. */
  text?: string;
  mediaUrl?: string;
  options?: TestOption[];
  explanation?: string | null;
  correctTextAnswer?: string | null;
  /** Correct option ids (MCQ) as returned by teacher APIs. */
  correctOptionIdsAnswers?: Array<string | number>;
};

export type CreateQuestionDTO = {
  type: QuestionType;
  questionText: string;
  /** HTML string; shown if test allows explanations. */
  explanation?: string;
  mediaUrl?: string;
  options?: TestOption[];
  correctTextAnswer?: string;
  /** Backend accepts ids (edit) or 1-based indices (create/update). */
  correctOptionIdsAnswers?: Array<number | string>;
};

export type UpdateQuestionDTO = CreateQuestionDTO;

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  0: 'Single choice',
  1: 'Multiple choice',
  2: 'True/False',
  3: 'Numerical',
  4: 'Fill blank',
} as const;

