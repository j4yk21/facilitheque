import type { QuestionType, Difficulty } from "./question";

export interface DamageConfig {
  base_damage: number;
  type_multipliers: Record<QuestionType, number>;
  difficulty_multipliers: Record<Difficulty, number>;
}

export interface QuestionBattleInfo {
  question_id: string;
  damage: number;
  xp_reward: number;
}

export interface BattleState {
  max_boss_hp: number;
  expected_student_count: number;
  total_questions: number;
  average_damage_per_question: number;
  questions: QuestionBattleInfo[];
  total_possible_damage_per_student: number;
  total_possible_xp_per_student: number;
}

export type BattleLogEvent = "damage" | "join" | "boss_defeated";

export interface BattleLogEntry {
  timestamp: string;
  student_id: string;
  event: BattleLogEvent;
  value?: number;
  message: string;
}
