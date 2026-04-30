"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import type { GameEvent, GameResultsSnapshot, Room, Team } from "@/types/game";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import { addGameEvent, getRoomEvents } from "./eventService";
import { createDefaultBoardSquares } from "./mockData";
import { updateLocalState } from "./localStore";
import { startingScore } from "./constants";
import { getTeams } from "./teamService";

const emptyStats: GameResultsSnapshot["stats"] = {
  correctAnswers: 0,
  wrongAnswers: 0,
  minesExploded: 0,
  minesDefused: 0,
  doubleUsed: 0,
  objectionsUsed: 0,
};

function countEvents(events: GameEvent[]) {
  return {
    correctAnswers: events.filter((event) => event.message.includes("صح")).length,
    wrongAnswers: events.filter((event) => event.message.includes("خطأ")).length,
    minesExploded: events.filter((event) => event.message.includes("انفجر")).length,
    minesDefused: events.filter((event) => event.message.includes("تفكيك")).length,
    doubleUsed: events.filter((event) => event.message.includes("دبل") || event.message.includes("double")).length,
    objectionsUsed: events.filter((event) => event.type === "objection").length,
  };
}

export function buildResultsSnapshot(
  teams: Team[],
  events: GameEvent[] = [],
  finishedAt: number | string = Date.now(),
): GameResultsSnapshot {
  const ranking = [...teams]
    .sort((left, right) => right.score - left.score)
    .map((team, index) => ({
      teamId: team.id,
      teamName: team.name,
      score: team.score,
      rank: index + 1,
    }));

  return {
    finishedAt,
    winnerTeamId: ranking[0]?.teamId,
    ranking,
    finalScores: Object.fromEntries(teams.map((team) => [team.id, team.score])),
    stats: { ...emptyStats, ...countEvents(events) },
  };
}

async function patchRoom(roomId: string, patch: Partial<Room>, eventMessage?: string) {
  const updatedAt = Date.now();
  const roomPatch = { ...patch, updatedAt };
  const db = getFirebaseDb();

  if (db) {
    try {
      await setDoc(doc(db, "rooms", roomId), roomPatch, { merge: true });
      if (eventMessage) {
        await addGameEvent(roomId, "game_state", eventMessage);
      }
      return;
    } catch (error) {
      console.warn("Firebase room state update failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    rooms: state.rooms.map((room) =>
      room.id === roomId ? { ...room, ...roomPatch } : room,
    ),
    events: eventMessage
      ? [
          {
            id: `event-${updatedAt}`,
            roomId,
            type: "game_state",
            message: eventMessage,
            createdAt: updatedAt,
          },
          ...state.events,
        ]
      : state.events,
  }));
}

export async function updateRoomLifecyclePatch(
  roomId: string,
  patch: Partial<Room>,
  eventMessage?: string,
) {
  await patchRoom(roomId, patch, eventMessage);
}

export async function setRoomLifecycleStatus(
  roomId: string,
  status: Room["status"],
  message?: string,
) {
  await patchRoom(roomId, { status }, message ?? `تم تحديث حالة الغرفة إلى ${status}`);
}

export async function startTeamAssignment(roomId: string) {
  await patchRoom(roomId, { status: "team_assignment" }, "بدأ توزيع الفرق");
}

export async function startBoardSetup(roomId: string) {
  await patchRoom(roomId, { status: "board_setup" }, "بدأ تجهيز اللوحات");
}

export async function startGame(roomId: string) {
  const teams = await getTeams(roomId);
  await patchRoom(
    roomId,
    { status: "playing", currentTurnTeamId: teams[0]?.id },
    teams[0] ? `بدأ دور ${teams[0].name}` : "بدأت اللعبة",
  );
}

export async function lockJoin(roomId: string) {
  await patchRoom(roomId, { isJoinLocked: true }, "تم قفل دخول اللاعبين");
}

