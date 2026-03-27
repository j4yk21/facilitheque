import type { Question } from "@/types/question";

/**
 * Checks whether a student's answer is correct for a given question.
 *
 * Handling by type:
 *  - multiple_choice, short_answer, true_false, fill_blank:
 *      Case-insensitive trimmed string comparison.
 *  - ordering:
 *      JSON array comparison (answer is JSON string of string[]).
 *  - matching:
 *      Sorted JSON pairs comparison (answer is JSON string of {term,definition}[]).
 */
export function checkAnswer(question: Question, answer: string): boolean {
  switch (question.type) {
    case "ordering": {
      try {
        const submitted: string[] = JSON.parse(answer);
        const correct: string[] = question.items ?? [];
        if (submitted.length !== correct.length) return false;
        return submitted.every((item, i) => item === correct[i]);
      } catch {
        return false;
      }
    }

    case "matching": {
      try {
        const submitted: { term: string; definition: string }[] =
          JSON.parse(answer);
        const correct = question.pairs ?? [];
        if (submitted.length !== correct.length) return false;

        // Sort both arrays by term for order-independent comparison
        const sortByTerm = (
          a: { term: string; definition: string },
          b: { term: string; definition: string }
        ) => a.term.localeCompare(b.term);

        const sortedSubmitted = [...submitted].sort(sortByTerm);
        const sortedCorrect = [...correct].sort(sortByTerm);

        return sortedSubmitted.every(
          (pair, i) =>
            pair.term === sortedCorrect[i].term &&
            pair.definition === sortedCorrect[i].definition
        );
      } catch {
        return false;
      }
    }

    // multiple_choice, short_answer, true_false, fill_blank
    default: {
      return (
        answer.trim().toLowerCase() ===
        question.correct_answer.trim().toLowerCase()
      );
    }
  }
}
