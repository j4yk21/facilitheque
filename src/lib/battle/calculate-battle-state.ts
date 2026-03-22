import type { Question } from "@/types/question";
import type { BattleState, DamageConfig, QuestionBattleInfo } from "@/types/battle";
import { DEFAULT_DAMAGE_CONFIG, XP_PER_DAMAGE_UNIT } from "./damage-config";

/**
 * Calculates the damage a single correct answer deals for a given question.
 * Formula: floor(base_damage * type_multiplier * difficulty_multiplier)
 */
export function calculateQuestionDamage(
  question: Question,
  config: DamageConfig = DEFAULT_DAMAGE_CONFIG
): number {
  const typeMultiplier = config.type_multipliers[question.type] ?? 1.0;
  const difficultyMultiplier =
    config.difficulty_multipliers[question.difficulty] ?? 1.0;
  return Math.floor(config.base_damage * typeMultiplier * difficultyMultiplier);
}

/**
 * Calculates XP reward for a correct answer based on its damage value.
 */
export function calculateXpReward(damage: number): number {
  return Math.floor(damage * XP_PER_DAMAGE_UNIT);
}

/**
 * Pure function that computes the full battle state from inputs.
 *
 * Key formula for max boss HP:
 *   max_boss_hp = expected_student_count * average_damage_per_question * total_questions
 *
 * This ensures the boss is balanced: if every student answers every question
 * correctly, the boss HP reaches exactly 0.
 */
export function calculateBattleState(
  expectedStudentCount: number,
  questions: Question[],
  config: DamageConfig = DEFAULT_DAMAGE_CONFIG
): BattleState {
  if (expectedStudentCount <= 0) {
    throw new Error("expected_student_count must be greater than 0");
  }
  if (questions.length === 0) {
    throw new Error("questions array must not be empty");
  }

  const questionInfos: QuestionBattleInfo[] = questions.map((q) => {
    const damage = calculateQuestionDamage(q, config);
    return {
      question_id: q.id,
      damage,
      xp_reward: calculateXpReward(damage),
    };
  });

  const totalQuestions = questions.length;
  const totalDamageAllQuestions = questionInfos.reduce(
    (sum, qi) => sum + qi.damage,
    0
  );
  const averageDamagePerQuestion = totalDamageAllQuestions / totalQuestions;

  // Boss HP = students * avg_damage * total_questions
  // Simplifies to: students * totalDamageAllQuestions
  const maxBossHp = Math.ceil(
    expectedStudentCount * averageDamagePerQuestion * totalQuestions
  );

  const totalPossibleXp = questionInfos.reduce(
    (sum, qi) => sum + qi.xp_reward,
    0
  );

  return {
    max_boss_hp: maxBossHp,
    expected_student_count: expectedStudentCount,
    total_questions: totalQuestions,
    average_damage_per_question:
      Math.round(averageDamagePerQuestion * 100) / 100,
    questions: questionInfos,
    total_possible_damage_per_student: totalDamageAllQuestions,
    total_possible_xp_per_student: totalPossibleXp,
  };
}
