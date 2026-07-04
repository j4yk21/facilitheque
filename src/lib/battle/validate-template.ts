import type { Question } from "@/types/question";

/**
 * Normalizes questions before validation and saving: trims text fields and
 * drops empty options/items/incomplete pairs. Without this, half-filled
 * editor rows (the editor pre-creates empty slots) are stored as-is and
 * show up as blank buttons during battle.
 */
export function sanitizeQuestions(questions: Question[]): Question[] {
  return questions.map((q) => {
    const clean: Question = {
      ...q,
      text: q.text?.trim() ?? "",
      correct_answer: q.correct_answer?.trim() ?? "",
    };

    if (q.options) {
      clean.options = q.options.map((o) => o.trim()).filter(Boolean);
    }
    if (q.items) {
      clean.items = q.items.map((it) => it.trim()).filter(Boolean);
    }
    if (q.pairs) {
      clean.pairs = q.pairs
        .map((p) => ({ term: p.term.trim(), definition: p.definition.trim() }))
        .filter((p) => p.term && p.definition);
    }

    return clean;
  });
}

/**
 * Validates a template's questions before saving.
 *
 * Each question type has different required fields (ordering uses `items`,
 * matching uses `pairs`, the rest use `correct_answer`), so a blanket
 * "correct_answer is required" check would reject valid ordering/matching
 * questions.
 *
 * Returns an error message for the first invalid question, or null if all
 * questions are valid.
 */
export function validateQuestions(questions: Question[]): string | null {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const label = `Question ${i + 1}`;

    if (!q.text?.trim()) {
      return `${label}: text is required`;
    }

    switch (q.type) {
      case "multiple_choice": {
        const options = (q.options ?? []).filter((o) => o.trim());
        if (options.length < 2) {
          return `${label}: multiple choice needs at least 2 options`;
        }
        if (!q.correct_answer?.trim()) {
          return `${label}: a correct answer is required`;
        }
        const answer = q.correct_answer.trim().toLowerCase();
        if (!options.some((o) => o.trim().toLowerCase() === answer)) {
          return `${label}: the correct answer must be one of the options`;
        }
        break;
      }

      case "true_false": {
        if (!/^(true|false)$/i.test(q.correct_answer?.trim() ?? "")) {
          return `${label}: the correct answer must be True or False`;
        }
        break;
      }

      case "fill_blank": {
        if (!q.text.includes("___")) {
          return `${label}: fill-in-the-blank text must contain the ___ marker`;
        }
        if (!q.correct_answer?.trim()) {
          return `${label}: a correct answer is required`;
        }
        break;
      }

      case "ordering": {
        const items = (q.items ?? []).filter((it) => it.trim());
        if (items.length < 2) {
          return `${label}: ordering needs at least 2 items`;
        }
        break;
      }

      case "matching": {
        const pairs = (q.pairs ?? []).filter(
          (p) => p.term.trim() && p.definition.trim()
        );
        if (pairs.length < 2) {
          return `${label}: matching needs at least 2 complete pairs`;
        }
        break;
      }

      // short_answer
      default: {
        if (!q.correct_answer?.trim()) {
          return `${label}: a correct answer is required`;
        }
      }
    }
  }

  return null;
}
