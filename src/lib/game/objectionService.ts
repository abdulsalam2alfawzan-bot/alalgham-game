"use client";

import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import type { Objection, ObjectionStatus } from "@/types/game";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import { addGameEvent } from "./eventService";
import { createLocalId, readLocalState, updateLocalState } from "./localStore";

export async function getObjections(roomId: string) {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDocs(collection(db, "rooms", roomId, "objections"));
      return snapshot.docs.map((doc) => ({ ...(doc.data() as Objection), id: doc.id }));
    } catch (error) {
      console.warn("Firebase objections read failed; using local fallback.", error);
    }
  }

  return readLocalState().objections.filter((objection) => objection.roomId === roomId);
}

export async function saveObjection(objection: Omit<Objection, "id" | "createdAt" | "status">) {
  const nextObjection: Objection = {
    ...objection,
    id: createLocalId("objection"),
    status: "open",
    createdAt: Date.now(),
  };
  const db = getFirebaseDb();

  if (db) {
    try {
      await setDoc(
        doc(db, "rooms", nextObjection.roomId, "objections", nextObjection.id),
        nextObjection,
      );
      await addGameEvent(nextObjection.roomId, "objection", "تم تسجيل اعتراض");
      return nextObjection;
    } catch (error) {
      console.warn("Firebase objection save failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    objections: [...state.objections, nextObjection],
  }));
  return nextObjection;
}

export async function resolveObjection(roomId: string, objectionId: string, status: ObjectionStatus) {
  const resolvedAt = Date.now();
  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(
        doc(db, "rooms", roomId, "objections", objectionId),
        { status, resolvedAt },
        { merge: true },
      );
      await addGameEvent(roomId, "objection", status === "accepted" ? "تم قبول اعتراض" : "تم رفض اعتراض");
      return;
    } catch (error) {
      console.warn("Firebase objection resolve failed; using local fallback.", error);
    }
  }

  updateLocalState((state) => ({
    ...state,
    objections: state.objections.map((objection) =>
      objection.id === objectionId ? { ...objection, status, resolvedAt } : objection,
    ),
  }));
}
