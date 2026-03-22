import { type ClassValue, clsx } from "clsx";

/**
 * Merge Tailwind class names (uses clsx for now; swap to twMerge later if needed).
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatXP(xp: number): string {
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}k XP`;
  }
  return `${xp} XP`;
}
