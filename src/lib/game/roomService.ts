"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { Room, RoomSettings, Team } from "@/types/game";
import {
  generatePlayerCode,
  generateSupervisorCode,
  getPlayerCodeExpiry,
  getRoomExpiry,
  getSupervisorCodeExpiry,
} from "@/lib/auth/roomAccess";
import { saveSupervisorSession } from "@/lib/auth/sessionRole";
import { signInAnonymouslyIfNeeded } from "@/lib/firebase/auth";
import { getPublicAppUrl } from "@/lib/firebase/client";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import { clampNumber, sanitizeRoomName } from "@/lib/security/inputSafety";
import {
  defaultRoomSettings,
  defaultTeamNames,
  startingScore,
  teamColors,
} from "./constants";
import { addGameEvent } from "./eventService";
import {
  createLocalId,
  generateRoomCode,
  readLocalState,
  rememberCurrentRoom,
  rememberOrganizerSession,
  updateLocalState,
} from "./localStore";

export type CreateRoomInput = {
  activationCode: string;
  name: string;
  settings: RoomSettings;
  organizerUid?: string;
};

export function buildJoinPath(roomCode: string) {
  return `/join?code=${encodeURIComponent(roomCode)}`;
}

export function buildJoinUrl(roomCode: string) {
  const appUrl = getPublicAppUrl();
  return appUrl ? `${appUrl}${buildJoinPath(roomCode)}` : buildJoinPath(roomCode);
}

function createTeamsForRoom(roomId: string, teamCount: number): Team[] {
  return Array.from({ length: teamCount }, (_, index) => ({
    id: createLocalId(`team-${index + 1}`),
    roomId,
    name: defaultTeamNames[index] ?? `فريق ${index + 1}`,
    color: teamColors[index] ?? "bg-slate-600",
    score: startingScore,
    order: index,
    doubleAvailable: true,
    boardLocked: false,
  }));
}

function normalizeRoomSettings(settings: RoomSettings): RoomSettings {
  const teamsCount = clampNumber(settings.teamsCount ?? settings.teamCount, 2, 4, defaultRoomSettings.teamsCount);
  const playersPerTeam = clampNumber(settings.playersPerTeam, 1, 5, defaultRoomSettings.playersPerTeam);
  const objectionsPerTeam = clampNumber(
    settings.objectionsPerTeam ?? settings.objectionsCount,
    0,
    5,
    defaultRoomSettings.objectionsPerTeam,
  );

  return {
    ...defaultRoomSettings,
    ...settings,
    teamsCount,
    teamCount: teamsCount,
    playersPerTeam,
    minePenalty: 500,
    mineReflection: Boolean(settings.mineReflectionEnabled ?? settings.mineReflection),
    mineReflectionEnabled: Boolean(settings.mineReflectionEnabled ?? settings.mineReflection),
    objectionsCount: objectionsPerTeam,
    objectionsPerTeam,
    startingScore,
  };
}

export async function createRoom(input: CreateRoomInput) {
  const db = getFirebaseDb();
  const user = await signInAnonymouslyIfNeeded();
  const now = Date.now();
  const organizerUid = input.organizerUid ?? user?.uid ?? "local-organizer";
  const roomCode = generateRoomCode();
  const settings = normalizeRoomSettings(input.settings);
  const supervisorCode = generateSupervisorCode(roomCode);
  let playerCode = generatePlayerCode(roomCode);
  if (playerCode === supervisorCode) {
    playerCode = generatePlayerCode(`${roomCode}1`);
  }
  const roomName = sanitizeRoomName(input.name) || "غرفة الألغام";

  if (db) {
    try {
      const roomRef = doc(collection(db, "rooms"));
      const room: Room = {
        id: roomRef.id,
        name: roomName,
        roomCode,
        activationCode: input.activationCode,
        organizerId: organizerUid,
        organizerUid,
        supervisorCode,
        supervisorCodeExpiresAt: getSupervisorCodeExpiry(now),
        playerCode,
        playerCodeExpiresAt: getPlayerCodeExpiry(now),
        expiresAt: getRoomExpiry(now),
        status: "waiting",
        settings,
        createdAt: now,
        updatedAt: now,
      };
      const teams = createTeamsForRoom(room.id, settings.teamsCount);
      const batch = writeBatch(db);

      batch.set(roomRef, room);
      teams.forEach((team) => {
        batch.set(doc(db, "rooms", room.id, "teams", team.id), team);
      });
      batch.set(doc(db, "activationCodes", input.activationCode), {
        status: "used",
        usedByRoomId: room.id,
        updatedAt: now,
      }, { merge: true });

      await batch.commit();
      await addGameEvent(room.id, "room_created", "تم إنشاء الغرفة", {
        roomCode,
      });
      rememberCurrentRoom(room.id);
      rememberOrganizerSession(organizerUid);
      saveSupervisorSession(room);
      return { room, teams };
    } catch (error) {
      console.warn("Firebase room create failed; using local fallback.", error);
    }
  }

  const room: Room = {
    id: createLocalId("room"),
    name: roomName,
    roomCode,
    activationCode: input.activationCode,
    organizerId: organizerUid,
    organizerUid,
    supervisorCode,
    supervisorCodeExpiresAt: getSupervisorCodeExpiry(now),
    playerCode,
    playerCodeExpiresAt: getPlayerCodeExpiry(now),
    expiresAt: getRoomExpiry(now),
    status: "waiting",
    settings,
    createdAt: now,
    updatedAt: now,
  };
  const teams = createTeamsForRoom(room.id, settings.teamsCount);

  updateLocalState((state) => ({
    ...state,
    currentRoomId: room.id,
    rooms: [...state.rooms, room],
    teams: [...state.teams, ...teams],
    events: [
      {
        id: createLocalId("event"),
        roomId: room.id,
        type: "room_created",
        message: "تم إنشاء الغرفة",
        createdAt: now,
        payload: { roomCode },
      },
      ...state.events,
    ],
  }));
  rememberOrganizerSession(organizerUid);
  saveSupervisorSession(room);

  return { room, teams };
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

export async function getRoomByCode(roomCode: string) {
  const normalizedCode = roomCode.trim();
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDocs(
        query(collection(db, "rooms"), where("roomCode", "==", normalizedCode), limit(1)),
      );
      const firstRoom = snapshot.docs[0];
      if (firstRoom) {
        return { ...(firstRoom.data() as Room), id: firstRoom.id };
      }
    } catch (error) {
      console.warn("Firebase room lookup failed; using local fallback.", error);
    }
  }

  return readLocalState().rooms.find((room) => room.roomCode === normalizedCode);
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
