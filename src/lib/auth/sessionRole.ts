"use client";

import type { PlayerRole, Room } from "@/types/game";
import { isCodeExpired } from "./roomAccess";

export type SupervisorSession = {
  role: "organizer";
  roomId: string;
  supervisorCode: string;
  expiresAt: string;
};

export type PlayerSession = {
  role: PlayerRole;
  roomId: string;
  playerId: string;
  playerCode: string;
  expiresAt: string;
};

export type RoomSession = SupervisorSession | PlayerSession;

const sessionKey = "alalgham.roomAccess.session";

function canUseSessionStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function toIsoString(value: number | string) {
  if (typeof value === "string") {
    return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : value;
  }

  return new Date(value).toISOString();
}

export function saveSupervisorSession(room: Room) {
  if (!canUseSessionStorage()) {
    return;
  }

  const session: SupervisorSession = {
    role: "organizer",
    roomId: room.id,
    supervisorCode: room.supervisorCode,
    expiresAt: toIsoString(room.supervisorCodeExpiresAt),
  };

  window.sessionStorage.setItem(sessionKey, JSON.stringify(session));
}

export function savePlayerSession(input: {
  roomId: string;
  playerId: string;
  playerCode: string;
  expiresAt: number | string;
  role?: PlayerRole;
}) {
  if (!canUseSessionStorage()) {
    return;
  }

  const session: PlayerSession = {
    role: input.role ?? "player",
    roomId: input.roomId,
    playerId: input.playerId,
    playerCode: input.playerCode,
    expiresAt: toIsoString(input.expiresAt),
  };

  window.sessionStorage.setItem(sessionKey, JSON.stringify(session));
}

export function readRoomSession(): RoomSession | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  const rawSession = window.sessionStorage.getItem(sessionKey);
  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as RoomSession;
    if (!session.roomId || isCodeExpired(session.expiresAt)) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function clearRoomSession() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(sessionKey);
}

export function isValidSupervisorSession(room: Room | null | undefined, session = readRoomSession()) {
  return Boolean(
    room &&
      session?.role === "organizer" &&
      session.roomId === room.id &&
      session.supervisorCode === room.supervisorCode &&
      !isCodeExpired(session.expiresAt) &&
      !isCodeExpired(room.expiresAt) &&
      room.status !== "expired",
  );
}

export function isValidPlayerSession(room: Room | null | undefined, session = readRoomSession()) {
  return Boolean(
    room &&
      session &&
      session.role !== "organizer" &&
      session.roomId === room.id &&
      !isCodeExpired(session.expiresAt) &&
      !isCodeExpired(room.expiresAt) &&
      room.status !== "expired",
  );
}

export function getSessionPlayerId(session = readRoomSession()) {
  return session && session.role !== "organizer" ? session.playerId : undefined;
}
