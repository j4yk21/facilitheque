import type { Question } from "@/types/question";
import type { BattleState, DamageConfig, QuestionBattleInfo } from "@/types/battle";
import type { CharacterClass } from "@/types/database";
import { DEFAULT_DAMAGE_CONFIG, XP_PER_DAMAGE_UNIT } from "./damage-config";
import {
  getClassDamageMultiplier,
  getClassXpMultiplier,
  computeTeamBonuses,
  type TeamBonuses,
} from "@/lib/rpg/character-classes";

/**
 * Calculates the damage a single correct answer deals for a given question.
 * Formula: floor(base_damage * type_multiplier * difficulty_multiplier * classMultiplier * teamMultiplier)
 */
export function calculateQuestionDamage(
  question: Question,
  config: DamageConfig = DEFAULT_DAMAGE_CONFIG,
  characterClass: CharacterClass | null = null,
  teamBonuses: TeamBonuses | null = null
): number {
  const typeMultiplier = config.type_multipliers[question.type] ?? 1.0;
  const difficultyMultiplier =
    config.difficulty_multipliers[question.difficulty] ?? 1.0;

  const classMultiplier = getClassDamageMultiplier(
    characterClass,
    question.type,
    question.difficulty
  );

  let teamDmgMultiplier = 1.0;
  if (teamBonuses) {
    teamDmgMultiplier = teamBonuses.damageMultiplier;
    if (question.type === "multiple_choice") {
      teamDmgMultiplier *= teamBonuses.mcDamageMultiplier;
    }
  }

  return Math.floor(
    config.base_damage *
      typeMultiplier *
      difficultyMultiplier *
      classMultiplier *
      teamDmgMultiplier
  );
}

/**
 * Calculates XP reward for a correct answer based on its damage value.
 */
export function calculateXpReward(
  damage: number,
  characterClass: CharacterClass | null = null,
  teamBonuses: TeamBonuses | null = null
): number {
  const classXpMult = getClassXpMultiplier(characterClass);
  const teamXpMult = teamBonuses?.xpMultiplier ?? 1.0;
  return Math.floor(damage * XP_PER_DAMAGE_UNIT * classXpMult * teamXpMult);
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
