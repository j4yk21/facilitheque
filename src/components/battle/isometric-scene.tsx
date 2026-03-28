"use client";

import { motion } from "framer-motion";
import { CharacterSprite } from "@/components/rpg/sprites/character-sprite";
import { BossSprite } from "@/components/rpg/sprites/boss-sprite";
import { BossHealthBar } from "./boss-health-bar";
import { DamageNumberContainer } from "./damage-number";
import { AttackEffectContainer } from "./attack-effects";
import type { CharacterClass } from "@/types/database";

export interface PartyMember {
  id: string;
  name: string;
  characterClass: CharacterClass;
  state: "idle" | "attack" | "hit" | "victory";
}

interface IsometricSceneProps {
  party: PartyMember[];
  bossName: string;
  currentBossHp: number;
  maxBossHp: number;
  floatingDamages: { id: string; value: number; playerName: string }[];
  attackEffects: { id: string; characterClass: CharacterClass; damage: number }[];
  onRemoveDamage: (id: string) => void;
  onRemoveEffect: (id: string) => void;
  screenShake: boolean;
}

/** Isometric tile (diamond shape) */
function IsoTile({
  x,
  y,
  color = "#1a1a2e",
  borderColor = "#2d2d4a",
  opacity = 1,
}: {
  x: number;
  y: number;
  color?: string;
  borderColor?: string;
  opacity?: number;
}) {
  // Convert grid coords to isometric screen coords
  const TILE_W = 64;
  const TILE_H = 32;
  const screenX = (x - y) * (TILE_W / 2);
  const screenY = (x + y) * (TILE_H / 2);

  return (
    <g
      transform={`translate(${screenX}, ${screenY})`}
      opacity={opacity}
    >
      <polygon
        points={`0,${-TILE_H / 2} ${TILE_W / 2},0 0,${TILE_H / 2} ${-TILE_W / 2},0`}
        fill={color}
        stroke={borderColor}
        strokeWidth="1"
      />
    </g>
  );
}

/** The isometric ground grid */
function IsoGrid() {
  const tiles: { x: number; y: number; color?: string; borderColor?: string; opacity?: number }[] = [];
  const GRID_SIZE = 7;

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      // Create subtle checkerboard
      const isLight = (x + y) % 2 === 0;
      // Fade edges
      const distFromCenter = Math.max(Math.abs(x - 3), Math.abs(y - 3));
      const opacity = distFromCenter >= 3 ? 0.3 : distFromCenter >= 2 ? 0.6 : 1;

      tiles.push({
        x,
        y,
        color: isLight ? "#1a1a3e" : "#16162e",
        borderColor: isLight ? "#2d2d5a" : "#252548",
        opacity,
      });
    }
  }

  return (
    <svg
      viewBox="-250 -30 500 260"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Ambient glow on ground */}
      <defs>
        <radialGradient id="groundGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.1" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="0" cy="100" rx="200" ry="80" fill="url(#groundGlow)" />

      <g transform="translate(0, 50)">
        {tiles.map((t) => (
          <IsoTile key={`${t.x}-${t.y}`} {...t} />
        ))}
      </g>
    </svg>
  );
}

export function IsometricScene({
  party,
  bossName,
  currentBossHp,
  maxBossHp,
  floatingDamages,
  attackEffects,
  onRemoveDamage,
  onRemoveEffect,
  screenShake,
}: IsometricSceneProps) {
  const hpPercent = maxBossHp > 0 ? (currentBossHp / maxBossHp) * 100 : 0;
  const bossDefeated = currentBossHp === 0 && maxBossHp > 0;

  // Position characters in a formation (left side)
  const partyPositions = [
    { bottom: "28%", left: "8%" },   // front row
    { bottom: "38%", left: "3%" },   // back row top
    { bottom: "18%", left: "3%" },   // back row bottom
    { bottom: "22%", left: "15%" },  // front mid
    { bottom: "34%", left: "12%" },  // mid
  ];

  return (
    <motion.div
      className="relative w-full overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-b from-[#0a0a1a] via-[#12122a] to-[#1a1a3e]"
      style={{ height: "420px" }}
      animate={
        screenShake
          ? { x: [0, -6, 6, -4, 4, -2, 2, 0] }
          : {}
      }
      transition={{ duration: 0.5 }}
    >
      {/* Stars/particles background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 50}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Boss HP bar at top */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[80%] max-w-md">
        <BossHealthBar
          currentHp={currentBossHp}
          maxHp={maxBossHp}
          bossName={bossName}
        />
      </div>

      {/* Isometric grid */}
      <IsoGrid />

      {/* Boss (right side) */}
      <motion.div
        className="absolute z-10"
        style={{ right: "8%", bottom: "20%" }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", delay: 0.3 }}
      >
        <BossSprite
          size={160}
          state={bossDefeated ? "defeated" : "idle"}
          hpPercent={hpPercent}
        />
      </motion.div>

      {/* Party members (left side) */}
      {party.map((member, index) => {
        const pos = partyPositions[index % partyPositions.length];
        return (
          <motion.div
            key={member.id}
            className="absolute z-10"
            style={pos}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 * index, type: "spring" }}
          >
            {/* Name tag */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-gray-300">
                {member.name}
              </span>
            </div>
            <CharacterSprite
              characterClass={member.characterClass}
              size={80}
              state={member.state}
              direction="right"
            />
          </motion.div>
        );
      })}

      {/* Attack effects overlay */}
      <div className="absolute inset-0 z-30" style={{ right: "5%", width: "50%", marginLeft: "auto" }}>
        <AttackEffectContainer
          effects={attackEffects}
          onRemove={onRemoveEffect}
        />
      </div>

      {/* Floating damage numbers */}
      <div className="absolute z-30" style={{ right: "5%", top: "15%", width: "200px", height: "200px" }}>
        <DamageNumberContainer
          damages={floatingDamages}
          onRemove={onRemoveDamage}
        />
      </div>

      {/* Vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-40"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </motion.div>
  );
}
