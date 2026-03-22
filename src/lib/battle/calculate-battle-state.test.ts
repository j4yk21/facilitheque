import { describe, it, expect } from "vitest";
import {
  calculateBattleState,
  calculateQuestionDamage,
  calculateXpReward,
} from "./calculate-battle-state";
import { DEFAULT_DAMAGE_CONFIG } from "./damage-config";
import type { Question } from "@/types/question";
import type { DamageConfig } from "@/types/battle";

// --- Helpers ---

function makeQuestion(
  overrides: Partial<Question> & { id: string } = { id: "q1" }
): Question {
  return {
    type: "multiple_choice",
    text: "Test question?",
    difficulty: 2,
    correct_answer: "A",
    ...overrides,
  };
}

// --- calculateQuestionDamage ---

describe("calculateQuestionDamage", () => {
  it("returns 10 for a medium multiple-choice question", () => {
    const q = makeQuestion({ id: "q1", type: "multiple_choice", difficulty: 2 });
    expect(calculateQuestionDamage(q)).toBe(10);
  });

  it("returns 8 for an easy multiple-choice question (10 * 1.0 * 0.8)", () => {
    const q = makeQuestion({ id: "q1", type: "multiple_choice", difficulty: 1 });
    expect(calculateQuestionDamage(q)).toBe(8);
  });

  it("returns 14 for a hard multiple-choice question (10 * 1.0 * 1.4)", () => {
    const q = makeQuestion({ id: "q1", type: "multiple_choice", difficulty: 3 });
    expect(calculateQuestionDamage(q)).toBe(14);
  });

  it("returns 13 for a medium short-answer question (floor(10 * 1.3 * 1.0))", () => {
    const q = makeQuestion({ id: "q1", type: "short_answer", difficulty: 2 });
    expect(calculateQuestionDamage(q)).toBe(13);
  });

  it("returns 18 for a hard short-answer question (floor(10 * 1.3 * 1.4) = floor(18.2))", () => {
    const q = makeQuestion({ id: "q1", type: "short_answer", difficulty: 3 });
    expect(calculateQuestionDamage(q)).toBe(18);
  });

  it("returns 10 for an easy short-answer (floor(10 * 1.3 * 0.8) = floor(10.4))", () => {
    const q = makeQuestion({ id: "q1", type: "short_answer", difficulty: 1 });
    expect(calculateQuestionDamage(q)).toBe(10);
  });

  it("respects custom config", () => {
    const config: DamageConfig = {
      base_damage: 20,
      type_multipliers: { multiple_choice: 1.0, short_answer: 1.5 },
      difficulty_multipliers: { 1: 0.5, 2: 1.0, 3: 2.0 },
    };
    const q = makeQuestion({ id: "q1", type: "short_answer", difficulty: 3 });
    // floor(20 * 1.5 * 2.0) = floor(60) = 60
    expect(calculateQuestionDamage(q, config)).toBe(60);
  });
});

// --- calculateXpReward ---

describe("calculateXpReward", () => {
  it("returns floor(damage * 1.5)", () => {
    expect(calculateXpReward(10)).toBe(15);
    expect(calculateXpReward(13)).toBe(19); // floor(19.5)
    expect(calculateXpReward(8)).toBe(12);
    expect(calculateXpReward(0)).toBe(0);
  });
});

// --- calculateBattleState ---

