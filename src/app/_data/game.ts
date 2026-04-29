export type TeamId = "falcons" | "palms" | "stars" | "waves";

export type Team = {
  id: TeamId;
  name: string;
  captain: string;
  score: number;
  players: string[];
  color: string;
};

export type SquareKind = "points" | "mine";

export type BoardSquare = {
  id: number;
  kind: SquareKind;
  value: number;
  label: string;
  ownerTeamId: TeamId;
};

export const room = {
  name: "غرفة الأصدقاء",
  code: "4821",
  organizerCode: "9147",
  status: "جاهزة",
  teamCount: 4,
};

export const teams: Team[] = [
  {
    id: "falcons",
    name: "الصقور",
    captain: "نورة",
    score: 1000,
    players: ["نورة", "سالم", "هند"],
    color: "bg-teal-600",
  },
  {
    id: "palms",
    name: "النخيل",
    captain: "مازن",
    score: 1000,
    players: ["مازن", "ريم", "علي"],
    color: "bg-amber-500",
  },
  {
    id: "stars",
    name: "النجوم",
    captain: "ليان",
    score: 1000,
    players: ["ليان", "فهد"],
    color: "bg-indigo-600",
  },
  {
    id: "waves",
    name: "الموج",
    captain: "عبدالله",
    score: 1000,
    players: ["عبدالله", "سارة"],
    color: "bg-rose-600",
  },
];

const boardTemplate: Array<Omit<BoardSquare, "id" | "ownerTeamId">> = [
  { kind: "points", value: 300, label: "300" },
  { kind: "mine", value: 0, label: "لغم" },
  { kind: "points", value: 100, label: "100" },
  { kind: "points", value: 700, label: "700" },
  { kind: "points", value: 500, label: "500" },
  { kind: "points", value: 300, label: "300" },
  { kind: "mine", value: 0, label: "لغم" },
  { kind: "points", value: 100, label: "100" },
  { kind: "points", value: 700, label: "700" },
  { kind: "points", value: 300, label: "300" },
  { kind: "mine", value: 0, label: "لغم" },
  { kind: "points", value: 500, label: "500" },
];

export function buildBoard(ownerTeamId: TeamId = "palms"): BoardSquare[] {
  return boardTemplate.map((square, index) => ({
    ...square,
    id: index + 1,
    ownerTeamId,
  }));
}

export const mockBoard = buildBoard();

export const questions = [
  {
    title: "سؤال سريع",
    text: "ما عاصمة السعودية؟",
    answer: "الرياض",
  },
  {
    title: "سؤال نقاط",
    text: "اذكر كوكباً أحمر اللون.",
    answer: "المريخ",
  },
  {
    title: "سؤال لغم",
    text: "كلمة السر: قل الألغام بدون تردد.",
    answer: "الألغام",
  },
];

export const rules = [
  "من 2 إلى 4 فرق.",
  "كل فريق يبدأ بـ 1000 نقطة.",
  "كل فريق لديه لوحة مخفية من 12 مربعاً.",
  "اللوحة: 100×2، 300×3، 500×2، 700×2، لغم×3.",
  "لكل فريق خيار مضاعفة واحد.",
  "الصحيح يعطي نقاط المربع كاملة.",
  "خطأ المهاجم ينقل السؤال لصاحب اللوحة.",
  "خطأ صاحب اللوحة يخصم نصف قيمة المربع.",
  "خطأ اللغم يخصم 500، ومع المضاعفة 1000.",
  "الفريق الأعلى نقاطاً يفوز.",
];

export const scoreEvents = [
  "الصقور كسبوا 300 نقطة.",
  "النخيل خسروا 250 نقطة.",
  "النجوم نجوا من لغم.",
  "الموج استخدموا المضاعفة.",
];
