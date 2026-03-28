"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { CharacterClass } from "@/types/database";

interface AttackEffectProps {
  id: string;
  characterClass: CharacterClass;
  damage: number;
  onComplete: (id: string) => void;
}

/** Sword slash effect */
function SlashEffect({ onComplete, id }: { onComplete: () => void; id: string }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      <motion.svg
        viewBox="0 0 200 200"
        className="h-40 w-40"
        initial={{ scale: 0.3, rotate: -45, opacity: 0 }}
        animate={{ scale: 1.2, rotate: 45, opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.5, times: [0, 0.2, 0.7, 1] }}
      >
        {/* Slash arc */}
        <motion.path
          d="M30 170 Q100 80 170 30"
          stroke="#F1C40F"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3 }}
        />
        <motion.path
          d="M40 160 Q100 90 160 40"
          stroke="#E74C3C"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        />
        {/* Impact sparks */}
        <motion.circle cx="170" cy="30" r="8" fill="#F39C12"
          initial={{ scale: 0 }} animate={{ scale: [0, 1.5, 0] }}
          transition={{ duration: 0.4, delay: 0.2 }}
        />
      </motion.svg>
    </motion.div>
  );
}

/** Magic orb + explosion effect */
function MagicEffect({ onComplete, id }: { onComplete: () => void; id: string }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {/* Magic orb traveling */}
      <motion.div
        className="absolute"
        initial={{ left: "10%", top: "50%", scale: 0.5 }}
        animate={{ left: "55%", top: "40%", scale: 1 }}
        transition={{ duration: 0.3, ease: "easeIn" }}
      >
        <motion.div
          className="h-8 w-8 rounded-full bg-blue-400"
          style={{
            boxShadow: "0 0 20px #3498DB, 0 0 40px #2980B9",
          }}
          animate={{
            scale: [1, 1.3, 0],
            boxShadow: [
              "0 0 20px #3498DB, 0 0 40px #2980B9",
              "0 0 40px #3498DB, 0 0 80px #2980B9",
              "0 0 0px transparent",
            ],
          }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
      </motion.div>
      {/* Explosion rings */}
      <motion.div
        className="absolute left-1/2 top-2/5"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div
          className="h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-blue-400"
          style={{ boxShadow: "0 0 15px #3498DB" }}
        />
      </motion.div>
    </motion.div>
  );
}

/** Arrow flying effect */
function ArrowEffect({ onComplete, id }: { onComplete: () => void; id: string }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      <motion.svg
        viewBox="0 0 200 60"
        className="absolute h-12 w-48"
        style={{ top: "45%" }}
        initial={{ x: "-100%", opacity: 1 }}
        animate={{ x: "80%", opacity: [1, 1, 0] }}
        transition={{ duration: 0.4, times: [0, 0.8, 1] }}
      >
        {/* Arrow shaft */}
        <line x1="10" y1="30" x2="160" y2="30" stroke="#8B4513" strokeWidth="3" />
        {/* Arrow head */}
        <polygon points="160,30 148,22 148,38" fill="#7F8C8D" />
        {/* Fletching */}
        <polygon points="10,30 18,22 18,30" fill="#E74C3C" />
        <polygon points="10,30 18,38 18,30" fill="#E74C3C" />
        {/* Speed lines */}
        <motion.line x1="20" y1="20" x2="60" y2="20" stroke="#F39C12" strokeWidth="1"
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.3 }}
        />
        <motion.line x1="30" y1="40" x2="70" y2="40" stroke="#F39C12" strokeWidth="1"
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.3, delay: 0.05 }}
        />
      </motion.svg>
      {/* Impact */}
      <motion.div
        className="absolute right-[15%] top-[42%]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <div className="h-6 w-6 rounded-full bg-yellow-400" style={{ boxShadow: "0 0 15px #F39C12" }} />
      </motion.div>
    </motion.div>
  );
}

/** Heal burst effect (healer attacks by empowering the team) */
function HealEffect({ onComplete, id }: { onComplete: () => void; id: string }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {/* Green energy burst */}
      <motion.div
        className="absolute"
        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 2, 2.5], opacity: [1, 0.7, 0] }}
        transition={{ duration: 0.8 }}
      >
        <div
          className="h-20 w-20 rounded-full border-4 border-green-400"
          style={{ boxShadow: "0 0 30px #2ECC71, inset 0 0 20px #2ECC71" }}
        />
      </motion.div>
      {/* Floating crosses */}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <motion.div
          key={angle}
          className="absolute text-2xl text-green-400 font-bold"
          style={{
            left: "50%",
            top: "50%",
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
          animate={{
            x: Math.cos((angle * Math.PI) / 180) * 60,
            y: Math.sin((angle * Math.PI) / 180) * 60,
            opacity: 0,
            scale: 1.2,
          }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          +
        </motion.div>
      ))}
    </motion.div>
  );
}

export function AttackEffect({ id, characterClass, damage, onComplete }: AttackEffectProps) {
  const handleComplete = () => onComplete(id);

  switch (characterClass) {
    case "warrior":
      return <SlashEffect id={id} onComplete={handleComplete} />;
    case "mage":
      return <MagicEffect id={id} onComplete={handleComplete} />;
    case "scout":
      return <ArrowEffect id={id} onComplete={handleComplete} />;
    case "healer":
      return <HealEffect id={id} onComplete={handleComplete} />;
    default:
      return <SlashEffect id={id} onComplete={handleComplete} />;
  }
}

interface AttackEffectContainerProps {
  effects: { id: string; characterClass: CharacterClass; damage: number }[];
  onRemove: (id: string) => void;
}

export function AttackEffectContainer({ effects, onRemove }: AttackEffectContainerProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {effects.map((e) => (
          <AttackEffect
            key={e.id}
            id={e.id}
            characterClass={e.characterClass}
            damage={e.damage}
            onComplete={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
