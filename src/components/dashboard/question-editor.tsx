"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Question, QuestionType, Difficulty, MatchingPair } from "@/types/question";

interface QuestionEditorProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 1, label: "Easy" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Hard" },
];

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  short_answer: "Short Answer",
  true_false: "True / False",
  ordering: "Ordering",
  matching: "Matching",
  fill_blank: "Fill in the Blank",
};

export function QuestionEditor({ questions, onChange }: QuestionEditorProps) {
  const addQuestion = (type: QuestionType) => {
    const base: Question = {
      id: crypto.randomUUID(),
      type,
      text: "",
      difficulty: 2,
      correct_answer: "",
    };

    switch (type) {
      case "multiple_choice":
        base.options = ["", "", "", ""];
        break;
      case "true_false":
        base.correct_answer = "True";
        break;
      case "ordering":
        base.items = ["", "", ""];
        break;
      case "matching":
        base.pairs = [
          { term: "", definition: "" },
          { term: "", definition: "" },
        ];
        break;
      case "fill_blank":
        base.text = "The ___ is the answer.";
        break;
    }

    onChange([...questions, base]);
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

  const updateItem = (qIndex: number, itemIndex: number, value: string) => {
    const updated = [...questions];
    const items = [...(updated[qIndex].items ?? [])];
    items[itemIndex] = value;
    updated[qIndex] = { ...updated[qIndex], items };
    onChange(updated);
  };

  const addItem = (qIndex: number) => {
    const updated = [...questions];
    const items = [...(updated[qIndex].items ?? [])];
    if (items.length >= 5) return;
    items.push("");
    updated[qIndex] = { ...updated[qIndex], items };
    onChange(updated);
  };

  const removeItem = (qIndex: number, itemIndex: number) => {
    const updated = [...questions];
    const items = [...(updated[qIndex].items ?? [])];
    if (items.length <= 3) return;
    items.splice(itemIndex, 1);
    updated[qIndex] = { ...updated[qIndex], items };
    onChange(updated);
  };

  const updatePair = (
    qIndex: number,
    pairIndex: number,
    field: "term" | "definition",
    value: string
  ) => {
    const updated = [...questions];
    const pairs = [...(updated[qIndex].pairs ?? [])];
    pairs[pairIndex] = { ...pairs[pairIndex], [field]: value };
    updated[qIndex] = { ...updated[qIndex], pairs };
    onChange(updated);
  };

  const addPair = (qIndex: number) => {
    const updated = [...questions];
    const pairs = [...(updated[qIndex].pairs ?? [])];
    pairs.push({ term: "", definition: "" });
    updated[qIndex] = { ...updated[qIndex], pairs };
    onChange(updated);
  };

  const removePair = (qIndex: number, pairIndex: number) => {
    const updated = [...questions];
    const pairs = [...(updated[qIndex].pairs ?? [])];
    if (pairs.length <= 2) return;
    pairs.splice(pairIndex, 1);
    updated[qIndex] = { ...updated[qIndex], pairs };
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
              Q{idx + 1} — {TYPE_LABELS[q.type]}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeQuestion(idx)}
            >
              Remove
            </Button>
          </div>

          {/* Question text */}
          <Input
            label={
              q.type === "fill_blank"
                ? 'Question text (use "___" for the blank)'
                : "Question text"
            }
            id={`q-${q.id}-text`}
            value={q.text}
            onChange={(e) => updateQuestion(idx, { text: e.target.value })}
            placeholder={
              q.type === "fill_blank"
                ? "The ___ is the largest planet..."
                : "Enter your question..."
            }
          />

          {/* Difficulty selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">
              Difficulty:
            </span>
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

          {/* --- TYPE-SPECIFIC EDITORS --- */}

          {/* Multiple Choice: options with radio for correct */}
          {q.type === "multiple_choice" && q.options && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600">
                Options:
              </span>
              {q.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q-${q.id}-correct`}
                    checked={q.correct_answer === opt && opt !== ""}
                    onChange={() => updateQuestion(idx, { correct_answer: opt })}
                    className="accent-indigo-500"
                    aria-label={`Mark option ${optIdx + 1} as correct`}
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

          {/* Short Answer: correct answer text input */}
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

          {/* True/False: toggle for correct answer */}
          {q.type === "true_false" && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600">
                Correct answer:
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    updateQuestion(idx, { correct_answer: "True" })
                  }
                  className={cn(
                    "rounded-lg px-6 py-2 text-sm font-semibold transition-colors",
                    q.correct_answer === "True"
                      ? "bg-green-500 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
                  )}
                  aria-pressed={q.correct_answer === "True"}
                >
                  True
                </button>
                <button
                  onClick={() =>
                    updateQuestion(idx, { correct_answer: "False" })
                  }
                  className={cn(
                    "rounded-lg px-6 py-2 text-sm font-semibold transition-colors",
                    q.correct_answer === "False"
                      ? "bg-red-500 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
                  )}
                  aria-pressed={q.correct_answer === "False"}
                >
                  False
                </button>
              </div>
            </div>
          )}

          {/* Ordering: list of items in correct order */}
          {q.type === "ordering" && q.items && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600">
                Items (in correct order):
              </span>
              {q.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex items-center gap-2">
                  <span className="w-6 text-center text-sm font-mono text-gray-400">
                    {itemIdx + 1}.
                  </span>
                  <Input
                    id={`q-${q.id}-item-${itemIdx}`}
                    value={item}
                    onChange={(e) => updateItem(idx, itemIdx, e.target.value)}
                    placeholder={`Item ${itemIdx + 1}`}
                    className="flex-1"
                  />
                  {q.items!.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(idx, itemIdx)}
                      aria-label={`Remove item ${itemIdx + 1}`}
                    >
                      X
                    </Button>
                  )}
                </div>
              ))}
              {q.items.length < 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addItem(idx)}
                >
                  + Add Item
                </Button>
              )}
              <p className="text-xs text-gray-400">
                Enter items in the correct order. Students will see them
                shuffled. Min 3, max 5 items.
              </p>
            </div>
          )}

          {/* Matching: term-definition pairs */}
          {q.type === "matching" && q.pairs && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600">
                Term / Definition pairs:
              </span>
              {q.pairs.map((pair, pairIdx) => (
                <div key={pairIdx} className="flex items-center gap-2">
                  <Input
                    id={`q-${q.id}-pair-${pairIdx}-term`}
                    value={pair.term}
                    onChange={(e) =>
                      updatePair(idx, pairIdx, "term", e.target.value)
                    }
                    placeholder="Term"
                    className="flex-1"
                  />
                  <span className="text-gray-400 text-sm">→</span>
                  <Input
                    id={`q-${q.id}-pair-${pairIdx}-def`}
                    value={pair.definition}
                    onChange={(e) =>
                      updatePair(idx, pairIdx, "definition", e.target.value)
                    }
                    placeholder="Definition"
                    className="flex-1"
                  />
                  {q.pairs!.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePair(idx, pairIdx)}
                      aria-label={`Remove pair ${pairIdx + 1}`}
                    >
                      X
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addPair(idx)}
              >
                + Add Pair
              </Button>
              <p className="text-xs text-gray-400">
                Students will see terms on the left and shuffled definitions on
                the right. Min 2 pairs.
              </p>
            </div>
          )}

          {/* Fill in the Blank: correct answer input */}
          {q.type === "fill_blank" && (
            <Input
              label="Correct answer (the word that fills the blank)"
              id={`q-${q.id}-blank-answer`}
              value={q.correct_answer}
              onChange={(e) =>
                updateQuestion(idx, { correct_answer: e.target.value })
              }
              placeholder="Expected answer..."
            />
          )}
        </div>
      ))}

      {/* Add question buttons */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        <Button
          variant="secondary"
          onClick={() => addQuestion("true_false")}
        >
          + True / False
        </Button>
        <Button
          variant="secondary"
          onClick={() => addQuestion("ordering")}
        >
          + Ordering
        </Button>
        <Button
          variant="secondary"
          onClick={() => addQuestion("matching")}
        >
          + Matching
        </Button>
        <Button
          variant="secondary"
          onClick={() => addQuestion("fill_blank")}
        >
          + Fill in the Blank
        </Button>
      </div>
    </div>
  );
}
