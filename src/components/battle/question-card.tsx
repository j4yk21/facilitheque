"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Question } from "@/types/question";

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  disabled?: boolean;
}

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  onAnswer,
  disabled = false,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = (answer: string) => {
    const correct =
      answer.trim().toLowerCase() ===
      question.correct_answer.trim().toLowerCase();

    setIsCorrect(correct);
    setShowResult(true);

    setTimeout(() => {
      onAnswer(answer, correct);
      setSelected(null);
      setTextAnswer("");
      setShowResult(false);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl rounded-xl border border-gray-700 bg-gray-900/80 p-6"
    >
      {/* Question counter */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Question {questionIndex + 1} / {totalQuestions}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            question.difficulty === 1 && "bg-green-900 text-green-300",
            question.difficulty === 2 && "bg-yellow-900 text-yellow-300",
            question.difficulty === 3 && "bg-red-900 text-red-300"
          )}
        >
          {question.difficulty === 1
            ? "Easy"
            : question.difficulty === 2
              ? "Medium"
              : "Hard"}
        </span>
      </div>

      {/* Question text */}
      <h3 className="mb-6 text-xl font-semibold text-white">{question.text}</h3>

      {/* Result feedback */}
      {showResult && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "mb-4 rounded-lg px-4 py-3 text-center text-sm font-medium",
            isCorrect
              ? "bg-green-900/50 text-green-300"
              : "bg-orange-900/50 text-orange-300"
          )}
        >
          {isCorrect
            ? "Correct! You dealt damage to the boss!"
            : "Not quite — but keep fighting! No penalty."}
        </motion.div>
      )}

      {/* Multiple choice options */}
      {question.type === "multiple_choice" && question.options && (
        <div className="space-y-3">
          {question.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (disabled || showResult) return;
                setSelected(option);
                handleSubmit(option);
              }}
              disabled={disabled || showResult}
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-left transition-all",
                selected === option
                  ? showResult
                    ? isCorrect
                      ? "border-green-500 bg-green-900/30 text-green-300"
                      : "border-orange-500 bg-orange-900/30 text-orange-300"
                    : "border-purple-500 bg-purple-900/30 text-purple-200"
                  : "border-gray-700 bg-gray-800 text-gray-200 hover:border-gray-500 hover:bg-gray-700",
                (disabled || showResult) && "cursor-not-allowed opacity-60"
              )}
            >
              <span className="mr-3 font-mono text-sm text-gray-500">
                {String.fromCharCode(65 + idx)}.
              </span>
              {option}
            </button>
          ))}
        </div>
      )}

      {/* Short answer input */}
      {question.type === "short_answer" && (
        <div className="space-y-3">
          <input
            type="text"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && textAnswer.trim()) {
                handleSubmit(textAnswer);
              }
            }}
            disabled={disabled || showResult}
            placeholder="Type your answer..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
          <Button
            onClick={() => handleSubmit(textAnswer)}
            disabled={disabled || showResult || !textAnswer.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Submit Answer
          </Button>
        </div>
      )}
    </motion.div>
  );
}
