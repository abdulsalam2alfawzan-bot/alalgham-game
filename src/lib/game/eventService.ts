"use client";

import { addDoc, collection, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import type { GameEvent } from "@/types/game";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import { sanitizeText } from "@/lib/security/inputSafety";
import { createLocalId, readLocalState, updateLocalState } from "./localStore";

export async function addGameEvent(
  roomId: string,
  type: GameEvent["type"],
  message: string,
  payload?: Record<string, unknown>,
) {
  const safePayload = payload
    ? Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [
          key,
          typeof value === "string" ? sanitizeText(value, 160) : value,
        ]),
      )
    : undefined;
  const event: GameEvent = {
    id: createLocalId("event"),
    roomId,
    type,
    message: sanitizeText(message, 240) || "حدث جديد",
    createdAt: Date.now(),
    payload: safePayload,
  };

  const db = getFirebaseDb();
  if (db) {
    try {
      const ref = await addDoc(collection(db, "rooms", roomId, "events"), event);
      return { ...event, id: ref.id };
    } catch (error) {
      console.warn("Firebase event write failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    events: [event, ...state.events],
  }));

  return event;
}

export async function getRoomEvents(roomId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDocs(
        query(collection(db, "rooms", roomId, "events"), orderBy("createdAt", "desc")),
      );
      return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as GameEvent);
    } catch (error) {
      console.warn("Firebase event read failed; using local fallback.", error);
    }
  }

  return readLocalState()
    .events.filter((event) => event.roomId === roomId)
    .sort((left, right) => right.createdAt - left.createdAt);
}

export function watchRoomEvents(roomId: string, callback: (events: GameEvent[]) => void) {
  const db = getFirebaseDb();
  if (db) {
    return onSnapshot(
      query(collection(db, "rooms", roomId, "events"), orderBy("createdAt", "desc")),
      (snapshot) => {
        callback(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as GameEvent));
      },
      () => {
        void getRoomEvents(roomId).then(callback);
      },
    );
  }

  void getRoomEvents(roomId).then(callback);
  return () => {};
}
