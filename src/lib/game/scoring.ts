import type { BoardSquare, Team } from "@/types/game";

export type ScoreResolution = {
  attackerChange: number;
  ownerChange: number;
  message: string;
  finalState:
    | "attacker_won_points"
    | "transfer_to_owner"
    | "owner_won_points"
    | "owner_lost_half"
    | "mine_defused"
    | "mine_exploded";
};

export function canUseDouble(team: Pick<Team, "doubleAvailable">) {
  return team.doubleAvailable;
}

export function markDoubleUsed<T extends Pick<Team, "doubleAvailable">>(team: T): T {
  return { ...team, doubleAvailable: false };
}

export function resolvePointSquare({
  pointValue,
  useDouble,
  attackerCorrect,
  ownerCorrect,
}: {
  pointValue: number;
  useDouble: boolean;
  attackerCorrect: boolean;
  ownerCorrect?: boolean;
}): ScoreResolution {
  if (attackerCorrect) {
    const wonPoints = useDouble ? pointValue * 2 : pointValue;
    return {
      attackerChange: wonPoints,
      ownerChange: 0,
      message: `المهاجم كسب ${wonPoints} نقطة`,
      finalState: "attacker_won_points",
    };
  }

  if (ownerCorrect === undefined) {
    return {
      attackerChange: 0,
      ownerChange: 0,
      message: "الإجابة انتقلت إلى صاحب اللوحة",
      finalState: "transfer_to_owner",
    };
  }

  if (ownerCorrect) {
    return {
      attackerChange: 0,
      ownerChange: pointValue,
      message: `صاحب اللوحة كسب ${pointValue} نقطة`,
      finalState: "owner_won_points",
    };
  }

  return {
    attackerChange: 0,
    ownerChange: -Math.floor(pointValue / 2),
    message: `صاحب اللوحة خسر ${Math.floor(pointValue / 2)} نقطة`,
    finalState: "owner_lost_half",
  };
}

export function resolveMineSquare({
  useDouble,
  attackerCorrect,
}: {
  useDouble: boolean;
  attackerCorrect: boolean;
}): ScoreResolution {
  if (attackerCorrect) {
    return {
      attackerChange: 0,
      ownerChange: 0,
      message: "تم تفكيك اللغم بدون خصم",
      finalState: "mine_defused",
    };
  }

  const penalty = useDouble ? 1000 : 500;
  return {
    attackerChange: -penalty,
    ownerChange: 0,
    message: `انفجر اللغم وخسر المهاجم ${penalty} نقطة`,
    finalState: "mine_exploded",
  };
}

export function calculateScoreChange({
  square,
  useDouble,
  attackerCorrect,
  ownerCorrect,
}: {
  square: Pick<BoardSquare, "kind" | "value">;
  useDouble: boolean;
  attackerCorrect: boolean;
  ownerCorrect?: boolean;
}) {
  if (square.kind === "mine") {
    return resolveMineSquare({ useDouble, attackerCorrect });
  }

  return resolvePointSquare({
    pointValue: square.value,
    useDouble,
    attackerCorrect,
    ownerCorrect,
  });
}

export function scoringExamples() {
  return {
    correct300: resolvePointSquare({
      pointValue: 300,
      useDouble: false,
      attackerCorrect: true,
    }).attackerChange,
    ownerWrong700: resolvePointSquare({
      pointValue: 700,
      useDouble: false,
      attackerCorrect: false,
      ownerCorrect: false,
    }).ownerChange,
    doubleCorrect500: resolvePointSquare({
      pointValue: 500,
      useDouble: true,
      attackerCorrect: true,
    }).attackerChange,
    mineWrong: resolveMineSquare({
      useDouble: false,
      attackerCorrect: false,
    }).attackerChange,
    mineDoubleWrong: resolveMineSquare({
      useDouble: true,
      attackerCorrect: false,
    }).attackerChange,
  };
}
