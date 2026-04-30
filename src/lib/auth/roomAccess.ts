"use client";

import { collection, getDocs, limit, query, where } from "firebase/firestore";
import type { Room } from "@/types/game";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import {
  isValidPlayerCode,
  isValidSupervisorCode,
  sanitizeCode,
} from "@/lib/security/inputSafety";
import { readLocalState } from "@/lib/game/localStore";

const roomCodeDigits = 4;
const supervisorHours = 12;
const playerHours = 6;

function randomTwoDigits() {
  return String(Math.floor(10 + Math.random() * 90));
}

function normalizeSeed(roomSeed?: string) {
  const seed = sanitizeCode(roomSeed ?? "");
  const digits = seed.replace(/\D/g, "").slice(-roomCodeDigits);
  return digits || String(Math.floor(1000 + Math.random() * 9000));
}

export function generateSupervisorCode(roomSeed?: string) {
  return `M-${normalizeSeed(roomSeed)}-${randomTwoDigits()}`;
}

export function generatePlayerCode(roomSeed?: string) {
  return `P-${normalizeSeed(roomSeed)}-${randomTwoDigits()}`;
}

export function getRoomExpiry(createdAt = Date.now()) {
  return createdAt + supervisorHours * 60 * 60 * 1000;
}

export function getSupervisorCodeExpiry(createdAt = Date.now()) {
  return createdAt + supervisorHours * 60 * 60 * 1000;
}

export function getPlayerCodeExpiry(createdAt = Date.now()) {
  return createdAt + playerHours * 60 * 60 * 1000;
}

export function isCodeExpired(expiresAt: number | string | undefined) {
  if (!expiresAt) {
    return true;
  }

  const expiryTime = typeof expiresAt === "string" ? Date.parse(expiresAt) : expiresAt;
  return !Number.isFinite(expiryTime) || expiryTime <= Date.now();
}

async function findRoomByCode(field: "supervisorCode" | "playerCode", code: string) {
  const normalizedCode = sanitizeCode(code);
  const db = getFirebaseDb();

  if (db) {
    try {
      const snapshot = await getDocs(
        query(collection(db, "rooms"), where(field, "==", normalizedCode), limit(1)),
      );
      const firstRoom = snapshot.docs[0];
      if (firstRoom) {
        return { ...(firstRoom.data() as Room), id: firstRoom.id };
      }
    } catch (error) {
      console.warn("Firebase room access lookup failed; using local fallback.", error);
    }
  }

  return readLocalState().rooms.find((room) => room[field] === normalizedCode) ?? null;
}

export function isRoomExpired(room: Room | null | undefined) {
  return !room || isCodeExpired(room.expiresAt) || room.status === "expired";
}

export function isSupervisorCodeExpired(room: Room | null | undefined) {
  return !room || isCodeExpired(room.supervisorCodeExpiresAt) || isRoomExpired(room);
}

export function isPlayerCodeExpired(room: Room | null | undefined) {
  return !room || isCodeExpired(room.playerCodeExpiresAt) || isRoomExpired(room);
}

export async function getRoomBySupervisorCode(code: string) {
  return findRoomByCode("supervisorCode", code);
}

export async function getRoomByPlayerCode(code: string) {
  return findRoomByCode("playerCode", code);
}

export async function validateSupervisorCode(code: string): Promise<Room | null> {
  const normalizedCode = sanitizeCode(code);
  if (!isValidSupervisorCode(normalizedCode)) {
    return null;
  }

  const room = await findRoomByCode("supervisorCode", normalizedCode);
  if (!room || room.supervisorCode !== normalizedCode) {
    return null;
  }

  // MVP: expiry is checked client-side. Production should enforce this with
  // hardened Firestore rules or trusted server-side code.
  if (isSupervisorCodeExpired(room)) {
    return null;
  }

  return room;
}

export async function validatePlayerCode(code: string): Promise<Room | null> {
  const normalizedCode = sanitizeCode(code);
  if (!isValidPlayerCode(normalizedCode)) {
    return null;
  }

  const room = await findRoomByCode("playerCode", normalizedCode);
  if (!room || room.playerCode !== normalizedCode) {
    return null;
  }

  // MVP: expiry is checked client-side. Production should enforce this with
  // hardened Firestore rules or trusted server-side code.
  if (isPlayerCodeExpired(room)) {
    return null;
  }

  return room;
}
