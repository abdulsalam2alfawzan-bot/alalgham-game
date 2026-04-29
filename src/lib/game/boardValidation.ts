import type { BoardSquare } from "@/types/game";
import { boardDistribution, boardSize } from "./constants";

export type BoardValidationResult = {
  valid: boolean;
  remaining: Record<string, number>;
  message: string;
};

function squareKey(square: Pick<BoardSquare, "kind" | "value">) {
  return square.kind === "mine" ? "mine" : String(square.value);
}

export function validateBoardDistribution(squares: Pick<BoardSquare, "kind" | "value">[]): BoardValidationResult {
  const required = Object.fromEntries(
    boardDistribution.map((item) => [item.kind === "mine" ? "mine" : String(item.value), item.count]),
  ) as Record<string, number>;
  const used = squares.reduce<Record<string, number>>((counts, square) => {
    const key = squareKey(square);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const remaining = Object.fromEntries(
    Object.entries(required).map(([key, count]) => [key, count - (used[key] ?? 0)]),
  ) as Record<string, number>;
  const valid =
    squares.length === boardSize &&
    Object.entries(remaining).every(([, count]) => count === 0) &&
    Object.entries(used).every(([key, count]) => required[key] === count);

  return {
    valid,
    remaining,
    message: valid ? "اللوحة صحيحة وجاهزة" : "أكمل توزيع اللوحة حسب الأعداد المطلوبة",
  };
}
