"use client";

import { collection, getDocs, limit, query, where } from "firebase/firestore";
import type { Room } from "@/types/game";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import {
  isValidOwnerCode,
  isValidPlayerCode,
  sanitizeCode,
} from "@/lib/security/inputSafety";
import { readLocalState } from "@/lib/game/localStore";
import { normalizeRoom } from "@/lib/game/roomService";

export function isCodeExpired(expiresAt: number | string | undefined) {
  if (!expiresAt) {
    return true;
  }

  const expiryTime = typeof expiresAt === "string" ? Date.parse(expiresAt) : expiresAt;
  return !Number.isFinite(expiryTime) || expiryTime <= Date.now();
}

async function findRoomByCode(field: "ownerCode" | "playerCode", code: string) {
  const normalizedCode = sanitizeCode(code);
  const db = getFirebaseDb();

  if (db) {
    try {
      const snapshot = await getDocs(
        query(collection(db, "rooms"), where(field, "==", normalizedCode), limit(1)),
      );
      const firstRoom = snapshot.docs[0];
      if (firstRoom) {
        return normalizeRoom({ ...(firstRoom.data() as Room), id: firstRoom.id });
      }
    } catch (error) {
      console.warn("Firebase room access lookup failed; using local fallback.", error);
    }
  }

  const room = readLocalState().rooms.find((room) => room[field] === normalizedCode);
  return room ? normalizeRoom(room) : null;
}

export function isRoomExpired(room: Room | null | undefined) {
  return !room || isCodeExpired(room.expiresAt) || room.status === "expired";
}

export function isOwnerCodeExpired(room: Room | null | undefined) {
  return !room || isCodeExpired(room.ownerCodeExpiresAt) || isRoomExpired(room);
}

export function isPlayerCodeExpired(room: Room | null | undefined) {
  return !room || isCodeExpired(room.playerCodeExpiresAt) || isRoomExpired(room);
}

export async function getRoomByOwnerCode(code: string) {
  return findRoomByCode("ownerCode", code);
}

export async function getRoomByPlayerCode(code: string) {
  return findRoomByCode("playerCode", code);
}

export async function validateOwnerCode(code: string): Promise<Room | null> {
  const normalizedCode = sanitizeCode(code);
  if (!isValidOwnerCode(normalizedCode)) {
    return null;
  }

  const room = await findRoomByCode("ownerCode", normalizedCode);
  if (!room || room.ownerCode !== normalizedCode) {
    return null;
  }

  if (isOwnerCodeExpired(room)) {
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

  if (isPlayerCodeExpired(room)) {
    return null;
  }

  return room;
}
