export type ActivationCodeStatus = "unused" | "reserved" | "used" | "expired";
export type GameStatus =
  | "draft"
  | "waiting"
  | "board_setup"
  | "playing"
  | "paused"
  | "finished";
export type SquareKind = "points" | "mine";
export type PointValue = 100 | 300 | 500 | 700;
export type QuestionDifficulty = "easy" | "medium" | "hard" | "gold";
export type TurnPhase =
  | "selecting"
  | "attacker_answer"
  | "owner_answer"
  | "resolved";
export type ObjectionStatus = "open" | "accepted" | "rejected";

export type ActivationCode = {
  code: string;
  status: ActivationCodeStatus;
  packageType: "demo" | "single_room" | "event" | "school";
  reservedByUid?: string;
  usedByRoomId?: string;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type RoomSettings = {
  teamCount: number;
  playersPerTeam: number;
  categories: string[];
  answerDurations: Record<PointValue, number>;
  doubleEnabled: boolean;
  mineReflection: boolean;
  objectionsCount: number;
  startingScore: number;
};

export type Room = {
  id: string;
  name: string;
  roomCode: string;
  activationCode: string;
  organizerUid: string;
  status: GameStatus;
  settings: RoomSettings;
  createdAt: number;
  updatedAt: number;
  currentTurnTeamId?: string;
};

export type Team = {
  id: string;
  roomId: string;
  name: string;
  color: string;
  score: number;
  order: number;
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
  isCaptain: boolean;
  joinedAt: number;
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
    | "activation"
    | "room_created"
    | "player_joined"
    | "team_updated"
    | "board_locked"
    | "turn_resolved"
    | "score_adjusted"
    | "objection"
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
