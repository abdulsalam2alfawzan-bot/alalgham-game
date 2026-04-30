export type GameStatus =
  | "waiting"
  | "team_assignment"
  | "board_setup"
  | "playing"
  | "paused"
  | "finished"
  | "locked"
  | "expired";
export type SquareKind = "points" | "mine";
export type PointValue = 100 | 300 | 500 | 700;
export type QuestionDifficulty = "easy" | "medium" | "hard" | "gold";
export type TurnPhase =
  | "selecting"
  | "attacker_answer"
  | "owner_answer"
  | "resolved";
export type ObjectionStatus = "open" | "accepted" | "rejected";
export type EffectiveRole = "player" | "captain" | "organizer";
export type PlayerRole = "player" | "captain";

export type RoomSettings = {
  teamsCount: number;
  playersPerTeam: number;
  categories: string[];
  answerDurations: Record<PointValue, number>;
  doubleEnabled: boolean;
  minePenalty: number;
  mineReflectionEnabled: boolean;
  objectionsPerTeam: number;
  startingScore: number;
};

export type Room = {
  id: string;
  roomNumber: string;
  name: string;
  ownerCode: string;
  ownerCodeExpiresAt: number | string;
  playerCode: string;
  playerCodeExpiresAt: number | string;
  expiresAt: number | string;
  status: GameStatus;
  isJoinLocked?: boolean;
  settings: RoomSettings;
  createdAt: number | string;
  updatedAt?: number | string;
  finishedAt?: number | string;
  currentTurnTeamId?: string;
  results?: GameResultsSnapshot;
};

export type GameResultsSnapshot = {
  finishedAt: number | string;
  winnerTeamId?: string;
  ranking: Array<{
    teamId: string;
    teamName: string;
    score: number;
    rank: number;
  }>;
  finalScores: Record<string, number>;
  stats: {
    correctAnswers: number;
    wrongAnswers: number;
    minesExploded: number;
    minesDefused: number;
    doubleUsed: number;
    objectionsUsed: number;
  };
};

export type Team = {
  id: string;
  roomId: string;
  name: string;
  color: string;
  score: number;
  order: number;
  captainId?: string;
  captainPlayerId?: string;
  doubleAvailable: boolean;
  boardLocked: boolean;
};

export type Player = {
  id: string;
  roomId: string;
  name: string;
  uid?: string;
  teamId?: string;
  role: PlayerRole;
  isCaptain: boolean;
  joinedAt: number;
  status: "active" | "kicked" | "left";
};

export type BoardSquare = {
  id: string;
  roomId: string;
  teamId: string;
  position: number;
  kind: SquareKind;
  value: PointValue | 0;
  revealed: boolean;
  questionId?: string;
};

export type Board = {
  id: string;
  roomId: string;
  teamId: string;
  locked: boolean;
  squares: BoardSquare[];
  createdAt: number;
  updatedAt: number;
};

export type Question = {
  id: string;
  category: string;
  difficulty: QuestionDifficulty;
  pointValue: PointValue;
  questionText: string;
  correctAnswer: string;
  alternativeAnswers: string[];
};

export type Turn = {
  id: string;
  roomId: string;
  round: number;
  attackerTeamId: string;
  ownerTeamId?: string;
  selectedSquareId?: string;
  questionId?: string;
  useDouble: boolean;
  phase: TurnPhase;
  submittedAnswer?: string;
  createdAt: number;
  updatedAt: number;
};

export type GameEvent = {
  id: string;
  roomId: string;
  type:
    | "room_created"
    | "player_joined"
    | "team_updated"
    | "board_locked"
    | "turn_resolved"
    | "score_adjusted"
    | "objection"
    | "game_state"
    | "game_finished";
  message: string;
  createdAt: number;
  payload?: Record<string, unknown>;
};

export type Objection = {
  id: string;
  roomId: string;
  teamId?: string;
  playerId?: string;
  text: string;
  status: ObjectionStatus;
  createdAt: number;
  resolvedAt?: number;
};
