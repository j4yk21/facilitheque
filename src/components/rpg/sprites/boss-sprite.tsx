"use client";

import { motion } from "framer-motion";

interface BossSpriteProps {
  size?: number;
  state?: "idle" | "hit" | "defeated";
  hpPercent?: number;
  className?: string;
}

export function BossSprite({
  size = 180,
  state = "idle",
  hpPercent = 100,
  className,
}: BossSpriteProps) {
  const isEnraged = hpPercent <= 25 && hpPercent > 0;

  const idleAnimation = {
    y: [0, -5, 0],
    scale: isEnraged ? [1, 1.03, 1] : [1, 1.01, 1],
    transition: {
      duration: isEnraged ? 1.2 : 2.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };

  const hitAnimation = {
    x: [0, 8, -8, 4, -4, 0],
    filter: [
      "brightness(1)",
      "brightness(2)",
      "brightness(1.5)",
      "brightness(1)",
    ],
    transition: { duration: 0.5 },
  };

  const defeatedAnimation = {
    y: [0, 20],
    opacity: [1, 0],
    rotate: [0, 10],
    transition: { duration: 1.5, ease: "easeIn" },
  };

  const animations = {
    idle: idleAnimation,
    hit: hitAnimation,
    defeated: defeatedAnimation,
  } as const;

  const currentAnim = animations[state] as any;

  return (
    <motion.div
      className={className}
      animate={currentAnim}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 180 180"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow */}
        <ellipse cx="90" cy="170" rx="50" ry="10" fill="rgba(0,0,0,0.4)" />

        {/* Tail */}
        <path
          d="M30 120 Q10 110 5 90 Q8 85 15 90 Q20 100 35 108"
          fill="#8E44AD"
          stroke="#6C3483"
          strokeWidth="1"
        />

        {/* Wings */}
        <path
          d="M45 60 L15 25 L25 55 L10 30 L30 60 L45 70"
          fill="#9B59B6"
          stroke="#7D3C98"
          strokeWidth="1"
        />
        <path
          d="M135 60 L165 25 L155 55 L170 30 L150 60 L135 70"
          fill="#9B59B6"
          stroke="#7D3C98"
          strokeWidth="1"
        />

        {/* Body */}
        <ellipse cx="90" cy="100" rx="45" ry="40" fill="#8E44AD" />
        <ellipse cx="90" cy="100" rx="38" ry="34" fill="#9B59B6" />
        {/* Belly */}
        <ellipse cx="90" cy="108" rx="25" ry="20" fill="#AF7AC5" />
        {/* Belly scales */}
        <path d="M75 100 Q80 95 85 100 Q90 95 95 100 Q100 95 105 100" stroke="#8E44AD" strokeWidth="1" fill="none" />
        <path d="M78 108 Q83 103 88 108 Q93 103 98 108" stroke="#8E44AD" strokeWidth="1" fill="none" />

        {/* Legs */}
        <rect x="55" y="130" width="16" height="24" rx="5" fill="#7D3C98" />
        <rect x="109" y="130" width="16" height="24" rx="5" fill="#7D3C98" />
        {/* Claws */}
        <circle cx="58" cy="154" r="3" fill="#2C3E50" />
        <circle cx="65" cy="154" r="3" fill="#2C3E50" />
        <circle cx="112" cy="154" r="3" fill="#2C3E50" />
        <circle cx="119" cy="154" r="3" fill="#2C3E50" />

        {/* Arms/Claws */}
        <rect x="40" y="80" width="14" height="26" rx="5" fill="#7D3C98" />
        <rect x="126" y="80" width="14" height="26" rx="5" fill="#7D3C98" />
        <path d="M40 106 L36 112 L42 108 L38 114 L46 108" fill="#2C3E50" />
        <path d="M140 106 L144 112 L138 108 L142 114 L134 108" fill="#2C3E50" />

        {/* Neck */}
        <rect x="75" y="52" width="30" height="20" rx="8" fill="#8E44AD" />

        {/* Head */}
        <ellipse cx="90" cy="45" rx="28" ry="22" fill="#8E44AD" />
        <ellipse cx="90" cy="45" rx="24" ry="18" fill="#9B59B6" />

        {/* Horns */}
        <path d="M65 30 L55 10 L62 28" fill="#2C3E50" />
        <path d="M115 30 L125 10 L118 28" fill="#2C3E50" />

        {/* Eyes */}
        <motion.ellipse
          cx="78"
          cy="42"
          rx="6"
          ry="5"
          fill={isEnraged ? "#E74C3C" : "#F39C12"}
          animate={
            isEnraged
              ? { fill: ["#E74C3C", "#FF0000", "#E74C3C"] }
              : {}
          }
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        <motion.ellipse
          cx="102"
          cy="42"
          rx="6"
          ry="5"
          fill={isEnraged ? "#E74C3C" : "#F39C12"}
          animate={
            isEnraged
              ? { fill: ["#E74C3C", "#FF0000", "#E74C3C"] }
              : {}
          }
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        {/* Pupils */}
        <ellipse cx="80" cy="42" rx="3" ry="4" fill="#2C3E50" />
        <ellipse cx="104" cy="42" rx="3" ry="4" fill="#2C3E50" />
        {/* Eye shine */}
        <circle cx="76" cy="40" r="1.5" fill="white" />
        <circle cx="100" cy="40" r="1.5" fill="white" />

        {/* Mouth */}
        <path
          d="M75 55 Q80 52 85 56 Q90 52 95 56 Q100 52 105 55"
          stroke="#2C3E50"
          strokeWidth="2"
          fill="none"
        />
        {/* Fangs */}
        <polygon points="80,55 82,61 84,55" fill="white" />
        <polygon points="96,55 98,61 100,55" fill="white" />

        {/* Spikes on back */}
        <polygon points="75,62 72,50 78,58" fill="#6C3483" />
        <polygon points="85,58 82,44 88,54" fill="#6C3483" />
        <polygon points="95,58 98,44 92,54" fill="#6C3483" />
        <polygon points="105,62 108,50 102,58" fill="#6C3483" />

        {/* Enraged fire breath particles */}
        {isEnraged && (
          <>
            <motion.circle
              cx="90"
              cy="62"
              r="3"
              fill="#E74C3C"
              animate={{ y: [0, 8], opacity: [0.8, 0], scale: [1, 1.5] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
            <motion.circle
              cx="82"
              cy="60"
              r="2"
              fill="#F39C12"
              animate={{ y: [0, 6], opacity: [0.6, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
            />
            <motion.circle
              cx="98"
              cy="60"
              r="2"
              fill="#F39C12"
              animate={{ y: [0, 6], opacity: [0.6, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.4 }}
            />
          </>
        )}
      </svg>
    </motion.div>
  );
}
