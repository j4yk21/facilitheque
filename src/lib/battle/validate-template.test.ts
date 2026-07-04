import { describe, it, expect } from "vitest";
import { validateQuestions } from "./validate-template";
import type { Question } from "@/types/question";

function base(overrides: Partial<Question>): Question {
  return {
    id: "q1",
    type: "short_answer",
    text: "What is 2 + 2?",
    difficulty: 1,
    correct_answer: "4",
    ...overrides,
  };
}

describe("validateQuestions", () => {
  it("accepts an empty list", () => {
    expect(validateQuestions([])).toBeNull();
  });

  it("rejects a question without text", () => {
    expect(validateQuestions([base({ text: "  " })])).toMatch(/text/);
  });

  it("reports the index of the failing question", () => {
    const result = validateQuestions([base({}), base({ text: "" })]);
    expect(result).toMatch(/Question 2/);
  });

  describe("short_answer", () => {
    it("requires a correct answer", () => {
      expect(validateQuestions([base({ correct_answer: "" })])).toMatch(
        /correct answer/
      );
    });

    it("accepts a valid question", () => {
      expect(validateQuestions([base({})])).toBeNull();
    });
  });

  describe("multiple_choice", () => {
    const mc = (overrides: Partial<Question>) =>
      base({
        type: "multiple_choice",
        options: ["3", "4", "5"],
        correct_answer: "4",
        ...overrides,
      });

    it("accepts a valid question", () => {
      expect(validateQuestions([mc({})])).toBeNull();
    });

    it("requires at least 2 non-empty options", () => {
      expect(validateQuestions([mc({ options: ["4", " "] })])).toMatch(
        /2 options/
      );
    });

    it("requires the correct answer to be among the options", () => {
      expect(validateQuestions([mc({ correct_answer: "7" })])).toMatch(
        /one of the options/
      );
    });

    it("matches the correct answer case-insensitively", () => {
      expect(
        validateQuestions([
          mc({ options: ["Paris", "Lyon"], correct_answer: " paris " }),
        ])
      ).toBeNull();
    });
  });

  describe("true_false", () => {
    it("accepts True and false", () => {
      expect(
        validateQuestions([
          base({ type: "true_false", correct_answer: "True" }),
          base({ type: "true_false", correct_answer: "false" }),
        ])
      ).toBeNull();
    });

    it("rejects other values", () => {
      expect(
        validateQuestions([base({ type: "true_false", correct_answer: "Vrai" })])
      ).toMatch(/True or False/);
    });
  });

  describe("fill_blank", () => {
    it("requires the ___ marker in the text", () => {
      expect(
        validateQuestions([
          base({ type: "fill_blank", text: "Complete the sentence" }),
        ])
      ).toMatch(/___/);
    });

    it("accepts text containing the marker", () => {
      expect(
        validateQuestions([
          base({ type: "fill_blank", text: "2 + 2 = ___", correct_answer: "4" }),
        ])
      ).toBeNull();
    });
  });

  describe("ordering", () => {
    it("does not require correct_answer", () => {
      expect(
        validateQuestions([
          base({
            type: "ordering",
            correct_answer: "",
            items: ["First", "Second", "Third"],
          }),
        ])
      ).toBeNull();
    });

    it("requires at least 2 non-empty items", () => {
      expect(
        validateQuestions([
          base({ type: "ordering", correct_answer: "", items: ["First", " "] }),
        ])
      ).toMatch(/2 items/);
    });
  });

  describe("matching", () => {
    it("does not require correct_answer", () => {
      expect(
        validateQuestions([
          base({
            type: "matching",
            correct_answer: "",
            pairs: [
              { term: "chat", definition: "cat" },
              { term: "chien", definition: "dog" },
            ],
          }),
        ])
      ).toBeNull();
    });

    it("requires at least 2 complete pairs", () => {
      expect(
        validateQuestions([
          base({
            type: "matching",
            correct_answer: "",
            pairs: [
              { term: "chat", definition: "cat" },
              { term: "chien", definition: " " },
            ],
          }),
        ])
      ).toMatch(/2 complete pairs/);
    });
  });
});
