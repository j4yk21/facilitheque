import { describe, it, expect } from "vitest";
import { generateBattleCode, isValidBattleCode } from "./battle-code";

describe("generateBattleCode", () => {
  it("generates a 6-character string", () => {
    const code = generateBattleCode();
    expect(code).toHaveLength(6);
  });

  it("only contains valid characters (no 0, O, 1, I, L)", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateBattleCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });

  it("generates different codes (statistical)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(generateBattleCode());
    }
    // With 729M possibilities, 50 codes should all be unique
    expect(codes.size).toBe(50);
  });
});

describe("isValidBattleCode", () => {
  it("accepts valid codes", () => {
    expect(isValidBattleCode("ABCDEF")).toBe(true);
    expect(isValidBattleCode("XY2345")).toBe(true);
    expect(isValidBattleCode("HJ9KMN")).toBe(true);
  });

  it("rejects codes with ambiguous characters", () => {
    expect(isValidBattleCode("ABCDE0")).toBe(false); // 0
    expect(isValidBattleCode("ABCDEO")).toBe(false); // O
    expect(isValidBattleCode("ABCDE1")).toBe(false); // 1
    expect(isValidBattleCode("ABCDEI")).toBe(false); // I
    expect(isValidBattleCode("ABCDEL")).toBe(false); // L
  });

  it("rejects wrong length", () => {
    expect(isValidBattleCode("ABCDE")).toBe(false);
    expect(isValidBattleCode("ABCDEFG")).toBe(false);
    expect(isValidBattleCode("")).toBe(false);
  });

  it("rejects lowercase", () => {
    expect(isValidBattleCode("abcdef")).toBe(false);
  });
});
