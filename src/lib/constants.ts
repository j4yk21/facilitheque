export const APP_NAME = "BattleLearn";

export const BOSS_AVATARS = [
  "default_boss",
  "dragon",
  "skeleton_king",
  "dark_wizard",
  "golem",
  "hydra",
] as const;

export type BossAvatarId = (typeof BOSS_AVATARS)[number];

export const MAX_QUESTIONS_PER_TEMPLATE = 20;
export const MIN_QUESTIONS_PER_TEMPLATE = 1;
export const MAX_STUDENTS_PER_SESSION = 50;
