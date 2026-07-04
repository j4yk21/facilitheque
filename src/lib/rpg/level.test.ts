import { describe, it, expect } from "vitest";
import {
  levelForXp,
  xpIntoLevel,
  levelProgressPercent,
  XP_PER_LEVEL,
} from "./level";

describe("level progression", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelForXp(0)).toBe(1);
    expect(xpIntoLevel(0)).toBe(0);
  });

  it("levels up exactly at multiples of XP_PER_LEVEL", () => {
    expect(levelForXp(XP_PER_LEVEL - 1)).toBe(1);
    expect(levelForXp(XP_PER_LEVEL)).toBe(2);
    expect(levelForXp(XP_PER_LEVEL * 3 + 42)).toBe(4);
  });

  it("tracks XP inside the current level", () => {
    expect(xpIntoLevel(510)).toBe(10);
    expect(levelProgressPercent(250)).toBe(50);
  });

  it("clamps negative XP", () => {
    expect(levelForXp(-10)).toBe(1);
    expect(xpIntoLevel(-10)).toBe(0);
  });
});
