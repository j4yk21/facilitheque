"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { checkAnswer } from "@/lib/battle/check-answer";
import { TrueFalseInput } from "./question-types/true-false-input";
import { OrderingInput } from "./question-types/ordering-input";
import { MatchingInput } from "./question-types/matching-input";
import { FillBlankInput } from "./question-types/fill-blank-input";
import type { Question } from "@/types/question";

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  /**
   * Server-side validation (submit_answer RPC). When provided, the local
   * checkAnswer is skipped — sanitized questions carry no solutions.
   * Return { error } for a failure the student must see (they can retry),
   * or null for a failure already handled elsewhere.
   */
  checkAnswerAsync?: (
    answer: string
  ) => Promise<{ isCorrect: boolean } | { error: string } | null>;
  disabled?: boolean;
}

const SUBMIT_ERROR_MESSAGES: Record<string, string> = {
  session_inactive:
    "La session a été mise en pause ou terminée par ton professeur.",
  failed:
    "Impossible d'envoyer ta réponse — vérifie ta connexion et réessaie.",
};

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  onAnswer,
  checkAnswerAsync,
  disabled = false,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (answer: string) => {
    let correct: boolean;

    if (checkAnswerAsync) {
      setChecking(true);
      setSubmitError(null);
      const result = await checkAnswerAsync(answer);
      setChecking(false);
      if (!result) return; // failure already handled by the caller
      if ("error" in result) {
        setSubmitError(
          SUBMIT_ERROR_MESSAGES[result.error] ?? SUBMIT_ERROR_MESSAGES.failed
        );
        return;
      }
      correct = result.isCorrect;
    } else {
      correct = checkAnswer(question, answer);
    }

    setIsCorrect(correct);
    setShowResult(true);

    setTimeout(() => {
      onAnswer(answer, correct);
      setSelected(null);
      setTextAnswer("");
      setShowResult(false);
    }, 1500);
  };

  // While a server check is in flight, lock the inputs
  const isDisabled = disabled || checking;

  const questionTypeLabel: Record<string, string> = {
    multiple_choice: "Multiple Choice",
    short_answer: "Short Answer",
    true_false: "True / False",
    ordering: "Ordering",
    matching: "Matching",
    fill_blank: "Fill in the Blank",
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
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-400">
            {questionTypeLabel[question.type] ?? question.type}
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
      </div>

      {/* Question text (for non-fill_blank, or fill_blank without ___ in text) */}
      {question.type !== "fill_blank" && (
        <h3 className="mb-6 text-xl font-semibold text-white">
          {question.text}
        </h3>
      )}
      {question.type === "fill_blank" && !question.text.includes("___") && (
        <h3 className="mb-6 text-xl font-semibold text-white">
          {question.text}
        </h3>
      )}

      {/* Submission error (network, paused/ended session) */}
      {submitError && !showResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 rounded-lg bg-red-900/40 px-4 py-3 text-center text-sm font-medium text-red-300"
        >
          {submitError}
        </motion.div>
      )}

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
            : "Not quite -- but keep fighting! No penalty."}
        </motion.div>
      )}

      {/* Multiple choice options */}
      {question.type === "multiple_choice" && question.options && (
        <div className="space-y-3">
          {question.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (isDisabled || showResult) return;
                setSelected(option);
                handleSubmit(option);
              }}
              disabled={isDisabled || showResult}
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-left transition-all",
                selected === option
                  ? showResult
                    ? isCorrect
                      ? "border-green-500 bg-green-900/30 text-green-300"
                      : "border-orange-500 bg-orange-900/30 text-orange-300"
                    : "border-purple-500 bg-purple-900/30 text-purple-200"
                  : "border-gray-700 bg-gray-800 text-gray-200 hover:border-gray-500 hover:bg-gray-700",
                (isDisabled || showResult) && "cursor-not-allowed opacity-60"
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
            disabled={isDisabled || showResult}
            placeholder="Type your answer..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
          <Button
            onClick={() => handleSubmit(textAnswer)}
            disabled={isDisabled || showResult || !textAnswer.trim()}
            isLoading={checking}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Submit Answer
          </Button>
        </div>
      )}

      {/* True/False */}
      {question.type === "true_false" && (
        <TrueFalseInput
          question={question}
          disabled={isDisabled}
          showResult={showResult}
          onSubmit={handleSubmit}
        />
      )}

      {/* Ordering */}
      {question.type === "ordering" && (
        <OrderingInput
          question={question}
          disabled={isDisabled}
          showResult={showResult}
          onSubmit={handleSubmit}
        />
      )}

      {/* Matching */}
      {question.type === "matching" && (
        <MatchingInput
          question={question}
          disabled={isDisabled}
          showResult={showResult}
          onSubmit={handleSubmit}
        />
      )}

      {/* Fill in the blank */}
      {question.type === "fill_blank" && (
        <FillBlankInput
          question={question}
          disabled={isDisabled}
          showResult={showResult}
          onSubmit={handleSubmit}
        />
      )}
    </motion.div>
  );
}
