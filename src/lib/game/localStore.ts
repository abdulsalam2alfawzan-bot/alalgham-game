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
    return { ...initialState, ...(JSON.parse(rawState) as LocalGameState) };
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
