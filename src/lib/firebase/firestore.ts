"use client";

import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseApp, isFirebaseConfigured } from "./client";

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export function shouldUseFirebase() {
  return typeof window !== "undefined" && isFirebaseConfigured();
}
