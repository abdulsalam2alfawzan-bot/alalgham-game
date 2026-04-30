"use client";

const htmlTagPattern = /<\/?[a-z][\s\S]*?>/gi;
const dangerousPatterns = [
  /<\s*\/?\s*script\b/gi,
  /<\s*\/?\s*(iframe|object|embed|style)\b/gi,
  /\bon[a-z]+\s*=/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
];
const controlCharsPattern = /[\u0000-\u001f\u007f]/g;
const repeatedSpacesPattern = /\s+/g;
const unsafeSymbolsPattern = /[<>{}\[\]`;]/g;

export const inputErrorMessages = {
  invalid: "المدخل غير صالح",
  invalidCode: "الرمز يحتوي على أحرف غير مسموحة",
  nameTooLong: "الاسم طويل جدًا",
  dangerous: "لا يمكن استخدام رموز برمجية أو وسوم HTML",
  required: "يرجى إدخال قيمة صحيحة",
};

export function stripDangerousInput(value: string) {
  let nextValue = String(value ?? "");
  dangerousPatterns.forEach((pattern) => {
    nextValue = nextValue.replace(pattern, "");
  });

  return nextValue
    .replace(htmlTagPattern, "")
    .replace(controlCharsPattern, "")
    .replace(unsafeSymbolsPattern, "")
    .replace(repeatedSpacesPattern, " ")
    .trim();
}

export function isSafeText(value: string) {
  const text = String(value ?? "");
  if (!text.trim()) {
    return false;
  }

  htmlTagPattern.lastIndex = 0;
  return !dangerousPatterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  }) && !htmlTagPattern.test(text);
}

function limit(value: string, maxLength: number) {
  return stripDangerousInput(value).slice(0, maxLength);
}

export function sanitizeText(value: string, maxLength = 120) {
  return limit(value, maxLength);
}

export function sanitizeName(value: string) {
  return limit(value, 30).replace(/[^\u0600-\u06ffA-Za-z0-9 -]/g, "");
}

export function sanitizeCode(value: string) {
  return String(value ?? "")
    .replace(controlCharsPattern, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 20);
}

export function sanitizeAnswer(value: string) {
  return limit(value, 200);
}

export function sanitizeRoomName(value: string) {
  return limit(value, 40).replace(/[^\u0600-\u06ffA-Za-z0-9 ()_-]/g, "");
}

export function sanitizeTeamName(value: string) {
  return limit(value, 25).replace(/[^\u0600-\u06ffA-Za-z0-9 _-]/g, "");
}

export function sanitizeObjection(value: string) {
  return limit(value, 300);
}

export function sanitizeReason(value: string) {
  return limit(value, 120);
}

function isValidCode(value: string, maxLength = 20) {
  const code = sanitizeCode(value);
  return Boolean(code) && code.length <= maxLength && /^[A-Z0-9-]+$/.test(code);
}

export function isValidOwnerCode(value: string) {
  return isValidCode(value) && /^M-[A-Z0-9]+-[A-Z0-9]+$/.test(sanitizeCode(value));
}

export function isValidPlayerCode(value: string) {
  return isValidCode(value) && /^P-[A-Z0-9]+-[A-Z0-9]+$/.test(sanitizeCode(value));
}

export function isValidRoomCode(value: string) {
  return isValidCode(value);
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numericValue));
}
