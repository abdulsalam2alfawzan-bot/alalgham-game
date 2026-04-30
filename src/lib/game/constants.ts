import type { PointValue, RoomSettings } from "@/types/game";

export const gameName = "الألغام";
export const platformName = "جوّكم";

export const startingScore = 1000;
export const minePenalty = 500;
export const teamCountOptions = [2];
export const playersPerTeamOptions = [1, 2, 3, 4, 5];
export const boardSize = 12;

export const boardDistribution: Array<{ kind: "points" | "mine"; value: PointValue | 0; count: number }> = [
  { kind: "points", value: 100, count: 2 },
  { kind: "points", value: 300, count: 3 },
  { kind: "points", value: 500, count: 2 },
  { kind: "points", value: 700, count: 2 },
  { kind: "mine", value: 0, count: 3 },
];

export const categories = [
  "ثقافة عامة",
  "تاريخ",
  "جغرافيا",
  "إسلاميات عامة",
  "علوم",
  "رياضة",
  "أدب ولغة",
  "السعودية والخليج",
  "ألغاز خفيفة",
  "شخصيات وأحداث",
];

export const defaultAnswerDurations: Record<PointValue, number> = {
  100: 20,
  300: 30,
  500: 45,
  700: 60,
};

export const defaultRoomSettings: RoomSettings = {
  teamsCount: 2,
  playersPerTeam: 3,
  categories: categories.slice(0, 4),
  answerDurations: defaultAnswerDurations,
  doubleEnabled: true,
  minePenalty,
  mineReflectionEnabled: false,
  objectionsPerTeam: 2,
  startingScore,
};

export const activeTeamDefinitions = [
  {
    id: "blue-team",
    defaultName: "الفريق الأزرق",
    color: "bg-blue-600",
    theme: "blue",
  },
  {
    id: "red-team",
    defaultName: "الفريق الأحمر",
    color: "bg-red-600",
    theme: "red",
  },
] as const;

export const futureTeamDefinitions = [
  { id: "future-team-3", name: "الفريق الثالث — قريبًا" },
  { id: "future-team-4", name: "الفريق الرابع — قريبًا" },
] as const;

export const activeTeamIds: string[] = activeTeamDefinitions.map((team) => team.id);

export const teamColors = activeTeamDefinitions.map((team) => team.color);

export const defaultTeamNames = activeTeamDefinitions.map((team) => team.defaultName);

export function isActiveTeamId(teamId: string | undefined) {
  return Boolean(teamId && activeTeamIds.includes(teamId));
}

export function getDefaultTeamName(teamId: string, index = 0) {
  return activeTeamDefinitions.find((team) => team.id === teamId)?.defaultName
    ?? defaultTeamNames[index]
    ?? `فريق ${index + 1}`;
}
