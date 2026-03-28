"use client";

import type { CharacterClass } from "@/types/database";
import { WarriorSprite } from "./warrior-sprite";
import { MageSprite } from "./mage-sprite";
import { HealerSprite } from "./healer-sprite";
import { ScoutSprite } from "./scout-sprite";

interface CharacterSpriteProps {
  characterClass: CharacterClass;
  size?: number;
  state?: "idle" | "attack" | "hit" | "victory";
  direction?: "left" | "right";
  className?: string;
}

export function CharacterSprite({
  characterClass,
  size = 120,
  state = "idle",
  direction = "right",
  className,
}: CharacterSpriteProps) {
  const props = { size, state, direction, className };

  switch (characterClass) {
    case "warrior":
      return <WarriorSprite {...props} />;
    case "mage":
      return <MageSprite {...props} />;
    case "healer":
      return <HealerSprite {...props} />;
    case "scout":
      return <ScoutSprite {...props} />;
    default:
      return <WarriorSprite {...props} />;
  }
}
