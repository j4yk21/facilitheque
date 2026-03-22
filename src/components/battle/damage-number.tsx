"use client";

import { motion, AnimatePresence } from "framer-motion";

interface DamageNumberProps {
  id: string;
  value: number;
  playerName: string;
  onComplete: (id: string) => void;
}

export function DamageNumber({
  id,
  value,
  playerName,
  onComplete,
}: DamageNumberProps) {
  return (
    <motion.div
      className="pointer-events-none absolute text-center"
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -80, scale: 1.2 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      onAnimationComplete={() => onComplete(id)}
      style={{
        left: `${30 + Math.random() * 40}%`,
        top: `${20 + Math.random() * 20}%`,
      }}
    >
      <span className="text-3xl font-black text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        -{value}
      </span>
      <span className="block text-xs text-yellow-200">{playerName}</span>
    </motion.div>
  );
}

interface DamageNumberContainerProps {
  damages: { id: string; value: number; playerName: string }[];
  onRemove: (id: string) => void;
}

export function DamageNumberContainer({
  damages,
  onRemove,
}: DamageNumberContainerProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {damages.map((d) => (
          <DamageNumber
            key={d.id}
            id={d.id}
            value={d.value}
            playerName={d.playerName}
            onComplete={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
