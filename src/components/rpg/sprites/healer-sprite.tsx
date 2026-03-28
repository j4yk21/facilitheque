"use client";

import { motion } from "framer-motion";

interface HealerSpriteProps {
  size?: number;
  state?: "idle" | "attack" | "hit" | "victory";
  direction?: "left" | "right";
  className?: string;
}

export function HealerSprite({
  size = 120,
  state = "idle",
  direction = "right",
  className,
}: HealerSpriteProps) {
  const flip = direction === "left" ? -1 : 1;

  const idleAnimation = {
    y: [0, -3, 0],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  };

  const attackAnimation = {
    y: [0, -10, 0],
    scale: [1, 1.15, 1],
    transition: { duration: 0.6 },
  };

  const hitAnimation = {
    x: [0, -8, 4, 0],
    opacity: [1, 0.5, 1, 1],
    transition: { duration: 0.4 },
  };

  const victoryAnimation = {
    y: [0, -12, 0],
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
        <ellipse cx="60" cy="112" rx="26" ry="7" fill="rgba(0,0,0,0.3)" />

        {/* Boots */}
        <rect x="43" y="98" width="11" height="10" rx="3" fill="#1E8449" />
        <rect x="66" y="98" width="11" height="10" rx="3" fill="#1E8449" />

        {/* Robe bottom */}
        <path d="M38 72 L34 106 L86 106 L82 72 Z" fill="#27AE60" />
        <path d="M42 76 L40 102 L80 102 L78 76 Z" fill="#2ECC71" />

        {/* Body - robe */}
        <rect x="38" y="42" width="44" height="34" rx="6" fill="#27AE60" />
        <rect x="44" y="46" width="32" height="26" rx="3" fill="#2ECC71" />
        {/* Cross symbol */}
        <rect x="57" y="48" width="6" height="18" rx="1" fill="white" />
        <rect x="51" y="54" width="18" height="6" rx="1" fill="white" />

        {/* Arms */}
        <rect x="26" y="46" width="14" height="24" rx="5" fill="#27AE60" />
        <rect x="80" y="46" width="14" height="24" rx="5" fill="#27AE60" />

        {/* Staff with healing orb */}
        <rect x="16" y="25" width="3" height="75" rx="1.5" fill="#8B4513" />
        {/* Healing orb */}
        <motion.circle
          cx="17.5"
          cy="25"
          r="7"
          fill="#2ECC71"
          animate={{
            filter: [
              "drop-shadow(0 0 4px #2ECC71)",
              "drop-shadow(0 0 14px #2ECC71)",
              "drop-shadow(0 0 4px #2ECC71)",
            ],
          }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <circle cx="17.5" cy="25" r="3.5" fill="#82E0AA" />
        {/* Cross in orb */}
        <rect x="16.5" y="22" width="2" height="6" rx="0.5" fill="white" />
        <rect x="15" y="24" width="5" height="2" rx="0.5" fill="white" />

        {/* Head */}
        <circle cx="60" cy="30" r="14" fill="#F5CBA7" />
        {/* Hood */}
        <path
          d="M42 35 Q42 14 60 12 Q78 14 78 35"
          fill="#1E8449"
        />
        <path
          d="M45 35 Q45 18 60 16 Q75 18 75 35"
          fill="#27AE60"
        />
        {/* Eyes */}
        <circle cx="54" cy="32" r="2" fill="#2C3E50" />
        <circle cx="66" cy="32" r="2" fill="#2C3E50" />
        {/* Kind smile */}
        <path d="M54 37 Q60 42 66 37" stroke="#2C3E50" strokeWidth="1.5" fill="none" />

        {/* Floating heal particles */}
        <motion.circle
          cx="30" cy="40"
          r="2"
          fill="#2ECC71"
          animate={{ y: [0, -15, 0], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0 }}
        />
        <motion.circle
          cx="90" cy="50"
          r="1.5"
          fill="#82E0AA"
          animate={{ y: [0, -12, 0], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
        />
        <motion.circle
          cx="70" cy="45"
          r="1.5"
          fill="#58D68D"
          animate={{ y: [0, -10, 0], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1.3 }}
        />
      </svg>
    </motion.div>
  );
}
