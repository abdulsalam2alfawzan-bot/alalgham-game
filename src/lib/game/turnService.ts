"use client";

import { collection, doc, getDocs, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import type { Turn } from "@/types/game";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import { sanitizeAnswer } from "@/lib/security/inputSafety";
import { addGameEvent } from "./eventService";
import { createLocalId, readLocalState, updateLocalState } from "./localStore";

export async function getTurns(roomId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDocs(
        query(collection(db, "rooms", roomId, "turns"), orderBy("createdAt", "desc")),
      );
      return snapshot.docs.map((doc) => ({ ...(doc.data() as Turn), id: doc.id }));
    } catch (error) {
      console.warn("Firebase turns read failed; using local fallback.", error);
    }
  }

  return readLocalState()
    .turns.filter((turn) => turn.roomId === roomId)
    .sort((left, right) => right.createdAt - left.createdAt);
}

export async function getCurrentTurn(roomId: string) {
  return (await getTurns(roomId))[0];
}

export async function saveTurn(turn: Turn) {
  const updatedTurn = {
    ...turn,
    submittedAnswer: turn.submittedAnswer ? sanitizeAnswer(turn.submittedAnswer) : undefined,
    updatedAt: Date.now(),
  };
  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(doc(db, "rooms", turn.roomId, "turns", turn.id), updatedTurn, {
        merge: true,
      });
      return updatedTurn;
    } catch (error) {
      console.warn("Firebase turn save failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    turns: [
      updatedTurn,
      ...state.turns.filter((item) => item.id !== updatedTurn.id),
    ],
  }));
  return updatedTurn;
}

export async function createTurn(roomId: string, attackerTeamId: string, round = 1) {
  const turn: Turn = {
    id: createLocalId("turn"),
    roomId,
    round,
    attackerTeamId,
    useDouble: false,
    phase: "selecting",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveTurn(turn);
  await addGameEvent(roomId, "team_updated", "بدأ دور جديد", { attackerTeamId });
  return turn;
}

export function watchTurns(roomId: string, callback: (turns: Turn[]) => void) {
  const db = getFirebaseDb();
  if (db) {
    return onSnapshot(
      query(collection(db, "rooms", roomId, "turns"), orderBy("createdAt", "desc")),
      (snapshot) => {
        callback(snapshot.docs.map((doc) => ({ ...(doc.data() as Turn), id: doc.id })));
      },
      () => {
        void getTurns(roomId).then(callback);
      },
    );
  }

  void getTurns(roomId).then(callback);
  return () => {};
}
