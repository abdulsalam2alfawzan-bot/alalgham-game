import {
  isValidActivationCode,
  isValidPlayerCode,
  isValidRoomCode,
  isValidSupervisorCode,
  sanitizeCode,
} from "@/lib/security/inputSafety";

export type ParsedQrValue = {
  raw: string;
  activationCode?: string;
  supervisorCode?: string;
  playerCode?: string;
  roomCode?: string;
  valid: boolean;
};

function readAllowedParam(value: string) {
  try {
    const url = new URL(value, "https://alalgham.local");
    const allowedParams = ["activation", "code", "room"];
    for (const name of allowedParams) {
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

  if (isValidActivationCode(code) && !code.startsWith("M-") && !code.startsWith("P-")) {
    return { raw: rawCode, activationCode: code, valid: true };
  }

  if (isValidSupervisorCode(code)) {
    return { raw: rawCode, supervisorCode: code, valid: true };
  }

  if (isValidPlayerCode(code)) {
    return { raw: rawCode, playerCode: code, valid: true };
  }

  if (isValidRoomCode(code)) {
    return { raw: rawCode, roomCode: code, valid: true };
  }

  return { raw: rawCode, valid: false };
}

export function parseQrValue(value: string): ParsedQrValue {
  const raw = String(value ?? "").trim().slice(0, 300);
  const param = readAllowedParam(raw);

  if (param?.value) {
    const parsed = classifyCode(param.value);
    if (param.name === "activation" && parsed.activationCode) {
      return parsed;
    }

    if (param.name === "room" && parsed.roomCode) {
      return parsed;
    }

    if (param.name === "code" && (parsed.activationCode || parsed.supervisorCode || parsed.playerCode)) {
      return parsed;
    }

    return { raw, valid: false };
  }

  return classifyCode(raw);
}
