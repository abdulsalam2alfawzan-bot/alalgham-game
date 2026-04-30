import {
  isValidOwnerCode,
  isValidPlayerCode,
  sanitizeCode,
} from "@/lib/security/inputSafety";

export type ParsedQrValue = {
  raw: string;
  ownerCode?: string;
  playerCode?: string;
  valid: boolean;
};

function readAllowedParam(value: string) {
  try {
    const url = new URL(value, "https://alalgham.local");
    for (const name of ["code"]) {
      const param = url.searchParams.get(name);
      if (param) {
        return { name, value: sanitizeCode(param) };
      }
    }

    if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
      return null;
    }
  } catch {
    return null;
  }

  return null;
}

function classifyCode(rawCode: string): ParsedQrValue {
  const code = sanitizeCode(rawCode);

  if (isValidOwnerCode(code)) {
    return { raw: rawCode, ownerCode: code, valid: true };
  }

  if (isValidPlayerCode(code)) {
    return { raw: rawCode, playerCode: code, valid: true };
  }

  return { raw: rawCode, valid: false };
}

export function parseQrValue(value: string): ParsedQrValue {
  const raw = String(value ?? "").trim().slice(0, 300);
  const param = readAllowedParam(raw);

  if (param?.value) {
    const parsed = classifyCode(param.value);
    if (param.name === "code" && (parsed.ownerCode || parsed.playerCode)) {
      return parsed;
    }

    return { raw, valid: false };
  }

  return classifyCode(raw);
}
