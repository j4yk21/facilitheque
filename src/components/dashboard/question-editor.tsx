"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Question, QuestionType, Difficulty } from "@/types/question";

interface QuestionEditorProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 1, label: "Easy" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Hard" },
];

export function QuestionEditor({ questions, onChange }: QuestionEditorProps) {
  const addQuestion = (type: QuestionType) => {
    const newQ: Question = {
      id: crypto.randomUUID(),
      type,
      text: "",
      difficulty: 2,
      correct_answer: "",
      ...(type === "multiple_choice"
        ? { options: ["", "", "", ""] }
        : {}),
    };
    onChange([...questions, newQ]);
  };

  const updateQuestion = (index: number, patch: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...patch };
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    const opts = [...(updated[qIndex].options ?? [])];
    opts[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: opts };
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {questions.map((q, idx) => (
        <div
          key={q.id}
          className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">
              Q{idx + 1} —{" "}
              {q.type === "multiple_choice" ? "Multiple Choice" : "Short Answer"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeQuestion(idx)}
            >
              Remove
            </Button>
          </div>

          <Input
            label="Question text"
            id={`q-${q.id}-text`}
            value={q.text}
            onChange={(e) => updateQuestion(idx, { text: e.target.value })}
            placeholder="Enter your question..."
          />

          {/* Difficulty selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Difficulty:</span>
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                  q.difficulty === d.value
                    ? "bg-indigo-500 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                )}
                onClick={() => updateQuestion(idx, { difficulty: d.value })}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Options for MC */}
          {q.type === "multiple_choice" && q.options && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600">Options:</span>
              {q.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q-${q.id}-correct`}
                    checked={q.correct_answer === opt && opt !== ""}
                    onChange={() => updateQuestion(idx, { correct_answer: opt })}
                    className="accent-indigo-500"
                  />
                  <Input
                    id={`q-${q.id}-opt-${optIdx}`}
                    value={opt}
                    onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                    placeholder={`Option ${optIdx + 1}`}
                    className="flex-1"
                  />
                </div>
              ))}
              <p className="text-xs text-gray-400">
                Select the radio button next to the correct answer.
              </p>
            </div>
          )}

          {/* Correct answer for short answer */}
          {q.type === "short_answer" && (
            <Input
              label="Correct answer"
              id={`q-${q.id}-answer`}
              value={q.correct_answer}
              onChange={(e) =>
                updateQuestion(idx, { correct_answer: e.target.value })
              }
              placeholder="Expected answer..."
            />
          )}
        </div>
      ))}

      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => addQuestion("multiple_choice")}
        >
          + Multiple Choice
        </Button>
        <Button
          variant="secondary"
          onClick={() => addQuestion("short_answer")}
        >
          + Short Answer
        </Button>
      </div>
    </div>
  );
}
