/** Question row passed into the student attempt UI (from start-attempt API). */
export type AttemptQuestion = {
  id: string;
  type: number;
  questionText: string;
  options?: Array<{ id?: string; text: string }>;
};
