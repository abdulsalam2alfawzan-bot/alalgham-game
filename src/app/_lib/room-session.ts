"use client";

export type ActivationState = {
  code: string;
  activatedAt: number;
};

export type RoomInvitation = {
  roomCode: string;
  joinPath: string;
  joinUrl: string;
  activationCode?: string;
  createdAt: number;
};

export const mockActivationCodes = ["JWK-4821", "JWK-2026", "DEMO-1234"];

export const activationSuccessMessage = "تم تفعيل الغرفة بنجاح";
export const activationErrorMessage = "رمز التفعيل غير صحيح أو منتهي";

const activationKey = "alalgham.activation";
const activationMessageKey = "alalgham.activationMessage";
const invitationKey = "alalgham.roomInvitation";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function normalizeActivationCode(code: string) {
  return code.trim().toUpperCase();
}

export function isActivationCodeValid(code: string) {
  return mockActivationCodes.includes(normalizeActivationCode(code));
}

export function saveActivation(code: string) {
  if (!canUseStorage()) {
    return;
  }

  const activation: ActivationState = {
    code: normalizeActivationCode(code),
    activatedAt: Date.now(),
  };

  window.sessionStorage.setItem(activationKey, JSON.stringify(activation));
  window.sessionStorage.setItem(activationMessageKey, activationSuccessMessage);
}

export function readActivation(): ActivationState | null {
  if (!canUseStorage()) {
    return null;
  }

  const rawActivation = window.sessionStorage.getItem(activationKey);
  if (!rawActivation) {
    return null;
  }

  try {
    const activation = JSON.parse(rawActivation) as ActivationState;
    return isActivationCodeValid(activation.code) ? activation : null;
  } catch {
    return null;
  }
}

export function consumeActivationMessage() {
  if (!canUseStorage()) {
    return "";
  }

  const message = window.sessionStorage.getItem(activationMessageKey) ?? "";
  window.sessionStorage.removeItem(activationMessageKey);
  return message;
}

function generatePlayerRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function buildJoinPath(roomCode: string) {
  return `/join?room=${encodeURIComponent(roomCode)}`;
}

export function buildJoinUrl(roomCode: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${buildJoinPath(roomCode)}`;
}

export function createRoomInvitation(activationCode?: string): RoomInvitation {
  const roomCode = generatePlayerRoomCode();

  return {
    roomCode,
    joinPath: buildJoinPath(roomCode),
    joinUrl: buildJoinUrl(roomCode),
    activationCode,
    createdAt: Date.now(),
  };
}

export function saveRoomInvitation(invitation: RoomInvitation) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(invitationKey, JSON.stringify(invitation));
}

export function readRoomInvitation(fallbackRoomCode: string): RoomInvitation {
  const fallbackInvitation: RoomInvitation = {
    roomCode: fallbackRoomCode,
    joinPath: buildJoinPath(fallbackRoomCode),
    joinUrl: buildJoinUrl(fallbackRoomCode),
    createdAt: Date.now(),
  };

  if (!canUseStorage()) {
    return fallbackInvitation;
  }

  const rawInvitation = window.sessionStorage.getItem(invitationKey);
  if (!rawInvitation) {
    return fallbackInvitation;
  }

  try {
    const invitation = JSON.parse(rawInvitation) as RoomInvitation;
    return invitation.roomCode ? invitation : fallbackInvitation;
  } catch {
    return fallbackInvitation;
  }
}
