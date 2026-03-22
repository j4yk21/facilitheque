"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatXP } from "@/lib/utils";

interface VictoryScreenProps {
  bossName: string;
  totalDamage: number;
  xpEarned: number;
  onContinue: () => void;
}

export function VictoryScreen({
  bossName,
  totalDamage,
  xpEarned,
  onContinue,
}: VictoryScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-[70vh] flex-col items-center justify-center gap-8 text-center"
    >
      {/* Trophy animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        className="text-8xl"
      >
        🏆
      </motion.div>

      {/* Victory text */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h1 className="mb-2 text-4xl font-black text-yellow-400">
          VICTORY!
        </h1>
        <p className="text-lg text-gray-300">
          <span className="font-bold text-red-400">{bossName}</span> has been
          defeated!
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex gap-8"
      >
        <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-8 py-4 text-center">
          <p className="text-3xl font-bold text-red-400">{totalDamage}</p>
          <p className="text-sm text-gray-400">Damage Dealt</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-8 py-4 text-center">
          <p className="text-3xl font-bold text-cyan-400">
            {formatXP(xpEarned)}
          </p>
          <p className="text-sm text-gray-400">XP Earned</p>
        </div>
      </motion.div>

      {/* Continue button */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        <Button
          onClick={onContinue}
          size="lg"
          className="bg-yellow-500 text-gray-900 hover:bg-yellow-400"
        >
          Continue
        </Button>
      </motion.div>
    </motion.div>
  );
}
