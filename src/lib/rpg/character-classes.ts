import type { CharacterClass } from "@/types/database";
import type { QuestionType, Difficulty } from "@/types/question";

export interface CharacterClassDef {
  id: CharacterClass;
  name: string;
  description: string;
  icon: string;
  color: string;
  individualBonus: string;
  teamBonus: string;
}

export const CHARACTER_CLASSES: Record<CharacterClass, CharacterClassDef> = {
  warrior: {
    id: "warrior",
    name: "Guerrier",
    description: "Puissant combattant qui frappe fort a chaque reponse.",
    icon: "!",
    color: "text-red-400",
    individualBonus: "x1.25 degats sur toutes les questions",
    teamBonus: "+5% degats pour toute l'equipe",
  },
  mage: {
    id: "mage",
    name: "Mage",
    description: "Maitre du savoir, devastateur sur les questions difficiles.",
    icon: "*",
    color: "text-blue-400",
    individualBonus: "x1.5 degats sur les questions difficiles",
    teamBonus: "+10% XP pour toute l'equipe",
  },
  healer: {
    id: "healer",
    name: "Guerisseur",
    description: "Soutien de l'equipe, genere plus d'XP pour faire progresser le groupe.",
    icon: "+",
    color: "text-green-400",
    individualBonus: "x1.5 XP gagne",
    teamBonus: "+15% XP pour toute l'equipe",
  },
  scout: {
    id: "scout",
    name: "Eclaireur",
    description: "Rapide et precis, excelle sur les QCM.",
    icon: ">",
    color: "text-yellow-400",
    individualBonus: "x1.3 degats sur les QCM",
    teamBonus: "+5% degats QCM pour toute l'equipe",
  },
};

export const ALL_CLASSES = Object.values(CHARACTER_CLASSES);

/**
 * Individual damage multiplier for a character class.
 */
export function getClassDamageMultiplier(
  characterClass: CharacterClass | null,
  questionType: QuestionType,
  difficulty: Difficulty
): number {
  if (!characterClass) return 1.0;

  switch (characterClass) {
    case "warrior":
      return 1.25;
    case "mage":
      return difficulty === 3 ? 1.5 : 1.0;
    case "scout":
      return questionType === "multiple_choice" ? 1.3 : 1.0;
    case "healer":
      return 1.0; // healer doesn't get damage bonus, gets XP bonus instead
    default:
      return 1.0;
  }
}

/**
 * Individual XP multiplier for a character class.
 */
export function getClassXpMultiplier(
  characterClass: CharacterClass | null
): number {
  if (characterClass === "healer") return 1.5;
  return 1.0;
}

export interface TeamBonuses {
  damageMultiplier: number;
  xpMultiplier: number;
  mcDamageMultiplier: number;
}

/**
 * Compute team-wide bonuses based on party composition.
 * Multiple characters of the same class stack their bonuses.
 */
export function computeTeamBonuses(
  partyClasses: (CharacterClass | null)[]
): TeamBonuses {
  let damageBonus = 0;
  let xpBonus = 0;
  let mcDamageBonus = 0;

  for (const cls of partyClasses) {
    switch (cls) {
      case "warrior":
        damageBonus += 0.05;
        break;
      case "mage":
        xpBonus += 0.10;
        break;
      case "healer":
        xpBonus += 0.15;
        break;
      case "scout":
        mcDamageBonus += 0.05;
        break;
    }
  }

  return {
    damageMultiplier: 1 + damageBonus,
    xpMultiplier: 1 + xpBonus,
    mcDamageMultiplier: 1 + mcDamageBonus,
  };
}
