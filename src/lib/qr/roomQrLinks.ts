"use client";

import { getPublicAppUrl } from "@/lib/firebase/client";
import { sanitizeCode } from "@/lib/security/inputSafety";

const fallbackPublicAppUrl = "https://alalgham-game.web.app";

function getBaseUrl() {
  return (getPublicAppUrl() || fallbackPublicAppUrl).replace(/\/$/, "");
}

export function buildOwnerQrPath(ownerCode: string) {
  return `/owner?code=${encodeURIComponent(sanitizeCode(ownerCode))}`;
}

export function buildPlayerQrPath(playerCode: string) {
  return `/join?code=${encodeURIComponent(sanitizeCode(playerCode))}`;
}

export function buildOwnerQrUrl(ownerCode: string) {
  return `${getBaseUrl()}${buildOwnerQrPath(ownerCode)}`;
}

export function buildPlayerQrUrl(playerCode: string) {
  return `${getBaseUrl()}${buildPlayerQrPath(playerCode)}`;
}
