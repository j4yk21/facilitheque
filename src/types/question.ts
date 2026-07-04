export type QuestionType =
  | "multiple_choice"
  | "short_answer"
  | "true_false"
  | "ordering"
  | "matching"
  | "fill_blank";

export type Difficulty = 1 | 2 | 3;

export interface MatchingPair {
  term: string;
  definition: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  difficulty: Difficulty;
  options?: string[];
  correct_answer: string;
  time_limit_seconds?: number;
  /** Items for ordering questions (stored in correct order) */
  items?: string[];
  /** Term-definition pairs for matching questions */
  pairs?: MatchingPair[];
  /**
   * Alternative accepted answers for text questions (short_answer,
   * fill_blank). Checked server-side with accent normalization.
   */
  accepted_answers?: string[];
}
