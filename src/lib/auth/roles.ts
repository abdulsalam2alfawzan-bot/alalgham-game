"use client";

import type { EffectiveRole, Player, Room, Team } from "@/types/game";
import {
  isValidSupervisorSession,
  readRoomSession,
  type RoomSession,
} from "./sessionRole";

export type UserRole = "organizer" | "captain" | "player";

export const unauthorizedMessage = "لا تملك صلاحية تنفيذ هذا الإجراء";

export function getEffectiveRole(
  userId: string | undefined,
  room: Room | undefined | null,
  sessionOrTeams: RoomSession | Team[] | null = readRoomSession(),
  teamsOrSession: Team[] | string | undefined = [],
  player?: Player,
): EffectiveRole {
  if (!room) {
    return "player";
  }

  const session = Array.isArray(sessionOrTeams) ? readRoomSession() : sessionOrTeams;
  const teams = Array.isArray(sessionOrTeams)
    ? sessionOrTeams
    : Array.isArray(teamsOrSession)
      ? teamsOrSession
      : [];

  if (isValidSupervisorSession(room, session)) {
    return "organizer";
  }

  if (!userId) {
    return "player";
  }

  const isCaptainByTeam = teams.some(
    (team) => team.captainId === userId || team.captainPlayerId === userId,
  );
  if (isCaptainByTeam || player?.role === "captain") {
    return "captain";
  }

  return "player";
}

export const permissions = {
  createRoom: ["organizer"],
  manageTeams: ["organizer"],
  assignPlayers: ["organizer"],
  assignCaptains: ["organizer"],
  startBoardSetup: ["organizer"],
  startGame: ["organizer"],
  judgeAnswers: ["organizer"],
  manageQuestions: ["organizer"],
  resolveObjections: ["organizer"],
  adjustPoints: ["organizer"],
  kickPlayers: ["organizer"],
  changeCaptain: ["organizer"],
  pauseGame: ["organizer"],
  endGame: ["organizer"],
  viewSupervisorRoom: ["organizer"],
  viewEventLog: ["organizer"],
  viewCodes: ["organizer"],
  setupOwnBoard: ["captain"],
  submitAnswer: ["captain"],
  useDouble: ["captain"],
  submitObjection: ["captain"],
  viewPlayerGame: ["organizer", "captain", "player"],
} satisfies Record<string, UserRole[]>;

function has(role: EffectiveRole, permission: keyof typeof permissions) {
  return (permissions[permission] as readonly UserRole[]).includes(role);
}

export function canViewOrganizerPanel(role: EffectiveRole) {
  return has(role, "viewSupervisorRoom");
}

export function canAssignCaptain(role: EffectiveRole) {
  return has(role, "assignCaptains");
}

export function canStartGame(role: EffectiveRole) {
  return has(role, "startGame");
}

export function canSetupBoard(role: EffectiveRole) {
  return has(role, "setupOwnBoard");
}

export function canSubmitAnswer(role: EffectiveRole) {
  return has(role, "submitAnswer");
}

export function canUseDouble(role: EffectiveRole) {
  return has(role, "useDouble");
}

export function canJudgeAnswer(role: EffectiveRole) {
  return has(role, "judgeAnswers");
}

export function canAdjustScore(role: EffectiveRole) {
  return has(role, "adjustPoints");
}

export function canEndGame(role: EffectiveRole) {
  return has(role, "endGame");
}

export function canKickPlayer(role: EffectiveRole) {
  return has(role, "kickPlayers");
}

export function canManageTeams(role: EffectiveRole) {
  return has(role, "manageTeams");
}
