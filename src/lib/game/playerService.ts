"use client";

import { collection, doc, getDocs, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import type { Player } from "@/types/game";
import { signInAnonymouslyIfNeeded } from "@/lib/firebase/auth";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import { addGameEvent } from "./eventService";
import { createLocalId, readLocalState, rememberCurrentPlayer, updateLocalState } from "./localStore";
import { getRoomByCode } from "./roomService";

export async function getPlayers(roomId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDocs(collection(db, "rooms", roomId, "players"));
      return snapshot.docs.map((doc) => ({ ...(doc.data() as Player), id: doc.id }));
    } catch (error) {
      console.warn("Firebase players read failed; using local fallback.", error);
    }
  }

  return readLocalState().players.filter((player) => player.roomId === roomId);
}

export async function joinRoom(roomCode: string, playerName: string) {
  const room = await getRoomByCode(roomCode);
  if (!room) {
    return { ok: false as const, message: "رمز الغرفة غير صحيح" };
  }

  const user = await signInAnonymouslyIfNeeded();
  const db = getFirebaseDb();
  const now = Date.now();
  const player: Player = {
    id: createLocalId("player"),
    roomId: room.id,
    name: playerName.trim() || "لاعب",
    uid: user?.uid ?? createLocalId("local-user"),
    isCaptain: false,
    joinedAt: now,
  };

  if (db) {
    try {
      await setDoc(doc(db, "rooms", room.id, "players", player.id), player);
      await addGameEvent(room.id, "player_joined", `انضم ${player.name}`);
      rememberCurrentPlayer(player.id);
      return { ok: true as const, room, player };
    } catch (error) {
      console.warn("Firebase join failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    currentRoomId: room.id,
    currentPlayerId: player.id,
    players: [...state.players, player],
    events: [
      {
        id: createLocalId("event"),
        roomId: room.id,
        type: "player_joined",
        message: `انضم ${player.name}`,
        createdAt: now,
      },
      ...state.events,
    ],
  }));

  return { ok: true as const, room, player };
}

export async function assignPlayerToTeam(roomId: string, playerId: string, teamId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      await updateDoc(doc(db, "rooms", roomId, "players", playerId), { teamId });
      await addGameEvent(roomId, "team_updated", "تم نقل لاعب إلى فريق");
      return;
    } catch (error) {
      console.warn("Firebase player team update failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, teamId } : player,
    ),
  }));
}

export function watchPlayers(roomId: string, callback: (players: Player[]) => void) {
  const db = getFirebaseDb();
  if (db) {
    return onSnapshot(
      collection(db, "rooms", roomId, "players"),
      (snapshot) => {
        callback(snapshot.docs.map((doc) => ({ ...(doc.data() as Player), id: doc.id })));
      },
      () => {
        void getPlayers(roomId).then(callback);
      },
    );
  }

  void getPlayers(roomId).then(callback);
  return () => {};
}
