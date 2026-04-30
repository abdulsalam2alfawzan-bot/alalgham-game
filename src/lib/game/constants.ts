import type { PointValue, RoomSettings } from "@/types/game";

export const gameName = "الألغام";
export const platformName = "جوّكم";

export const startingScore = 1000;
export const minePenalty = 500;
export const teamCountOptions = [2, 3, 4];
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
  teamsCount: 4,
  playersPerTeam: 3,
  categories: categories.slice(0, 4),
  answerDurations: defaultAnswerDurations,
  doubleEnabled: true,
  minePenalty,
  mineReflectionEnabled: false,
  objectionsPerTeam: 2,
  startingScore,
};

export const teamColors = [
  "bg-teal-600",
  "bg-amber-500",
  "bg-indigo-600",
  "bg-rose-600",
];

export const defaultTeamNames = ["الصقور", "النخيل", "النجوم", "الموج"];
