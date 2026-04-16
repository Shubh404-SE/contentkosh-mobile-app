import type { QuestionType } from '../../types/testQuestions';

export function isMcqQuestionType(t: QuestionType): boolean {
  return t === 0 || t === 1;
}
