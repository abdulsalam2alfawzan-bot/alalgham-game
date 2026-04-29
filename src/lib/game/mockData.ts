import type {
  ActivationCode,
  Board,
  BoardSquare,
  Player,
  Question,
  Room,
  Team,
} from "@/types/game";
import {
  boardDistribution,
  categories,
  defaultRoomSettings,
  defaultTeamNames,
  mockActivationCodes,
  startingScore,
  teamColors,
} from "./constants";

const now = Date.now();

export const sampleActivationCodes: ActivationCode[] = mockActivationCodes.map(
  (code) => ({
    code,
    status: "unused",
    packageType: "demo",
    createdAt: now,
    updatedAt: now,
  }),
);

export const sampleQuestions: Question[] = [
  {
    id: "q-100-general",
    category: "ثقافة عامة",
    difficulty: "easy",
    pointValue: 100,
    questionText: "كم عدد أيام الأسبوع؟",
    correctAnswer: "سبعة",
    alternativeAnswers: ["7", "سبع"],
  },
  {
    id: "q-300-geo",
    category: "جغرافيا",
    difficulty: "medium",
    pointValue: 300,
    questionText: "ما عاصمة المملكة العربية السعودية؟",
    correctAnswer: "الرياض",
    alternativeAnswers: [],
  },
  {
    id: "q-500-history",
    category: "تاريخ",
    difficulty: "hard",
    pointValue: 500,
    questionText: "في أي عام هجري تأسست المملكة العربية السعودية؟",
    correctAnswer: "1351",
    alternativeAnswers: ["1351هـ"],
  },
  {
    id: "q-700-science",
    category: "علوم",
    difficulty: "gold",
    pointValue: 700,
    questionText: "ما العنصر الكيميائي الذي رمزه O؟",
    correctAnswer: "الأكسجين",
    alternativeAnswers: ["اكسجين", "Oxygen"],
  },
];

export const mockRoom: Room = {
  id: "local-room",
  name: "غرفة الأصدقاء",
  roomCode: "4821",
  activationCode: "DEMO-1234",
  organizerUid: "local-organizer",
  status: "waiting",
  settings: defaultRoomSettings,
  createdAt: now,
  updatedAt: now,
  currentTurnTeamId: "team-1",
};

export const mockTeams: Team[] = defaultTeamNames.map((name, index) => ({
  id: `team-${index + 1}`,
  roomId: mockRoom.id,
  name,
  color: teamColors[index],
  score: startingScore,
  order: index,
  captainPlayerId: index === 0 ? "player-1" : undefined,
  doubleAvailable: true,
  boardLocked: index === 0,
}));

export const mockPlayers: Player[] = [
  {
    id: "player-1",
    roomId: mockRoom.id,
    name: "نورة",
    uid: "local-player-1",
    teamId: "team-1",
    isCaptain: true,
    joinedAt: now,
  },
  {
    id: "player-2",
    roomId: mockRoom.id,
    name: "سالم",
    uid: "local-player-2",
    teamId: "team-1",
    isCaptain: false,
    joinedAt: now,
  },
  {
    id: "player-3",
    roomId: mockRoom.id,
    name: "مازن",
    uid: "local-player-3",
    teamId: "team-2",
    isCaptain: false,
    joinedAt: now,
  },
];

export function createDefaultBoardSquares(roomId: string, teamId: string): BoardSquare[] {
  const squares = boardDistribution.flatMap((item) =>
    Array.from({ length: item.count }, (_, index) => ({
      id: `${teamId}-${item.kind}-${item.value}-${index}`,
      roomId,
      teamId,
      position: 0,
      kind: item.kind,
      value: item.value,
      revealed: false,
    })),
  );

  return squares.map((square, index) => ({
    ...square,
    id: `${teamId}-square-${index + 1}`,
    position: index + 1,
  }));
}

export const mockBoards: Board[] = mockTeams.map((team) => ({
  id: `board-${team.id}`,
  roomId: mockRoom.id,
  teamId: team.id,
  locked: team.boardLocked,
  squares: createDefaultBoardSquares(mockRoom.id, team.id),
  createdAt: now,
  updatedAt: now,
}));

export const mockCategories = categories;