describe("calculateBattleState", () => {
  it("calculates correct HP for uniform medium MC questions", () => {
    // 5 students, 3 medium MC questions
    // damage per question = 10, total per student = 30, avg = 10
    // HP = ceil(5 * 10 * 3) = 150
    const questions = [
      makeQuestion({ id: "q1" }),
      makeQuestion({ id: "q2" }),
      makeQuestion({ id: "q3" }),
    ];
    const state = calculateBattleState(5, questions);

    expect(state.max_boss_hp).toBe(150);
    expect(state.expected_student_count).toBe(5);
    expect(state.total_questions).toBe(3);
    expect(state.average_damage_per_question).toBe(10);
    expect(state.total_possible_damage_per_student).toBe(30);
    expect(state.total_possible_xp_per_student).toBe(45); // 3 * 15
  });

  it("calculates correct HP for mixed types (MC + SA)", () => {
    // 10 students, 2 MC (dmg=10) + 2 SA (dmg=13)
    // total damage per student = 10+10+13+13 = 46
    // avg = 46/4 = 11.5
    // HP = ceil(10 * 11.5 * 4) = ceil(460) = 460
    const questions = [
      makeQuestion({ id: "q1", type: "multiple_choice" }),
      makeQuestion({ id: "q2", type: "multiple_choice" }),
      makeQuestion({ id: "q3", type: "short_answer" }),
      makeQuestion({ id: "q4", type: "short_answer" }),
    ];
    const state = calculateBattleState(10, questions);

    expect(state.max_boss_hp).toBe(460);
    expect(state.average_damage_per_question).toBe(11.5);
  });

  it("calculates correct HP for mixed difficulty", () => {
    // 3 students, 1 easy MC (dmg=8) + 1 hard SA (dmg=18)
    // total damage per student = 26
    // avg = 26/2 = 13
    // HP = ceil(3 * 13 * 2) = 78
    const questions = [
      makeQuestion({ id: "q1", type: "multiple_choice", difficulty: 1 }),
      makeQuestion({ id: "q2", type: "short_answer", difficulty: 3 }),
    ];
    const state = calculateBattleState(3, questions);

    expect(state.max_boss_hp).toBe(78);
    expect(state.average_damage_per_question).toBe(13);
    expect(state.total_possible_damage_per_student).toBe(26);
  });

  it("handles a single student correctly", () => {
    // 1 student, 5 medium MC questions
    // HP = ceil(1 * 10 * 5) = 50
    const questions = Array.from({ length: 5 }, (_, i) =>
      makeQuestion({ id: `q${i}` })
    );
    const state = calculateBattleState(1, questions);

    expect(state.max_boss_hp).toBe(50);
  });

  it("throws on 0 students", () => {
    expect(() =>
      calculateBattleState(0, [makeQuestion({ id: "q1" })])
    ).toThrow("expected_student_count must be greater than 0");
  });

  it("throws on negative students", () => {
    expect(() =>
      calculateBattleState(-1, [makeQuestion({ id: "q1" })])
    ).toThrow("expected_student_count must be greater than 0");
  });

  it("throws on empty questions array", () => {
    expect(() => calculateBattleState(5, [])).toThrow(
      "questions array must not be empty"
    );
  });

  it("correctly calculates per-question info", () => {
    const questions = [
      makeQuestion({ id: "q1", type: "multiple_choice", difficulty: 2 }), // dmg=10
      makeQuestion({ id: "q2", type: "short_answer", difficulty: 3 }), // dmg=18
    ];
    const state = calculateBattleState(1, questions);

    expect(state.questions).toEqual([
      { question_id: "q1", damage: 10, xp_reward: 15 },
      { question_id: "q2", damage: 18, xp_reward: 27 },
    ]);
  });

  it("uses custom damage config", () => {
    const config: DamageConfig = {
      base_damage: 20,
      type_multipliers: { multiple_choice: 1.0, short_answer: 1.0 },
      difficulty_multipliers: { 1: 1.0, 2: 1.0, 3: 1.0 },
    };
    const questions = [
      makeQuestion({ id: "q1" }),
      makeQuestion({ id: "q2" }),
    ];
    // 5 students, 2 questions, 20 damage each
    // HP = ceil(5 * 20 * 2) = 200
    const state = calculateBattleState(5, questions, config);

    expect(state.max_boss_hp).toBe(200);
    expect(state.average_damage_per_question).toBe(20);
  });

  it("uses ceil for boss HP to prevent early defeat from rounding", () => {
    // Create a scenario where avg damage is fractional
    // 3 students, 3 questions: easy MC(8) + medium MC(10) + hard MC(14)
    // total = 32, avg = 32/3 = 10.666...
    // HP = ceil(3 * 10.666... * 3) = ceil(96) = 96
    const questions = [
      makeQuestion({ id: "q1", difficulty: 1 }),
      makeQuestion({ id: "q2", difficulty: 2 }),
      makeQuestion({ id: "q3", difficulty: 3 }),
    ];
    const state = calculateBattleState(3, questions);

    expect(state.max_boss_hp).toBe(96);
    expect(state.total_possible_damage_per_student).toBe(32);
  });
});
