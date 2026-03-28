"use client";

import { motion } from "framer-motion";

interface MageSpriteProps {
  size?: number;
  state?: "idle" | "attack" | "hit" | "victory";
  direction?: "left" | "right";
  className?: string;
}

export function MageSprite({
  size = 120,
  state = "idle",
  direction = "right",
  className,
}: MageSpriteProps) {
  const flip = direction === "left" ? -1 : 1;

  const idleAnimation = {
    y: [0, -4, 0],
    transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
  };

  const attackAnimation = {
    scale: [1, 1.1, 1],
    rotate: [0, -5, 5, 0],
    transition: { duration: 0.7, times: [0, 0.3, 0.6, 1] },
  };

  const hitAnimation = {
    x: [0, -10, 5, 0],
    opacity: [1, 0.5, 1, 1],
    transition: { duration: 0.4 },
  };

  const victoryAnimation = {
    y: [0, -15, 0],
    scale: [1, 1.1, 1],
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
        <ellipse cx="60" cy="112" rx="26" ry="7" fill="rgba(0,0,0,0.3)" />

        {/* Boots */}
        <rect x="42" y="98" width="12" height="10" rx="3" fill="#4A235A" />
        <rect x="66" y="98" width="12" height="10" rx="3" fill="#4A235A" />

        {/* Robe bottom */}
        <path d="M36 70 L32 105 L88 105 L84 70 Z" fill="#6C3483" />
        <path d="M40 75 L38 100 L82 100 L80 75 Z" fill="#7D3C98" />

        {/* Body - robe */}
        <rect x="38" y="42" width="44" height="32" rx="6" fill="#6C3483" />
        <rect x="44" y="46" width="32" height="24" rx="3" fill="#7D3C98" />
        {/* Robe detail - star */}
        <polygon
          points="60,48 62,54 68,55 63,59 65,65 60,61 55,65 57,59 52,55 58,54"
          fill="#F4D03F"
        />

        {/* Cloak */}
        <path d="M36 42 L30 85 L36 82 L38 42 Z" fill="#512E5F" />
        <path d="M84 42 L90 85 L84 82 L82 42 Z" fill="#512E5F" />

        {/* Arms */}
        <rect x="26" y="46" width="13" height="24" rx="5" fill="#6C3483" />
        <rect x="81" y="46" width="13" height="24" rx="5" fill="#6C3483" />

        {/* Staff */}
        <rect x="88" y="15" width="4" height="90" rx="2" fill="#8B4513" />
        {/* Staff orb */}
        <motion.circle
          cx="90"
          cy="15"
          r="8"
          fill="#3498DB"
          animate={{
            filter: [
              "drop-shadow(0 0 4px #3498DB)",
              "drop-shadow(0 0 12px #3498DB)",
              "drop-shadow(0 0 4px #3498DB)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <circle cx="90" cy="15" r="4" fill="#85C1E9" />
        <circle cx="88" cy="13" r="1.5" fill="white" />

        {/* Head */}
        <circle cx="60" cy="30" r="14" fill="#F5CBA7" />
        {/* Wizard hat */}
        <path d="M40 34 L60 2 L80 34 Z" fill="#4A235A" />
        <path d="M40 34 L60 6 L80 34 Z" fill="#6C3483" />
        {/* Hat brim */}
        <ellipse cx="60" cy="34" rx="24" ry="5" fill="#4A235A" />
        {/* Hat star */}
        <polygon
          points="60,12 61,15 64,16 62,18 62,21 60,19 58,21 58,18 56,16 59,15"
          fill="#F4D03F"
        />
        {/* Eyes */}
        <circle cx="54" cy="32" r="2" fill="#2C3E50" />
        <circle cx="66" cy="32" r="2" fill="#2C3E50" />
        {/* Wise smile */}
        <path d="M55 37 Q60 40 65 37" stroke="#2C3E50" strokeWidth="1.5" fill="none" />
        {/* Beard */}
        <path d="M50 38 Q55 50 60 48 Q65 50 70 38" fill="#ECF0F1" />
      </svg>
    </motion.div>
  );
}
