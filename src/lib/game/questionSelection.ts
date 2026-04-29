import type { BoardSquare, Question } from "@/types/game";

export function selectQuestionForSquare(
  square: Pick<BoardSquare, "kind" | "value">,
  questions: Question[],
  usedQuestionIds: string[] = [],
) {
  const candidates =
    square.kind === "mine"
      ? questions
      : questions.filter((question) => question.pointValue === square.value);
  const unusedQuestion = candidates.find((question) => !usedQuestionIds.includes(question.id));

  return unusedQuestion ?? candidates[0] ?? questions[0];
}
