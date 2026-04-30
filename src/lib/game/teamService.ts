"use client";

import { collection, deleteField, doc, getDocs, onSnapshot, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import type { Player, Team } from "@/types/game";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import { sanitizeTeamName } from "@/lib/security/inputSafety";
import { addGameEvent } from "./eventService";
import { readLocalState, updateLocalState } from "./localStore";

export async function getTeams(roomId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDocs(collection(db, "rooms", roomId, "teams"));
      return snapshot.docs
        .map((doc) => ({ ...(doc.data() as Team), id: doc.id }))
        .sort((left, right) => left.order - right.order);
    } catch (error) {
      console.warn("Firebase teams read failed; using local fallback.", error);
    }
  }

  return readLocalState()
    .teams.filter((team) => team.roomId === roomId)
    .sort((left, right) => left.order - right.order);
}

export async function saveTeam(team: Team) {
  const db = getFirebaseDb();
  const updatedTeam = { ...team, name: sanitizeTeamName(team.name) || team.name };
  if (db) {
    try {
      await setDoc(doc(db, "rooms", team.roomId, "teams", team.id), updatedTeam, {
        merge: true,
      });
      await addGameEvent(team.roomId, "team_updated", `تم تحديث فريق ${team.name}`);
      return updatedTeam;
    } catch (error) {
      console.warn("Firebase team save failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    teams: state.teams.map((item) => (item.id === team.id ? updatedTeam : item)),
  }));
  return updatedTeam;
}

export async function removeCaptain(roomId: string, teamId: string) {
  const teams = await getTeams(roomId);
  const team = teams.find((item) => item.id === teamId);
  const captainId = team?.captainId ?? team?.captainPlayerId;
  const db = getFirebaseDb();

  if (db) {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "rooms", roomId, "teams", teamId), {
        captainId: deleteField(),
        captainPlayerId: deleteField(),
      });
      if (captainId) {
        batch.update(doc(db, "rooms", roomId, "players", captainId), {
          role: "player",
          isCaptain: false,
        });
      }
      await batch.commit();
      await addGameEvent(roomId, "team_updated", "تمت إزالة الكابتن");
      return;
    } catch (error) {
      console.warn("Firebase captain remove failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    teams: state.teams.map((item) =>
      item.roomId === roomId && item.id === teamId
        ? { ...item, captainId: undefined, captainPlayerId: undefined }
        : item,
    ),
    players: state.players.map((player) =>
      player.roomId === roomId && player.id === captainId
        ? { ...player, role: "player", isCaptain: false }
        : player,
    ),
  }));
}

export async function setCaptain(roomId: string, teamId: string, playerId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "rooms", roomId, "teams", teamId), {
        captainId: playerId,
        captainPlayerId: playerId,
      });
      batch.update(doc(db, "rooms", roomId, "players", playerId), {
        teamId,
        role: "captain",
        isCaptain: true,
      });
      const teamsSnapshot = await getDocs(collection(db, "rooms", roomId, "teams"));
      teamsSnapshot.docs.forEach((teamDoc) => {
        const team = { ...(teamDoc.data() as Team), id: teamDoc.id };
        if (team.id !== teamId && (team.captainId === playerId || team.captainPlayerId === playerId)) {
          batch.update(doc(db, "rooms", roomId, "teams", team.id), {
            captainId: deleteField(),
            captainPlayerId: deleteField(),
          });
        }
      });
      const playersSnapshot = await getDocs(collection(db, "rooms", roomId, "players"));
      playersSnapshot.docs.forEach((playerDoc) => {
        const player = { ...(playerDoc.data() as Player), id: playerDoc.id };
        if (player.id !== playerId && player.teamId === teamId && (player.isCaptain || player.role === "captain")) {
          batch.update(doc(db, "rooms", roomId, "players", player.id), {
            role: "player",
            isCaptain: false,
          });
        }
      });
      await batch.commit();
      await addGameEvent(roomId, "team_updated", "تم تعيين كابتن");
      return;
    } catch (error) {
      console.warn("Firebase captain update failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    teams: state.teams.map((team) =>
      team.roomId === roomId && team.id === teamId
        ? { ...team, captainId: playerId, captainPlayerId: playerId }
        : team.roomId === roomId && (team.captainId === playerId || team.captainPlayerId === playerId)
          ? { ...team, captainId: undefined, captainPlayerId: undefined }
          : team,
    ),
    players: state.players.map((player) =>
      player.roomId === roomId && player.id === playerId
        ? { ...player, role: "captain", isCaptain: true, teamId }
        : player.roomId === roomId && player.teamId === teamId && (player.isCaptain || player.role === "captain")
          ? { ...player, role: "player", isCaptain: false }
        : player,
    ),
  }));
}

export async function adjustTeamScore(roomId: string, teamId: string, amount: number) {
  const teams = await getTeams(roomId);
  const team = teams.find((item) => item.id === teamId);
  if (!team) {
    return;
  }

  const nextScore = team.score + amount;
  const db = getFirebaseDb();
  if (db) {
    try {
      await updateDoc(doc(db, "rooms", roomId, "teams", teamId), { score: nextScore });
      await addGameEvent(roomId, "score_adjusted", `تعديل نقاط ${team.name}: ${amount}`);
      return;
    } catch (error) {
      console.warn("Firebase score update failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    teams: state.teams.map((item) =>
      item.id === teamId ? { ...item, score: nextScore } : item,
    ),
  }));
}

export function watchTeams(roomId: string, callback: (teams: Team[]) => void) {
  const db = getFirebaseDb();
  if (db) {
    return onSnapshot(
      collection(db, "rooms", roomId, "teams"),
      (snapshot) => {
        callback(
          snapshot.docs
            .map((doc) => ({ ...(doc.data() as Team), id: doc.id }))
            .sort((left, right) => left.order - right.order),
        );
      },
      () => {
        void getTeams(roomId).then(callback);
      },
    );
  }

  void getTeams(roomId).then(callback);
  return () => {};
}
