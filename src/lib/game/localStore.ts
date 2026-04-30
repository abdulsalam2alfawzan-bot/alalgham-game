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
  createDefaultBoardSquares,
  mockBoards,
  mockPlayers,
  mockRoom,
  mockRooms,
  mockTeams,
  sampleQuestions,
} from "./mockData";
import {
  activeTeamDefinitions,
  getDefaultTeamName,
  isActiveTeamId,
  startingScore,
} from "./constants";

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
const legacyDefaultTeamNames = ["الصقور", "النخيل", "النجوم", "الموج"];

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
    teamsCount: 2,
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
    currentTurnTeamId: mapLegacyTeamId(room.currentTurnTeamId) ?? room.currentTurnTeamId,
  };
}

function mapLegacyTeamId(teamId: string | undefined, order?: number) {
  if (isActiveTeamId(teamId)) {
    return teamId;
  }

  if (teamId?.endsWith("-team-1") || order === 0) {
    return "blue-team";
  }

  if (teamId?.endsWith("-team-2") || order === 1) {
    return "red-team";
  }

  return undefined;
}

function migrateTeams(rooms: Room[], teams: Team[] | undefined): Team[] {
  const existingTeams = teams?.length ? teams : mockTeams;

  return rooms.flatMap((room) =>
    activeTeamDefinitions.map((teamDefinition, index) => {
      const source = existingTeams.find(
        (team) =>
          team.roomId === room.id &&
          (team.id === teamDefinition.id || mapLegacyTeamId(team.id, team.order) === teamDefinition.id),
      );
      const sourceName = source?.name?.trim();
      const name = sourceName && !legacyDefaultTeamNames.includes(sourceName)
        ? sourceName
        : getDefaultTeamName(teamDefinition.id, index);

      return {
        id: teamDefinition.id,
        roomId: room.id,
        name,
        color: teamDefinition.color,
        score: source?.score ?? startingScore,
        order: index,
        captainId: source?.captainId,
        captainPlayerId: source?.captainPlayerId,
        doubleAvailable: source?.doubleAvailable ?? true,
        boardLocked: source?.boardLocked ?? false,
      };
    }),
  );
}

function migratePlayers(players: Player[] | undefined): Player[] {
  return (players?.length ? players : mockPlayers).map((player) => ({
    ...player,
    teamId: mapLegacyTeamId(player.teamId),
    role: player.role ?? (player.isCaptain ? "captain" : "player"),
    status: player.status ?? "active",
  }));
}

function migrateBoards(rooms: Room[], boards: Board[] | undefined): Board[] {
  const existingBoards = boards?.length ? boards : mockBoards;

  return rooms.flatMap((room) =>
    activeTeamDefinitions.map((teamDefinition) => {
      const source = existingBoards.find(
        (board) =>
          board.roomId === room.id &&
          (board.teamId === teamDefinition.id || mapLegacyTeamId(board.teamId) === teamDefinition.id),
      );

      if (!source) {
        const now = Date.now();
        return {
          id: `board-${teamDefinition.id}`,
          roomId: room.id,
          teamId: teamDefinition.id,
          locked: false,
          squares: createDefaultBoardSquares(room.id, teamDefinition.id),
          createdAt: now,
          updatedAt: now,
        };
      }

      return {
        ...source,
        id: `board-${teamDefinition.id}`,
        roomId: room.id,
        teamId: teamDefinition.id,
        squares: source.squares.map((square) => ({
          ...square,
          roomId: room.id,
          teamId: teamDefinition.id,
        })),
      };
    }),
  );
}

function migrateLocalState(state: Partial<LocalGameState>): LocalGameState {
  const rooms = (state.rooms?.length ? state.rooms : mockRooms).map(migrateRoom);

  return {
    rooms,
    teams: migrateTeams(rooms, state.teams),
    players: migratePlayers(state.players),
    boards: migrateBoards(rooms, state.boards),
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
