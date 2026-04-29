"use client";

import { collection, doc, getDoc, getDocs, onSnapshot, setDoc } from "firebase/firestore";
import type { Board, BoardSquare } from "@/types/game";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import { addGameEvent } from "./eventService";
import { createDefaultBoardSquares } from "./mockData";
import { createLocalId, readLocalState, updateLocalState } from "./localStore";

export async function getBoards(roomId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDocs(collection(db, "rooms", roomId, "boards"));
      return snapshot.docs.map((doc) => ({ ...(doc.data() as Board), id: doc.id }));
    } catch (error) {
      console.warn("Firebase boards read failed; using local fallback.", error);
    }
  }

  return readLocalState().boards.filter((board) => board.roomId === roomId);
}

export async function getBoard(roomId: string, teamId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDoc(doc(db, "rooms", roomId, "boards", teamId));
      if (snapshot.exists()) {
        return { ...(snapshot.data() as Board), id: snapshot.id };
      }
    } catch (error) {
      console.warn("Firebase board read failed; using local fallback.", error);
    }
  }

  const state = readLocalState();
  return (
    state.boards.find((board) => board.roomId === roomId && board.teamId === teamId) ?? {
      id: `board-${teamId}`,
      roomId,
      teamId,
      locked: false,
      squares: createDefaultBoardSquares(roomId, teamId),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  );
}

export async function saveBoard(roomId: string, teamId: string, squares: BoardSquare[], locked: boolean) {
  const board: Board = {
    id: `board-${teamId}`,
    roomId,
    teamId,
    locked,
    squares,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(doc(db, "rooms", roomId, "boards", teamId), board, { merge: true });
      await setDoc(
        doc(db, "rooms", roomId, "teams", teamId),
        { boardLocked: locked },
        { merge: true },
      );
      await addGameEvent(roomId, "board_locked", locked ? "تم اعتماد اللوحة" : "تم حفظ اللوحة");
      return board;
    } catch (error) {
      console.warn("Firebase board save failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    boards: [
      ...state.boards.filter((item) => !(item.roomId === roomId && item.teamId === teamId)),
      board,
    ],
    teams: state.teams.map((team) =>
      team.roomId === roomId && team.id === teamId
        ? { ...team, boardLocked: locked }
        : team,
    ),
  }));

  return board;
}

export function createEmptyBoard(roomId: string, teamId: string) {
  return Array.from({ length: 12 }, (_, index): BoardSquare => ({
    id: createLocalId(`square-${index + 1}`),
    roomId,
    teamId,
    position: index + 1,
    kind: "points",
    value: 100,
    revealed: false,
  }));
}

export function watchBoards(roomId: string, callback: (boards: Board[]) => void) {
  const db = getFirebaseDb();
  if (db) {
    return onSnapshot(
      collection(db, "rooms", roomId, "boards"),
      (snapshot) => {
        callback(snapshot.docs.map((doc) => ({ ...(doc.data() as Board), id: doc.id })));
      },
      () => {
        void getBoards(roomId).then(callback);
      },
    );
  }

  void getBoards(roomId).then(callback);
  return () => {};
}
