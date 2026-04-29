"use client";

import { getAuth, signInAnonymously, type Auth, type User } from "firebase/auth";
import { getFirebaseApp } from "./client";

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export async function signInAnonymouslyIfNeeded(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  if (auth.currentUser) {
    return auth.currentUser;
  }

  try {
    const credential = await signInAnonymously(auth);
    return credential.user;
  } catch (error) {
    console.warn("Firebase anonymous auth unavailable; using local fallback.", error);
    return null;
  }
}
