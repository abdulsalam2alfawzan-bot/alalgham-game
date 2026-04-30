import type {
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
  startingScore,
  teamColors,
} from "./constants";

const now = Date.now();
const twelveHours = 12 * 60 * 60 * 1000;
const sixHours = 6 * 60 * 60 * 1000;

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

export const mockRooms: Room[] = [
  {
    id: "room-4821",
    name: "غرفة الألغام التجريبية",
    ownerCode: "M-4821-93",
    ownerCodeExpiresAt: now + twelveHours,
    playerCode: "P-4821-27",
    playerCodeExpiresAt: now + sixHours,
    expiresAt: now + twelveHours,
    status: "waiting",
    settings: defaultRoomSettings,
    createdAt: now,
    updatedAt: now,
    currentTurnTeamId: "room-4821-team-1",
  },
  {
    id: "room-2026",
    name: "غرفة تحدي العائلة",
    ownerCode: "M-2026-55",
    ownerCodeExpiresAt: now + twelveHours,
    playerCode: "P-2026-88",
    playerCodeExpiresAt: now + sixHours,
    expiresAt: now + twelveHours,
    status: "waiting",
    settings: { ...defaultRoomSettings, teamsCount: 3, playersPerTeam: 4 },
    createdAt: now,
    updatedAt: now,
    currentTurnTeamId: "room-2026-team-1",
  },
];

export const mockRoom = mockRooms[0];

function createTeamsForMockRoom(room: Room): Team[] {
  return Array.from({ length: room.settings.teamsCount }, (_, index) => ({
    id: `${room.id}-team-${index + 1}`,
    roomId: room.id,
    name: defaultTeamNames[index] ?? `فريق ${index + 1}`,
    color: teamColors[index] ?? "bg-slate-600",
    score: startingScore,
    order: index,
    captainId: undefined,
    captainPlayerId: undefined,
    doubleAvailable: true,
    boardLocked: false,
  }));
}

export const mockTeams: Team[] = mockRooms.flatMap(createTeamsForMockRoom).map((team) =>
  team.id === "room-4821-team-1"
    ? { ...team, captainId: "player-1", captainPlayerId: "player-1", boardLocked: true }
    : team,
);

export const mockPlayers: Player[] = [
  {
    id: "player-1",
    roomId: "room-4821",
    name: "نورة",
    uid: "local-player-1",
    teamId: "room-4821-team-1",
    role: "captain",
    isCaptain: true,
    joinedAt: now,
    status: "active",
  },
  {
    id: "player-2",
    roomId: "room-4821",
    name: "سالم",
    uid: "local-player-2",
    teamId: "room-4821-team-1",
    role: "player",
    isCaptain: false,
    joinedAt: now,
    status: "active",
  },
  {
    id: "player-3",
    roomId: "room-4821",
    name: "مازن",
    uid: "local-player-3",
    teamId: "room-4821-team-2",
    role: "player",
    isCaptain: false,
    joinedAt: now,
    status: "active",
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
  roomId: team.roomId,
  teamId: team.id,
  locked: team.boardLocked,
  squares: createDefaultBoardSquares(team.roomId, team.id),
  createdAt: now,
  updatedAt: now,
}));

export const mockCategories = categories;
