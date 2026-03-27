import type { DamageConfig } from "@/types/battle";

export const DEFAULT_DAMAGE_CONFIG: DamageConfig = {
  base_damage: 10,
  type_multipliers: {
    multiple_choice: 1.0,
    short_answer: 1.3,
    true_false: 0.7,
    ordering: 1.5,
    matching: 1.3,
    fill_blank: 1.2,
  },
  difficulty_multipliers: {
    1: 0.8, // easy
    2: 1.0, // medium
    3: 1.4, // hard
  },
};

export const XP_PER_DAMAGE_UNIT = 1.5;
