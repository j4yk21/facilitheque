"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Question } from "@/types/question";

interface FillBlankInputProps {
  question: Question;
  disabled: boolean;
  showResult: boolean;
  onSubmit: (answer: string) => void;
}

export function FillBlankInput({
  question,
  disabled,
  showResult,
  onSubmit,
}: FillBlankInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value);
    }
  };

  // Split the question text around the blank marker "___"
  const parts = question.text.split("___");
  const hasBlank = parts.length > 1;

  return (
    <div className="space-y-4">
      {hasBlank && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-4 text-lg leading-relaxed text-gray-200"
        >
          {parts.map((part, index) => (
            <span key={index}>
              {part}
              {index < parts.length - 1 && (
                <span className="inline-block mx-1 align-middle">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && value.trim()) {
                        handleSubmit();
                      }
                    }}
                    disabled={disabled || showResult}
                    placeholder="..."
                    aria-label="Fill in the blank"
                    className={cn(
                      "inline-block w-40 rounded-md border-b-2 bg-gray-900 px-2 py-1 text-center text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/30",
                      showResult
                        ? value.trim().toLowerCase() ===
                          question.correct_answer.trim().toLowerCase()
                          ? "border-green-500 text-green-300"
                          : "border-red-500 text-red-300"
                        : "border-purple-500 text-white",
                      (disabled || showResult) && "cursor-not-allowed"
                    )}
                  />
                </span>
              )}
            </span>
          ))}
        </motion.div>
      )}

      {showResult && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-gray-400"
        >
          Correct answer:{" "}
          <span className="font-semibold text-green-400">
            {question.correct_answer}
          </span>
        </motion.p>
      )}

      {!showResult && (
        <Button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          Submit Answer
        </Button>
      )}
    </div>
  );
}