export async function unlockJoin(roomId: string) {
  await patchRoom(roomId, { isJoinLocked: false }, "تم فتح دخول اللاعبين");
}

export async function lockRoom(roomId: string) {
  await patchRoom(
    roomId,
    { status: "locked", isJoinLocked: true },
    "تم قفل الغرفة نهائيًا",
  );
}

export async function unlockRoom(roomId: string) {
  await patchRoom(
    roomId,
    { status: "waiting", isJoinLocked: false },
    "تم فتح الغرفة",
  );
}

export async function pauseGame(roomId: string) {
  await patchRoom(roomId, { status: "paused" }, "تم إيقاف اللعبة مؤقتًا");
}

export async function resumeGame(roomId: string) {
  await patchRoom(roomId, { status: "playing" }, "تم استئناف اللعبة");
}

export async function endGame(roomId: string) {
  const [teams, events] = await Promise.all([getTeams(roomId), getRoomEvents(roomId)]);
  const finishedAt = Date.now();
  const results = buildResultsSnapshot(teams, events, finishedAt);
  await patchRoom(
    roomId,
    { status: "finished", finishedAt, results },
    "أنهى مالك الغرفة اللعبة",
  );
  return results;
}

export async function restartGame(roomId: string) {
  const teams = await getTeams(roomId);
  const hasCaptains = teams.some((team) => team.captainId || team.captainPlayerId);
  const nextStatus: Room["status"] = hasCaptains ? "board_setup" : "team_assignment";
  const updatedAt = Date.now();
  const db = getFirebaseDb();

  if (db) {
    try {
      const batch = writeBatch(db);
      teams.forEach((team) => {
        batch.set(
          doc(db, "rooms", roomId, "teams", team.id),
          { score: startingScore, doubleAvailable: true, boardLocked: false },
          { merge: true },
        );
        batch.set(
          doc(db, "rooms", roomId, "boards", team.id),
          {
            id: `board-${team.id}`,
            roomId,
            teamId: team.id,
            locked: false,
            squares: createDefaultBoardSquares(roomId, team.id),
            createdAt: updatedAt,
            updatedAt,
          },
          { merge: true },
        );
      });
      batch.set(
        doc(db, "rooms", roomId),
        {
          status: nextStatus,
          isJoinLocked: false,
          currentTurnTeamId: teams[0]?.id,
          finishedAt: null,
          results: null,
          updatedAt,
        },
        { merge: true },
      );
      await batch.commit();

      const turnsSnapshot = await getDocs(collection(db, "rooms", roomId, "turns"));
      await Promise.all(turnsSnapshot.docs.map((turnDoc) => deleteDoc(turnDoc.ref)));
      await addGameEvent(roomId, "game_state", "تمت إعادة تشغيل اللعبة");
      return nextStatus;
    } catch (error) {
      console.warn("Firebase restart failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    rooms: state.rooms.map((room) =>
      room.id === roomId
        ? {
            ...room,
            status: nextStatus,
            isJoinLocked: false,
            currentTurnTeamId: teams[0]?.id,
            finishedAt: undefined,
            results: undefined,
            updatedAt,
          }
        : room,
    ),
    teams: state.teams.map((team) =>
      team.roomId === roomId
        ? { ...team, score: startingScore, doubleAvailable: true, boardLocked: false }
        : team,
    ),
    boards: state.boards.map((board) =>
      board.roomId === roomId
        ? {
            ...board,
            locked: false,
            squares: createDefaultBoardSquares(roomId, board.teamId),
            updatedAt,
          }
        : board,
    ),
    turns: state.turns.filter((turn) => turn.roomId !== roomId),
    events: [
      {
        id: `event-${updatedAt}`,
        roomId,
        type: "game_state",
        message: "تمت إعادة تشغيل اللعبة",
        createdAt: updatedAt,
      },
      ...state.events,
    ],
  }));

  return nextStatus;
}
