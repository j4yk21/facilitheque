"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Question, MatchingPair } from "@/types/question";

interface MatchingInputProps {
  question: Question;
  disabled: boolean;
  showResult: boolean;
  onSubmit: (answer: string) => void;
}

const PAIR_COLORS = [
  { bg: "bg-purple-900/40", border: "border-purple-500", text: "text-purple-300" },
  { bg: "bg-blue-900/40", border: "border-blue-500", text: "text-blue-300" },
  { bg: "bg-emerald-900/40", border: "border-emerald-500", text: "text-emerald-300" },
  { bg: "bg-amber-900/40", border: "border-amber-500", text: "text-amber-300" },
  { bg: "bg-rose-900/40", border: "border-rose-500", text: "text-rose-300" },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function MatchingInput({
  question,
  disabled,
  showResult,
  onSubmit,
}: MatchingInputProps) {
  const pairs = question.pairs ?? [];

  // Shuffle definitions on mount
  const shuffledDefinitions = useMemo(
    () => shuffleArray(pairs.map((p) => p.definition)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question.id]
  );

  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchingPair[]>([]);

  // Reset state when question changes
  useEffect(() => {
    setSelectedTerm(null);
    setMatches([]);
  }, [question.id]);

  const matchedTerms = new Set(matches.map((m) => m.term));
  const matchedDefs = new Set(matches.map((m) => m.definition));

  const getMatchIndex = (term: string): number => {
    return matches.findIndex((m) => m.term === term);
  };

  const getMatchIndexByDef = (def: string): number => {
    return matches.findIndex((m) => m.definition === def);
  };

  const handleTermClick = (term: string) => {
    if (disabled || showResult) return;

    // If already matched, unmatch it
    if (matchedTerms.has(term)) {
      setMatches(matches.filter((m) => m.term !== term));
      return;
    }

    setSelectedTerm(term === selectedTerm ? null : term);
  };

  const handleDefinitionClick = (definition: string) => {
    if (disabled || showResult || !selectedTerm) return;

    // If this definition is already matched, unmatch it first
    const newMatches = matches.filter((m) => m.definition !== definition);

    newMatches.push({ term: selectedTerm, definition });
    setMatches(newMatches);
    setSelectedTerm(null);
  };

  const handleSubmit = () => {
    onSubmit(JSON.stringify(matches));
  };

  const allMatched = matches.length === pairs.length;

  const getTermStyle = (term: string) => {
    const matchIdx = getMatchIndex(term);

    if (showResult) {
      const matchedPair = matches.find((m) => m.term === term);
      const correctDef = pairs.find((p) => p.term === term)?.definition;
      const isCorrect = matchedPair?.definition === correctDef;
      return isCorrect
        ? "border-green-500 bg-green-900/30 text-green-300"
        : "border-red-500 bg-red-900/30 text-red-300";
    }

    if (matchIdx >= 0) {
      const color = PAIR_COLORS[matchIdx % PAIR_COLORS.length];
      return `${color.border} ${color.bg} ${color.text}`;
    }

    if (selectedTerm === term) {
      return "border-purple-400 bg-purple-900/30 text-purple-200 ring-2 ring-purple-500/50";
    }

    return "border-gray-700 bg-gray-800 text-gray-200 hover:border-gray-500 hover:bg-gray-700";
  };

  const getDefStyle = (def: string) => {
    const matchIdx = getMatchIndexByDef(def);

    if (showResult) {
      const matchedPair = matches.find((m) => m.definition === def);
      const correctPair = pairs.find((p) => p.definition === def);
      const isCorrect = matchedPair?.term === correctPair?.term;
      return isCorrect
        ? "border-green-500 bg-green-900/30 text-green-300"
        : "border-red-500 bg-red-900/30 text-red-300";
    }

    if (matchIdx >= 0) {
      const color = PAIR_COLORS[matchIdx % PAIR_COLORS.length];
      return `${color.border} ${color.bg} ${color.text}`;
    }

    if (matchedDefs.has(def)) {
      return "border-gray-600 bg-gray-800/50 text-gray-500 opacity-60";
    }

    return selectedTerm
      ? "border-gray-600 bg-gray-800 text-gray-200 hover:border-purple-400 hover:bg-gray-700 cursor-pointer"
      : "border-gray-700 bg-gray-800 text-gray-300";
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Click a term on the left, then click its matching definition on the
        right. Click a matched term to undo.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Terms column */}
        <div className="space-y-2" role="list" aria-label="Terms">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Terms
          </span>
          {pairs.map((pair) => (
            <motion.button
              key={pair.term}
              whileHover={
                !disabled && !showResult ? { scale: 1.02 } : undefined
              }
              onClick={() => handleTermClick(pair.term)}
              disabled={disabled || showResult}
              role="listitem"
              aria-label={`Term: ${pair.term}`}
              aria-pressed={selectedTerm === pair.term}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all",
                getTermStyle(pair.term),
                (disabled || showResult) && "cursor-not-allowed"
              )}
            >
              {pair.term}
            </motion.button>
          ))}
        </div>

        {/* Definitions column */}
        <div className="space-y-2" role="list" aria-label="Definitions">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Definitions
          </span>
          {shuffledDefinitions.map((def) => (
            <motion.button
              key={def}
              whileHover={
                !disabled && !showResult && selectedTerm
                  ? { scale: 1.02 }
                  : undefined
              }
              onClick={() => handleDefinitionClick(def)}
              disabled={disabled || showResult || !selectedTerm}
              role="listitem"
              aria-label={`Definition: ${def}`}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                getDefStyle(def),
                (disabled || showResult || !selectedTerm) &&
                  "cursor-not-allowed"
              )}
            >
              {def}
            </motion.button>
          ))}
        </div>
      </div>

      {showResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-gray-700 bg-gray-800/50 p-3"
        >
          <p className="mb-1 text-xs font-medium text-gray-400">
            Correct pairs:
          </p>
          <ul className="space-y-0.5 text-sm text-gray-300">
            {pairs.map((pair, i) => (
              <li key={i}>
                <span className="font-medium">{pair.term}</span>
                {" → "}
                {pair.definition}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {!showResult && (
        <Button
          onClick={handleSubmit}
          disabled={disabled || !allMatched}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          Submit Matches{" "}
          {!allMatched && (
            <span className="text-purple-300">
              ({matches.length}/{pairs.length})
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
