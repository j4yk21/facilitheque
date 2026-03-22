export type QuestionType = "multiple_choice" | "short_answer";
export type Difficulty = 1 | 2 | 3;

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  difficulty: Difficulty;
  options?: string[];
  correct_answer: string;
  time_limit_seconds?: number;
}
