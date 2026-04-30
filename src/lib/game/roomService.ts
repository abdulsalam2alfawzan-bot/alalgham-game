"use client";

import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import type { Room } from "@/types/game";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import { buildPlayerQrPath, buildPlayerQrUrl } from "@/lib/qr/roomQrLinks";
import { readLocalState, updateLocalState } from "./localStore";
import { addGameEvent } from "./eventService";

export function buildJoinPath(playerCode: string) {
  return buildPlayerQrPath(playerCode);
}

export function buildJoinUrl(playerCode: string) {
  return buildPlayerQrUrl(playerCode);
}

export async function getRoom(roomId?: string) {
  const state = readLocalState();
  const id = roomId ?? state.currentRoomId;
  if (!id) {
    return state.rooms[0];
  }

  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDoc(doc(db, "rooms", id));
      if (snapshot.exists()) {
        return { ...(snapshot.data() as Room), id: snapshot.id };
      }
    } catch (error) {
      console.warn("Firebase room read failed; using local fallback.", error);
    }
  }

  return state.rooms.find((room) => room.id === id) ?? state.rooms[0];
}

export async function updateRoomStatus(roomId: string, status: Room["status"]) {
  const updatedAt = Date.now();
  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(doc(db, "rooms", roomId), { status, updatedAt }, { merge: true });
      await addGameEvent(roomId, "team_updated", `تم تحديث حالة الغرفة إلى ${status}`);
      return;
    } catch (error) {
      console.warn("Firebase room update failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    rooms: state.rooms.map((room) =>
      room.id === roomId ? { ...room, status, updatedAt } : room,
    ),
  }));
}

export function watchRoom(roomId: string, callback: (room: Room | undefined) => void) {
  const db = getFirebaseDb();
  if (db) {
    return onSnapshot(
      doc(db, "rooms", roomId),
      (snapshot) => {
        callback(snapshot.exists() ? ({ ...(snapshot.data() as Room), id: snapshot.id }) : undefined);
      },
      () => {
        void getRoom(roomId).then(callback);
      },
    );
  }

  void getRoom(roomId).then(callback);
  return () => {};
}
