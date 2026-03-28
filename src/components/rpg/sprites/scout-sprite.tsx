"use client";

import { motion } from "framer-motion";

interface ScoutSpriteProps {
  size?: number;
  state?: "idle" | "attack" | "hit" | "victory";
  direction?: "left" | "right";
  className?: string;
}

export function ScoutSprite({
  size = 120,
  state = "idle",
  direction = "right",
  className,
}: ScoutSpriteProps) {
  const flip = direction === "left" ? -1 : 1;

  const idleAnimation = {
    y: [0, -2, 0],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  };

  const attackAnimation = {
    x: [0, 20 * flip, 30 * flip, 0],
    y: [0, -15, 0, 0],
    transition: { duration: 0.5, times: [0, 0.2, 0.5, 1] },
  };

  const hitAnimation = {
    x: [0, -8, 4, 0],
    opacity: [1, 0.5, 1, 1],
    transition: { duration: 0.4 },
  };

  const victoryAnimation = {
    y: [0, -20, 0],
    transition: { duration: 0.6, repeat: 3 },
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
        <ellipse cx="60" cy="112" rx="24" ry="6" fill="rgba(0,0,0,0.3)" />

        {/* Boots */}
        <rect x="43" y="96" width="11" height="12" rx="3" fill="#6E2C00" />
        <rect x="66" y="96" width="11" height="12" rx="3" fill="#6E2C00" />

        {/* Legs */}
        <rect x="44" y="76" width="10" height="22" rx="3" fill="#7D6608" />
        <rect x="66" y="76" width="10" height="22" rx="3" fill="#7D6608" />

        {/* Body - leather */}
        <rect x="38" y="42" width="44" height="36" rx="6" fill="#B7950B" />
        <rect x="42" y="45" width="36" height="30" rx="4" fill="#D4AC0D" />
        {/* Leather straps */}
        <path d="M50 45 L50 75" stroke="#7D6608" strokeWidth="2" />
        <path d="M70 45 L70 75" stroke="#7D6608" strokeWidth="2" />
        {/* Belt with pouch */}
        <rect x="40" y="70" width="40" height="5" rx="2" fill="#6E2C00" />
        <rect x="68" y="67" width="8" height="8" rx="2" fill="#935116" />

        {/* Cape */}
        <path d="M38 42 L28 90 L34 88 L40 42 Z" fill="#196F3D" opacity="0.8" />

        {/* Arms */}
        <rect x="28" y="44" width="12" height="24" rx="5" fill="#B7950B" />
        <rect x="80" y="44" width="12" height="24" rx="5" fill="#B7950B" />

        {/* Bow */}
        <path
          d="M90 25 Q100 55 90 85"
          stroke="#8B4513"
          strokeWidth="3"
          fill="none"
        />
        {/* Bowstring */}
        <path d="M90 25 L88 55 L90 85" stroke="#BDC3C7" strokeWidth="1" fill="none" />
        {/* Arrow */}
        <line x1="70" y1="55" x2="95" y2="55" stroke="#8B4513" strokeWidth="2" />
        <polygon points="95,55 90,52 90,58" fill="#7F8C8D" />
        <polygon points="70,55 73,53 73,57" fill="#E74C3C" />

        {/* Quiver on back */}
        <rect x="32" y="40" width="6" height="22" rx="2" fill="#6E2C00" />
        <line x1="33" y1="38" x2="33" y2="42" stroke="#8B4513" strokeWidth="1.5" />
        <line x1="36" y1="37" x2="36" y2="42" stroke="#8B4513" strokeWidth="1.5" />

        {/* Head */}
        <circle cx="60" cy="30" r="14" fill="#F5CBA7" />
        {/* Hood */}
        <path
          d="M44 34 Q44 16 60 14 Q76 16 76 34"
          fill="#196F3D"
        />
        <path
          d="M47 34 Q47 20 60 18 Q73 20 73 34"
          fill="#239B56"
        />
        {/* Eyes - sharp */}
        <ellipse cx="54" cy="32" rx="2.5" ry="1.5" fill="#2C3E50" />
        <ellipse cx="66" cy="32" rx="2.5" ry="1.5" fill="#2C3E50" />
        {/* Slight smirk */}
        <path d="M56 37 Q61 39 66 37" stroke="#2C3E50" strokeWidth="1.5" fill="none" />
      </svg>
    </motion.div>
  );
}
