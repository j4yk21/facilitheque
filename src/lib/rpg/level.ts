/**
 * Level progression — single source of truth, mirrored by the server in
 * submit_answer() (supabase/migrations/00006_server_side_answers.sql).
 * The server is authoritative; these helpers are for display only.
 */

export const XP_PER_LEVEL = 500;

/** Level for a given XP total: floor(xp / 500) + 1 */
export function levelForXp(totalXp: number): number {
  return Math.floor(Math.max(0, totalXp) / XP_PER_LEVEL) + 1;
}

/** XP accumulated inside the current level (0..499) */
export function xpIntoLevel(totalXp: number): number {
  return Math.max(0, totalXp) % XP_PER_LEVEL;
}

/** Progress through the current level, 0..100 */
export function levelProgressPercent(totalXp: number): number {
  return Math.round((xpIntoLevel(totalXp) / XP_PER_LEVEL) * 100);
}
