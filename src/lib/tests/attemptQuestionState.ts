import type { AnswerDraft } from './studentAttemptAnswers';
import { isQuestionAnswered } from './studentAttemptAnswers';

export type QuestionUiState =
  | 'active'
  | 'answered'
  | 'markedForReviewUnanswered'
  | 'markedForReviewAnswered'
  | 'visited'
  | 'unvisited';

export function getQuestionUiState(params: {
  qType: number;
  answer: AnswerDraft | undefined;
  visited: boolean;
  markedForReview: boolean;
  isActive: boolean;
}): QuestionUiState {
  if (params.isActive) return 'active';
  if (params.markedForReview) {
    if (isQuestionAnswered(params.qType, params.answer)) {
      return 'markedForReviewAnswered';
    }
    return 'markedForReviewUnanswered';
  }
  if (isQuestionAnswered(params.qType, params.answer)) return 'answered';
  if (params.visited) return 'visited';
  return 'unvisited';
}

/** React Native chip colors (aligned with web Tailwind choices). */
export function getNavigatorChipColors(state: QuestionUiState): {
  border: string;
  background: string;
  text: string;
} {
  switch (state) {
    case 'active':
      return { border: '#3b82f6', background: 'rgba(59,130,246,0.18)', text: '#93c5fd' };
    case 'answered':
      return { border: '#10b981', background: '#059669', text: '#ecfdf5' };
    case 'markedForReviewUnanswered':
      return { border: '#a78bfa', background: 'rgba(139,92,246,0.2)', text: '#ddd6fe' };
    case 'markedForReviewAnswered':
      return { border: '#06b6d4', background: 'rgba(6,182,212,0.2)', text: '#a5f3fc' };
    case 'visited':
      return { border: '#475569', background: '#111a2e', text: '#cbd5e1' };
    case 'unvisited':
    default:
      return { border: '#334155', background: '#0f172a', text: '#64748b' };
  }
}
