import type { TestAnswerSubmission } from '../../types/attempts';

export type AnswerDraft = {
  selectedOptionIds?: string[];
  textAnswer?: string;
};

/** Mirrors web `questionType` in testUiMappers. */
export const QUESTION_TYPE = {
  SINGLE: 0,
  MULTI: 1,
  TRUE_FALSE: 2,
  NUMERICAL: 3,
  FILL_BLANK: 4,
} as const;

export function isQuestionAnswered(qType: number, draft: AnswerDraft | undefined): boolean {
  if (!draft) return false;
  if (qType === QUESTION_TYPE.SINGLE || qType === QUESTION_TYPE.MULTI) {
    return (draft.selectedOptionIds?.length ?? 0) > 0;
  }
  return Boolean(draft.textAnswer?.trim());
}

export function countUnanswered(
  questions: Array<{ id: string; type: number }>,
  answers: Record<string, AnswerDraft>,
): number {
  return questions.filter((q) => !isQuestionAnswered(q.type, answers[q.id])).length;
}

/** Same shape as web `buildSubmitPayload` — one row per question. */
export function buildSubmitPayloadFromAttemptQuestions(
  questions: Array<{ id: string; type: number }>,
  answers: Record<string, AnswerDraft>,
): TestAnswerSubmission[] {
  return questions.map((question) => {
    const qid = question.id;
    const a = answers[qid];
    const out: TestAnswerSubmission = { questionId: qid };
    if (a?.selectedOptionIds?.length) out.selectedOptionIds = [...a.selectedOptionIds];
    if (a?.textAnswer != null && String(a.textAnswer).trim() !== '') {
      out.textAnswer = String(a.textAnswer).trim();
    }
    return out;
  });
}
