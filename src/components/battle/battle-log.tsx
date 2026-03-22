"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BattleLogEntry } from "@/types/battle";
import { cn } from "@/lib/utils";

interface BattleLogProps {
  logs: BattleLogEntry[];
  maxVisible?: number;
  className?: string;
}

const eventIcons: Record<string, string> = {
  damage: "⚔️",
  join: "🛡️",
  boss_defeated: "🏆",
};

export function BattleLog({
  logs,
  maxVisible = 5,
  className,
}: BattleLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleLogs = logs.slice(-maxVisible);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [logs.length]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900/60 p-3",
        className
      )}
    >
      <AnimatePresence initial={false}>
        {visibleLogs.map((log, i) => (
          <motion.div
            key={`${log.timestamp}-${i}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-2 border-b border-gray-800 py-1.5 last:border-0"
          >
            <span className="text-sm">{eventIcons[log.event] ?? "📝"}</span>
            <span className="flex-1 text-sm text-gray-300">{log.message}</span>
            <span className="whitespace-nowrap text-xs text-gray-600">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {logs.length === 0 && (
        <p className="text-center text-sm text-gray-600">
          Battle has not started yet...
        </p>
      )}
    </div>
  );
}
