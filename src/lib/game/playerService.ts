"use client";

import { collection, deleteField, doc, getDocs, onSnapshot, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import type { Player, Team } from "@/types/game";
import {
  getRoomByPlayerCode,
  isPlayerCodeExpired,
} from "@/lib/auth/roomAccess";
import { savePlayerSession } from "@/lib/auth/sessionRole";
import { signInAnonymouslyIfNeeded } from "@/lib/firebase/auth";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import {
  isValidPlayerCode,
  sanitizeCode,
  sanitizeName,
} from "@/lib/security/inputSafety";
import { addGameEvent } from "./eventService";
import { createLocalId, readLocalState, rememberPlayerSession, updateLocalState } from "./localStore";

type StoredPlayer = Omit<Player, "role"> & Partial<Pick<Player, "role">>;

function normalizePlayer(player: StoredPlayer): Player {
  return { ...player, role: player.role ?? "player" };
}

export async function getPlayers(roomId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDocs(collection(db, "rooms", roomId, "players"));
      return snapshot.docs.map((doc) => normalizePlayer({ ...(doc.data() as StoredPlayer), id: doc.id }));
    } catch (error) {
      console.warn("Firebase players read failed; using local fallback.", error);
    }
  }

  return readLocalState().players.filter((player) => player.roomId === roomId).map(normalizePlayer);
}

export async function joinRoom(playerCode: string, playerName: string) {
  const normalizedPlayerCode = sanitizeCode(playerCode);
  if (!isValidPlayerCode(normalizedPlayerCode)) {
    return { ok: false as const, message: "كود اللاعب غير صحيح" };
  }

  const room = await getRoomByPlayerCode(normalizedPlayerCode);
  if (!room) {
    return { ok: false as const, message: "كود اللاعب غير صحيح" };
  }

  if (isPlayerCodeExpired(room)) {
    return { ok: false as const, message: "انتهت صلاحية كود اللاعب" };
  }

  const safePlayerName = sanitizeName(playerName);
  if (!safePlayerName) {
    return { ok: false as const, message: "يرجى إدخال قيمة صحيحة" };
  }

  const user = await signInAnonymouslyIfNeeded();
  const db = getFirebaseDb();
  const now = Date.now();
  const player: Player = {
    id: createLocalId("player"),
    roomId: room.id,
    name: safePlayerName,
    uid: user?.uid ?? createLocalId("local-user"),
    role: "player",
    isCaptain: false,
    joinedAt: now,
    status: "active",
  };

  if (db) {
    try {
      await setDoc(doc(db, "rooms", room.id, "players", player.id), player);
      await addGameEvent(room.id, "player_joined", `انضم ${player.name}`);
      rememberPlayerSession(player.id);
      savePlayerSession({
        roomId: room.id,
        playerId: player.id,
        playerCode: normalizedPlayerCode,
        expiresAt: room.expiresAt,
        role: "player",
      });
      return { ok: true as const, room, player };
    } catch (error) {
      console.warn("Firebase join failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    currentRoomId: room.id,
    currentPlayerId: player.id,
    currentUserId: player.id,
    sessionRole: "player",
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
  savePlayerSession({
    roomId: room.id,
    playerId: player.id,
    playerCode: normalizedPlayerCode,
    expiresAt: room.expiresAt,
    role: "player",
  });

  return { ok: true as const, room, player };
}

export async function assignPlayerToTeam(roomId: string, playerId: string, teamId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      const batch = writeBatch(db);
      const playerRef = doc(db, "rooms", roomId, "players", playerId);
      let demoteCaptain = false;
      batch.update(playerRef, { teamId });
      const teamsSnapshot = await getDocs(collection(db, "rooms", roomId, "teams"));
      teamsSnapshot.docs.forEach((teamDoc) => {
        const team = { ...(teamDoc.data() as Team), id: teamDoc.id };
        if (team.id !== teamId && (team.captainId === playerId || team.captainPlayerId === playerId)) {
          demoteCaptain = true;
          batch.update(doc(db, "rooms", roomId, "teams", team.id), {
            captainId: deleteField(),
            captainPlayerId: deleteField(),
          });
        }
      });
      if (demoteCaptain) {
        batch.update(playerRef, { role: "player", isCaptain: false });
      }
      await batch.commit();
      await addGameEvent(roomId, "team_updated", "تم نقل لاعب إلى فريق");
      return;
    } catch (error) {
      console.warn("Firebase player team update failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => {
    const demoteCaptain = state.teams.some(
      (team) =>
        team.roomId === roomId &&
        team.id !== teamId &&
        (team.captainId === playerId || team.captainPlayerId === playerId),
    );

    return {
      ...state,
      teams: state.teams.map((team) =>
        team.roomId === roomId &&
        team.id !== teamId &&
        (team.captainId === playerId || team.captainPlayerId === playerId)
          ? { ...team, captainId: undefined, captainPlayerId: undefined }
          : team,
      ),
      players: state.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              teamId,
              role: demoteCaptain ? "player" : (player.role ?? "player"),
              isCaptain: demoteCaptain ? false : player.isCaptain,
            }
          : player,
      ),
    };
  });
}

export async function kickPlayer(roomId: string, playerId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      await updateDoc(doc(db, "rooms", roomId, "players", playerId), {
        status: "kicked",
      });
      await addGameEvent(roomId, "team_updated", "تم طرد لاعب");
      return;
    } catch (error) {
      console.warn("Firebase player kick failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    players: state.players.map((player) =>
      player.roomId === roomId && player.id === playerId
        ? { ...player, status: "kicked" }
        : player,
    ),
  }));
}

export function watchPlayers(roomId: string, callback: (players: Player[]) => void) {
  const db = getFirebaseDb();
  if (db) {
    return onSnapshot(
      collection(db, "rooms", roomId, "players"),
      (snapshot) => {
        callback(snapshot.docs.map((doc) => normalizePlayer({ ...(doc.data() as StoredPlayer), id: doc.id })));
      },
      () => {
        void getPlayers(roomId).then(callback);
      },
    );
  }

  void getPlayers(roomId).then(callback);
  return () => {};
}
