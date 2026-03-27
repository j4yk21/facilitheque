"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Question } from "@/types/question";

interface OrderingInputProps {
  question: Question;
  disabled: boolean;
  showResult: boolean;
  onSubmit: (answer: string) => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function OrderingInput({
  question,
  disabled,
  showResult,
  onSubmit,
}: OrderingInputProps) {
  const correctOrder = question.items ?? [];
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    // Shuffle on mount, ensure it's not already in correct order
    let shuffled = shuffleArray(correctOrder);
    // If the shuffled order happens to match correct, shuffle once more
    if (
      shuffled.length > 1 &&
      shuffled.every((item, i) => item === correctOrder[i])
    ) {
      shuffled = shuffleArray(correctOrder);
    }
    setItems(shuffled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const moveItem = useCallback(
    (index: number, direction: "up" | "down") => {
      if (disabled || showResult) return;
      const newItems = [...items];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newItems.length) return;
      [newItems[index], newItems[targetIndex]] = [
        newItems[targetIndex],
        newItems[index],
      ];
      setItems(newItems);
    },
    [items, disabled, showResult]
  );

  const handleSubmit = () => {
    onSubmit(JSON.stringify(items));
  };

  const getItemStyle = (item: string, index: number) => {
    if (!showResult) {
      return "border-gray-700 bg-gray-800 text-gray-200";
    }
    // Show whether each item is in the correct position
    const isCorrectPosition = correctOrder[index] === item;
    return isCorrectPosition
      ? "border-green-500 bg-green-900/30 text-green-300"
      : "border-red-500 bg-red-900/30 text-red-300";
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">
        Arrange the items in the correct order using the arrow buttons.
      </p>

      <div className="space-y-2" role="list" aria-label="Orderable items">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <motion.div
              key={item}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              role="listitem"
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                getItemStyle(item, index)
              )}
            >
              <span className="flex-shrink-0 font-mono text-sm text-gray-500">
                {index + 1}.
              </span>
              <span className="flex-1">{item}</span>

              {!showResult && (
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveItem(index, "up")}
                    disabled={disabled || index === 0}
                    aria-label={`Move "${item}" up`}
                    className="rounded px-2 py-0.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    &#9650;
                  </button>
                  <button
                    onClick={() => moveItem(index, "down")}
                    disabled={disabled || index === items.length - 1}
                    aria-label={`Move "${item}" down`}
                    className="rounded px-2 py-0.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    &#9660;
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-gray-700 bg-gray-800/50 p-3"
        >
          <p className="mb-1 text-xs font-medium text-gray-400">
            Correct order:
          </p>
          <ol className="list-decimal list-inside space-y-0.5 text-sm text-gray-300">
            {correctOrder.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </motion.div>
      )}

      {!showResult && (
        <Button
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          Submit Order
        </Button>
      )}
    </div>
  );
}
