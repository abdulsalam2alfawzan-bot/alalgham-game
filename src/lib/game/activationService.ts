"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import type { ActivationCode } from "@/types/game";
import { signInAnonymouslyIfNeeded } from "@/lib/firebase/auth";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import { mockActivationCodes } from "./constants";
import { readLocalState, rememberActivation, updateLocalState } from "./localStore";

export const activationSuccessMessage = "تم تفعيل الغرفة بنجاح";
export const activationErrorMessage = "رمز التفعيل غير صحيح أو منتهي";

export type ActivationResult = {
  ok: boolean;
  message: string;
  activationCode?: ActivationCode;
  organizerUid?: string;
};

export function normalizeActivationCode(code: string) {
  return code.trim().toUpperCase();
}

function isExpired(activationCode: ActivationCode) {
  return Boolean(activationCode.expiresAt && activationCode.expiresAt < Date.now());
}

function canActivate(activationCode: ActivationCode) {
  return activationCode.status === "unused" && !isExpired(activationCode);
}

function fallbackActivate(code: string, organizerUid = "local-organizer"): ActivationResult {
  const normalizedCode = normalizeActivationCode(code);
  const existingCode = readLocalState().activationCodes.find(
    (activationCode) => activationCode.code === normalizedCode,
  );

  if (existingCode && !canActivate(existingCode)) {
    return { ok: false, message: activationErrorMessage };
  }

  if (!existingCode && !mockActivationCodes.includes(normalizedCode)) {
    return { ok: false, message: activationErrorMessage };
  }

  const activatedCode: ActivationCode = {
    ...(existingCode ?? {
      code: normalizedCode,
      packageType: "demo",
      createdAt: Date.now(),
    }),
    status: "reserved",
    reservedByUid: organizerUid,
    updatedAt: Date.now(),
  };

  updateLocalState((state) => ({
    ...state,
    activationCodes: [
      ...state.activationCodes.filter((activationCode) => activationCode.code !== normalizedCode),
      activatedCode,
    ],
  }));
  rememberActivation(normalizedCode);

  return {
    ok: true,
    message: activationSuccessMessage,
    activationCode: activatedCode,
    organizerUid,
  };
}

export async function activateCode(code: string): Promise<ActivationResult> {
  const normalizedCode = normalizeActivationCode(code);
  const user = await signInAnonymouslyIfNeeded();
  const organizerUid = user?.uid ?? "local-organizer";
  const db = getFirebaseDb();

  if (db) {
    try {
      const ref = doc(db, "activationCodes", normalizedCode);
      const snapshot = await getDoc(ref);

      if (snapshot.exists()) {
        const activationCode = {
          ...(snapshot.data() as ActivationCode),
          code: normalizedCode,
        };

        if (!canActivate(activationCode)) {
          return { ok: false, message: activationErrorMessage };
        }

        const reservedCode: ActivationCode = {
          ...activationCode,
          status: "reserved",
          reservedByUid: organizerUid,
          updatedAt: Date.now(),
        };

        await setDoc(ref, reservedCode, { merge: true });
        rememberActivation(normalizedCode);
        return {
          ok: true,
          message: activationSuccessMessage,
          activationCode: reservedCode,
          organizerUid,
        };
      }

      if (mockActivationCodes.includes(normalizedCode)) {
        const seededCode: ActivationCode = {
          code: normalizedCode,
          status: "reserved",
          packageType: "demo",
          reservedByUid: organizerUid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await setDoc(ref, seededCode, { merge: true });
        rememberActivation(normalizedCode);
        return {
          ok: true,
          message: activationSuccessMessage,
          activationCode: seededCode,
          organizerUid,
        };
      }
    } catch (error) {
      console.warn("Firebase activation failed; using local fallback.", error);
    }
  }

  return fallbackActivate(normalizedCode, organizerUid);
}
