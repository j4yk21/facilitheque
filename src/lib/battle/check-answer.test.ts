import { describe, it, expect } from "vitest";
import { checkAnswer } from "./check-answer";
import type { Question } from "@/types/question";

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q1",
    type: "multiple_choice",
    text: "Test?",
    difficulty: 2,
    correct_answer: "A",
    ...overrides,
  };
}

describe("checkAnswer", () => {
  // --- multiple_choice ---
  describe("multiple_choice", () => {
    it("returns true for exact match", () => {
      const q = makeQuestion({ correct_answer: "Paris" });
      expect(checkAnswer(q, "Paris")).toBe(true);
    });

    it("is case-insensitive", () => {
      const q = makeQuestion({ correct_answer: "Paris" });
      expect(checkAnswer(q, "paris")).toBe(true);
      expect(checkAnswer(q, "PARIS")).toBe(true);
    });

    it("trims whitespace", () => {
      const q = makeQuestion({ correct_answer: "Paris" });
      expect(checkAnswer(q, "  Paris  ")).toBe(true);
    });

    it("returns false for wrong answer", () => {
      const q = makeQuestion({ correct_answer: "Paris" });
      expect(checkAnswer(q, "London")).toBe(false);
    });
  });

  // --- short_answer ---
  describe("short_answer", () => {
    it("works the same as multiple_choice (case-insensitive string compare)", () => {
      const q = makeQuestion({ type: "short_answer", correct_answer: "42" });
      expect(checkAnswer(q, "42")).toBe(true);
      expect(checkAnswer(q, " 42 ")).toBe(true);
      expect(checkAnswer(q, "43")).toBe(false);
    });
  });

  // --- true_false ---
  describe("true_false", () => {
    it("returns true for matching True", () => {
      const q = makeQuestion({ type: "true_false", correct_answer: "True" });
      expect(checkAnswer(q, "True")).toBe(true);
      expect(checkAnswer(q, "true")).toBe(true);
    });

    it("returns true for matching False", () => {
      const q = makeQuestion({ type: "true_false", correct_answer: "False" });
      expect(checkAnswer(q, "False")).toBe(true);
      expect(checkAnswer(q, "false")).toBe(true);
    });

    it("returns false for wrong answer", () => {
      const q = makeQuestion({ type: "true_false", correct_answer: "True" });
      expect(checkAnswer(q, "False")).toBe(false);
    });
  });

  // --- fill_blank ---
  describe("fill_blank", () => {
    it("matches the correct_answer case-insensitively", () => {
      const q = makeQuestion({
        type: "fill_blank",
        text: "The ___ is the largest planet.",
        correct_answer: "Jupiter",
      });
      expect(checkAnswer(q, "Jupiter")).toBe(true);
      expect(checkAnswer(q, "jupiter")).toBe(true);
      expect(checkAnswer(q, "Saturn")).toBe(false);
    });
  });

  // --- ordering ---
  describe("ordering", () => {
    const q = makeQuestion({
      type: "ordering",
      text: "Put these in order",
      items: ["First", "Second", "Third"],
      correct_answer: "",
    });

    it("returns true for correct order", () => {
      expect(checkAnswer(q, JSON.stringify(["First", "Second", "Third"]))).toBe(
        true
      );
    });

    it("returns false for wrong order", () => {
      expect(checkAnswer(q, JSON.stringify(["Third", "First", "Second"]))).toBe(
        false
      );
    });

    it("returns false for wrong length", () => {
      expect(checkAnswer(q, JSON.stringify(["First", "Second"]))).toBe(false);
    });

    it("returns false for invalid JSON", () => {
      expect(checkAnswer(q, "not json")).toBe(false);
    });
  });

  // --- matching ---
  describe("matching", () => {
    const q = makeQuestion({
      type: "matching",
      text: "Match the terms",
      pairs: [
        { term: "H2O", definition: "Water" },
        { term: "NaCl", definition: "Salt" },
      ],
      correct_answer: "",
    });

    it("returns true for correct pairs (same order)", () => {
      const answer = JSON.stringify([
        { term: "H2O", definition: "Water" },
        { term: "NaCl", definition: "Salt" },
      ]);
      expect(checkAnswer(q, answer)).toBe(true);
    });

    it("returns true for correct pairs (different order)", () => {
      const answer = JSON.stringify([
        { term: "NaCl", definition: "Salt" },
        { term: "H2O", definition: "Water" },
      ]);
      expect(checkAnswer(q, answer)).toBe(true);
    });

    it("returns false for wrong pairing", () => {
      const answer = JSON.stringify([
        { term: "H2O", definition: "Salt" },
        { term: "NaCl", definition: "Water" },
      ]);
      expect(checkAnswer(q, answer)).toBe(false);
    });

    it("returns false for wrong count", () => {
      const answer = JSON.stringify([
        { term: "H2O", definition: "Water" },
      ]);
      expect(checkAnswer(q, answer)).toBe(false);
    });

    it("returns false for invalid JSON", () => {
      expect(checkAnswer(q, "not json")).toBe(false);
    });
  });
});
