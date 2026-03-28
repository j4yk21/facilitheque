"use client";

import { motion } from "framer-motion";

interface WarriorSpriteProps {
  size?: number;
  state?: "idle" | "attack" | "hit" | "victory";
  direction?: "left" | "right";
  className?: string;
}

export function WarriorSprite({
  size = 120,
  state = "idle",
  direction = "right",
  className,
}: WarriorSpriteProps) {
  const scale = size / 120;
  const flip = direction === "left" ? -1 : 1;

  const idleAnimation = {
    y: [0, -3, 0],
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
  };

  const attackAnimation = {
    x: [0, 40 * flip, 40 * flip, 0],
    rotate: [0, -15 * flip, 10 * flip, 0],
    transition: { duration: 0.6, times: [0, 0.3, 0.5, 1] },
  };

  const hitAnimation = {
    x: [0, -10, 5, 0],
    opacity: [1, 0.5, 1, 1],
    transition: { duration: 0.4 },
  };

  const victoryAnimation = {
    y: [0, -20, 0],
    rotate: [0, 5, -5, 0],
    transition: { duration: 0.8, repeat: 2 },
  };

  const animations = {
    idle: idleAnimation,
    attack: attackAnimation,
    hit: hitAnimation,
    victory: victoryAnimation,
  } as const;

  const currentAnim = animations[state] as any;

  return (
    <motion.div
      className={className}
      animate={currentAnim}
      style={{ width: size, height: size, transform: `scaleX(${flip})` }}
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow */}
        <ellipse cx="60" cy="112" rx="28" ry="8" fill="rgba(0,0,0,0.3)" />

        {/* Boots */}
        <rect x="40" y="95" width="14" height="12" rx="3" fill="#5C3A1E" />
        <rect x="66" y="95" width="14" height="12" rx="3" fill="#5C3A1E" />

        {/* Legs - armored */}
        <rect x="42" y="75" width="12" height="22" rx="3" fill="#8B4513" />
        <rect x="66" y="75" width="12" height="22" rx="3" fill="#8B4513" />
        <rect x="43" y="78" width="10" height="6" rx="1" fill="#A0522D" />
        <rect x="67" y="78" width="10" height="6" rx="1" fill="#A0522D" />

        {/* Body - armor */}
        <rect x="36" y="42" width="48" height="36" rx="6" fill="#C0392B" />
        {/* Chest plate */}
        <rect x="44" y="46" width="32" height="28" rx="4" fill="#E74C3C" />
        {/* Armor detail - V shape */}
        <path d="M52 46 L60 62 L68 46" stroke="#F5B041" strokeWidth="2" fill="none" />
        {/* Belt */}
        <rect x="38" y="70" width="44" height="6" rx="2" fill="#7D6608" />
        <rect x="56" y="69" width="8" height="8" rx="2" fill="#F1C40F" />

        {/* Arms */}
        {/* Left arm */}
        <rect x="24" y="44" width="14" height="28" rx="5" fill="#C0392B" />
        <rect x="26" y="48" width="10" height="8" rx="2" fill="#E74C3C" />
        {/* Right arm (sword arm) */}
        <rect x="82" y="44" width="14" height="28" rx="5" fill="#C0392B" />
        <rect x="84" y="48" width="10" height="8" rx="2" fill="#E74C3C" />

        {/* Sword */}
        <rect x="92" y="20" width="4" height="48" rx="1" fill="#BDC3C7" />
        <rect x="88" y="64" width="12" height="5" rx="2" fill="#7D6608" />
        <polygon points="94,20 90,10 98,10" fill="#BDC3C7" />

        {/* Shield (left hand) */}
        <rect x="14" y="50" width="16" height="20" rx="4" fill="#2C3E50" />
        <rect x="17" y="53" width="10" height="14" rx="2" fill="#34495E" />
        <circle cx="22" cy="60" r="3" fill="#F1C40F" />

        {/* Head */}
        <circle cx="60" cy="30" r="16" fill="#F5CBA7" />
        {/* Helmet */}
        <path
          d="M44 30 Q44 14 60 12 Q76 14 76 30"
          fill="#7F8C8D"
          stroke="#95A5A6"
          strokeWidth="1"
        />
        <rect x="44" y="26" width="32" height="5" rx="1" fill="#95A5A6" />
        {/* Visor slit */}
        <rect x="50" y="28" width="20" height="2" rx="1" fill="#2C3E50" />
        {/* Eyes */}
        <circle cx="53" cy="33" r="2" fill="#2C3E50" />
        <circle cx="67" cy="33" r="2" fill="#2C3E50" />
        {/* Mouth */}
        <path d="M55 38 Q60 41 65 38" stroke="#2C3E50" strokeWidth="1.5" fill="none" />
      </svg>
    </motion.div>
  );
}
