"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BossHealthBarProps {
  currentHp: number;
  maxHp: number;
  bossName: string;
  className?: string;
}

export function BossHealthBar({
  currentHp,
  maxHp,
  bossName,
  className,
}: BossHealthBarProps) {
  const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
  const isLow = hpPercent <= 25;
  const isCritical = hpPercent <= 10;

  return (
    <div className={cn("w-full", className)}>
      {/* Boss name & HP values */}
      <div className="mb-2 flex items-end justify-between">
        <h2 className="text-xl font-bold text-red-400">{bossName}</h2>
        <span className="font-mono text-sm text-gray-400">
          {currentHp.toLocaleString()} / {maxHp.toLocaleString()} HP
        </span>
      </div>

      {/* HP bar track */}
      <div className="relative h-8 overflow-hidden rounded-full bg-gray-800 shadow-inner">
        {/* Animated HP fill */}
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            isCritical
              ? "bg-gradient-to-r from-red-700 to-red-500"
              : isLow
                ? "bg-gradient-to-r from-orange-600 to-red-500"
                : "bg-gradient-to-r from-red-600 to-red-400"
          )}
          initial={false}
          animate={{ width: `${hpPercent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />

        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />

        {/* HP percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white drop-shadow-md">
            {Math.round(hpPercent)}%
          </span>
        </div>
      </div>

      {/* Low HP pulse animation */}
      {isLow && currentHp > 0 && (
        <motion.p
          className="mt-1 text-center text-xs text-red-400"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {isCritical ? "Boss is almost defeated!" : "Boss is weakening!"}
        </motion.p>
      )}
    </div>
  );
}
