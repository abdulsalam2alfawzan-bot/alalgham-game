"use client";

import type {
  Board,
  GameEvent,
  Objection,
  Player,
  Question,
  Room,
  RoomSettings,
  Team,
  Turn,
} from "@/types/game";
import {
  mockBoards,
  mockPlayers,
  mockRoom,
  mockRooms,
  mockTeams,
  sampleQuestions,
} from "./mockData";

export type SessionRole = "player" | "organizer";

export type LocalGameState = {
  rooms: Room[];
  teams: Team[];
  players: Player[];
  boards: Board[];
  questions: Question[];
  turns: Turn[];
  events: GameEvent[];
  objections: Objection[];
  currentRoomId?: string;
  currentPlayerId?: string;
  currentUserId?: string;
  sessionRole?: SessionRole;
};

type LegacyRoom = Partial<Room> & {
  teamCount?: number;
  settings?: Partial<RoomSettings> & {
    teamCount?: number;
    mineReflection?: boolean;
    objectionsCount?: number;
  };
};

const localStateKey = "alalgham.mvp.state";
const twelveHours = 12 * 60 * 60 * 1000;
const sixHours = 6 * 60 * 60 * 1000;

const initialState: LocalGameState = {
  rooms: mockRooms,
  teams: mockTeams,
  players: mockPlayers,
  boards: mockBoards,
  questions: sampleQuestions,
  turns: [],
  events: [],
  objections: [],
  currentRoomId: mockRoom.id,
};

function normalizeSettings(settings: LegacyRoom["settings"]): RoomSettings {
  return {
    teamsCount: settings?.teamsCount ?? settings?.teamCount ?? 4,
    playersPerTeam: settings?.playersPerTeam ?? 3,
    categories: settings?.categories ?? [],
    answerDurations: settings?.answerDurations ?? {
      100: 20,
      300: 30,
      500: 45,
      700: 60,
    },
    doubleEnabled: settings?.doubleEnabled ?? true,
    minePenalty: settings?.minePenalty ?? 500,
    mineReflectionEnabled: settings?.mineReflectionEnabled ?? settings?.mineReflection ?? false,
    objectionsPerTeam: settings?.objectionsPerTeam ?? settings?.objectionsCount ?? 2,
    startingScore: settings?.startingScore ?? 1000,
  };
}

function migrateRoom(room: LegacyRoom, index: number): Room {
  const now = Date.now();
  const seed = (room.id ?? (index === 0 ? "4821" : "2026")).replace(/\D/g, "").slice(-4) || "4821";
  const fallbackRoom = mockRooms[index] ?? mockRoom;

  return {
    id: room.id ?? fallbackRoom.id,
    name: room.name ?? fallbackRoom.name,
    ownerCode: room.ownerCode ?? fallbackRoom.ownerCode ?? `M-${seed}-93`,
    ownerCodeExpiresAt: room.ownerCodeExpiresAt ?? fallbackRoom.ownerCodeExpiresAt ?? now + twelveHours,
    playerCode: room.playerCode ?? fallbackRoom.playerCode ?? `P-${seed}-27`,
    playerCodeExpiresAt: room.playerCodeExpiresAt ?? fallbackRoom.playerCodeExpiresAt ?? now + sixHours,
    expiresAt: room.expiresAt ?? fallbackRoom.expiresAt ?? now + twelveHours,
    status: room.status ?? "waiting",
    settings: normalizeSettings(room.settings),
    createdAt: room.createdAt ?? now,
    updatedAt: room.updatedAt ?? now,
    currentTurnTeamId: room.currentTurnTeamId,
  };
}

function migrateLocalState(state: Partial<LocalGameState>): LocalGameState {
  return {
    rooms: (state.rooms?.length ? state.rooms : mockRooms).map(migrateRoom),
    teams: state.teams?.length ? state.teams : mockTeams,
    players: (state.players?.length ? state.players : mockPlayers).map((player) => ({
      ...player,
      role: player.role ?? (player.isCaptain ? "captain" : "player"),
      status: player.status ?? "active",
    })),
    boards: state.boards?.length ? state.boards : mockBoards,
    questions: state.questions?.length ? state.questions : sampleQuestions,
    turns: state.turns ?? [],
    events: state.events ?? [],
    objections: state.objections ?? [],
    currentRoomId: state.currentRoomId ?? mockRoom.id,
    currentPlayerId: state.currentPlayerId,
    currentUserId: state.currentUserId,
    sessionRole: state.sessionRole,
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function createLocalId(prefix: string) {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

export function readLocalState(): LocalGameState {
  if (!canUseStorage()) {
    return initialState;
  }

  const rawState = window.localStorage.getItem(localStateKey);
  if (!rawState) {
    window.localStorage.setItem(localStateKey, JSON.stringify(initialState));
    return initialState;
  }

  try {
    return migrateLocalState({ ...initialState, ...(JSON.parse(rawState) as Partial<LocalGameState>) });
  } catch {
    window.localStorage.setItem(localStateKey, JSON.stringify(initialState));
    return initialState;
  }
}

export function writeLocalState(state: LocalGameState) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(localStateKey, JSON.stringify(state));
}

export function updateLocalState(updater: (state: LocalGameState) => LocalGameState) {
  const nextState = updater(readLocalState());
  writeLocalState(nextState);
  return nextState;
}

export function rememberCurrentRoom(roomId: string) {
  updateLocalState((state) => ({ ...state, currentRoomId: roomId }));
}

export function rememberCurrentPlayer(playerId: string) {
  updateLocalState((state) => ({ ...state, currentPlayerId: playerId }));
}

export function rememberOrganizerSession(userId: string) {
  updateLocalState((state) => ({
    ...state,
    currentUserId: userId,
    sessionRole: "organizer",
  }));
}

export function rememberPlayerSession(playerId: string) {
  updateLocalState((state) => ({
    ...state,
    currentPlayerId: playerId,
    currentUserId: playerId,
    sessionRole: "player",
  }));
}
