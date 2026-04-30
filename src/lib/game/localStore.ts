"use client";

import type {
  ActivationCode,
  Board,
  GameEvent,
  Objection,
  Player,
  Question,
  Room,
  Team,
  Turn,
} from "@/types/game";
import {
  mockBoards,
  mockPlayers,
  mockRoom,
  mockTeams,
  sampleActivationCodes,
  sampleQuestions,
} from "./mockData";

export type SessionRole = "player" | "organizer";

export type LocalGameState = {
  activationCodes: ActivationCode[];
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
  currentActivationCode?: string;
};

const localStateKey = "alalgham.mvp.state";

const initialState: LocalGameState = {
  activationCodes: sampleActivationCodes,
  rooms: [mockRoom],
  teams: mockTeams,
  players: mockPlayers,
  boards: mockBoards,
  questions: sampleQuestions,
  turns: [],
  events: [],
  objections: [],
  currentRoomId: mockRoom.id,
};

function migrateLocalState(state: LocalGameState): LocalGameState {
  const now = Date.now();
  return {
    ...state,
    rooms: state.rooms.map((room) => {
      const seed = room.roomCode || "4821";
      const settings = {
        ...room.settings,
        teamsCount: room.settings.teamsCount ?? room.settings.teamCount,
        teamCount: room.settings.teamCount ?? room.settings.teamsCount,
        minePenalty: room.settings.minePenalty ?? 500,
        mineReflectionEnabled: room.settings.mineReflectionEnabled ?? room.settings.mineReflection,
        mineReflection: room.settings.mineReflection ?? room.settings.mineReflectionEnabled,
        objectionsPerTeam: room.settings.objectionsPerTeam ?? room.settings.objectionsCount,
        objectionsCount: room.settings.objectionsCount ?? room.settings.objectionsPerTeam,
      };

      return {
        ...room,
        settings,
        supervisorCode: room.supervisorCode ?? `M-${seed}-93`,
        supervisorCodeExpiresAt: room.supervisorCodeExpiresAt ?? now + 12 * 60 * 60 * 1000,
        playerCode: room.playerCode ?? `P-${seed}-27`,
        playerCodeExpiresAt: room.playerCodeExpiresAt ?? now + 6 * 60 * 60 * 1000,
        expiresAt: room.expiresAt ?? now + 12 * 60 * 60 * 1000,
      };
    }),
    players: state.players.map((player) => ({
      ...player,
      role: player.role ?? (player.isCaptain ? "captain" : "player"),
      status: player.status ?? "active",
    })),
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function createLocalId(prefix: string) {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

export function generateRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
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
    return migrateLocalState({ ...initialState, ...(JSON.parse(rawState) as LocalGameState) });
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

export function rememberActivation(code: string) {
  updateLocalState((state) => ({ ...state, currentActivationCode: code }));
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
