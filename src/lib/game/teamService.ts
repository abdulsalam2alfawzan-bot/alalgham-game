"use client";

import { collection, doc, getDocs, onSnapshot, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import type { Team } from "@/types/game";
import { getFirebaseDb } from "@/lib/firebase/firestore";
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
  const updatedTeam = { ...team };
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

export async function setCaptain(roomId: string, teamId: string, playerId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "rooms", roomId, "teams", teamId), {
        captainPlayerId: playerId,
      });
      batch.update(doc(db, "rooms", roomId, "players", playerId), {
        teamId,
        isCaptain: true,
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
        ? { ...team, captainPlayerId: playerId }
        : team,
    ),
    players: state.players.map((player) =>
      player.roomId === roomId
        ? { ...player, isCaptain: player.id === playerId, teamId: player.id === playerId ? teamId : player.teamId }
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
