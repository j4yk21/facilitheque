"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Question } from "@/types/question";

interface TrueFalseInputProps {
  question: Question;
  disabled: boolean;
  showResult: boolean;
  onSubmit: (answer: string) => void;
}

export function TrueFalseInput({
  question,
  disabled,
  showResult,
  onSubmit,
}: TrueFalseInputProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const correctAnswer = question.correct_answer.trim().toLowerCase();

  const handleClick = (value: "True" | "False") => {
    if (disabled || showResult) return;
    setSelected(value);
    onSubmit(value);
  };

  const getButtonStyle = (value: "True" | "False") => {
    const isSelected = selected === value;
    const isCorrect = correctAnswer === value.toLowerCase();

    if (showResult && isSelected) {
      return isCorrect
        ? "border-green-500 bg-green-900/40 text-green-300"
        : "border-red-500 bg-red-900/40 text-red-300";
    }
    if (showResult && isCorrect) {
      return "border-green-500/50 bg-green-900/20 text-green-400";
    }
    if (isSelected) {
      return "border-purple-500 bg-purple-900/30 text-purple-200";
    }
    return "border-gray-700 bg-gray-800 text-gray-200 hover:border-gray-500 hover:bg-gray-700";
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <motion.button
        whileHover={!disabled && !showResult ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !showResult ? { scale: 0.98 } : undefined}
        onClick={() => handleClick("True")}
        disabled={disabled || showResult}
        aria-label="True"
        aria-pressed={selected === "True"}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-6 py-8 text-lg font-bold transition-all",
          getButtonStyle("True"),
          (disabled || showResult) && "cursor-not-allowed opacity-60"
        )}
      >
        <span className="text-3xl" aria-hidden="true">
          &#x2713;
        </span>
        True
      </motion.button>

      <motion.button
        whileHover={!disabled && !showResult ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !showResult ? { scale: 0.98 } : undefined}
        onClick={() => handleClick("False")}
        disabled={disabled || showResult}
        aria-label="False"
        aria-pressed={selected === "False"}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-6 py-8 text-lg font-bold transition-all",
          getButtonStyle("False"),
          (disabled || showResult) && "cursor-not-allowed opacity-60"
        )}
      >
        <span className="text-3xl" aria-hidden="true">
          &#x2717;
        </span>
        False
      </motion.button>
    </div>
  );
}
