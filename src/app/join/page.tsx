"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell, Panel, RoomBadge } from "../_components/game-ui";
import { QrScannerModal } from "@/components/qr/QrScannerModal";
import { joinRoom } from "@/lib/game/playerService";
import {
  inputErrorMessages,
  isSafeText,
  isValidPlayerCode,
  sanitizeCode,
  sanitizeName,
} from "@/lib/security/inputSafety";
import { parseQrValue } from "@/lib/qr/parseQrValue";

export default function JoinPage() {
  const router = useRouter();
  const [playerCode, setPlayerCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [message, setMessage] = useState("");
  const [qrMessage, setQrMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get("code") ?? params.get("room") ?? "";
      const parsed = parseQrValue(codeFromUrl);
      if (parsed.playerCode) {
        setPlayerCode(parsed.playerCode);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeCode = sanitizeCode(playerCode);
    const safeName = sanitizeName(playerName);

    if (!isValidPlayerCode(safeCode)) {
      setMessage("كود اللاعب غير صحيح");
      return;
    }

    if (!safeName || !isSafeText(safeName)) {
      setMessage(inputErrorMessages.required);
      return;
    }

    setIsJoining(true);
    const result = await joinRoom(safeCode, safeName);
    setIsJoining(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setMessage("تم دخول الغرفة");
    router.push(`/waiting-room?room=${result.room.id}`);
  }

  function handleJoinScan(value: string) {
    const parsed = parseQrValue(value);
    if (!parsed.valid || !parsed.playerCode) {
      setQrMessage("رمز QR غير صالح");
      return;
    }

    setPlayerCode(parsed.playerCode);
    setMessage("");
    setQrMessage("تم قراءة كود اللاعب، اضغط دخول الغرفة للمتابعة.");
  }

  return (
    <PageShell
      eyebrow="لاعب"
      title="دخول لاعب"
      description="اكتب كود اللاعب واسمك، ثم انضم للغرفة."
    >
      <RoomBadge code={playerCode || "----"} />

      <Panel title="بيانات اللاعب">
        <form className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200" onSubmit={handleJoin}>
          <label className="grid gap-2">
            <span className="font-bold text-slate-700">كود اللاعب</span>
            <input
              className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-2xl font-black uppercase tracking-[0.18em] outline-none focus:border-teal-500"
              maxLength={20}
              value={playerCode}
              onChange={(event) => setPlayerCode(sanitizeCode(event.target.value))}
              placeholder="P-4821-27"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-bold text-slate-700">اسم اللاعب</span>
            <input
              className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-teal-500"
              placeholder="مثال: أحمد"
              maxLength={30}
              value={playerName}
              onChange={(event) => setPlayerName(sanitizeName(event.target.value))}
            />
          </label>

          {message ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isJoining}
            className="min-h-14 rounded-2xl bg-teal-600 px-5 py-4 text-lg font-black text-white shadow-sm disabled:opacity-60"
          >
            {isJoining ? "جاري الدخول..." : "دخول الغرفة"}
          </button>
        </form>
      </Panel>

      <Panel title="الدخول عبر QR" tone="soft">
        <div className="grid gap-3">
          <p className="text-sm font-bold leading-6 text-teal-950">
            يمكنك مسح رمز QR بكاميرا الجوال أو إدخال كود اللاعب يدويًا.
          </p>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="min-h-14 rounded-2xl border border-teal-200 bg-white px-5 py-4 text-lg font-black text-teal-800"
          >
            مسح QR
          </button>
          {qrMessage ? (
            <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-6 text-slate-700 ring-1 ring-teal-100">
              {qrMessage}
            </p>
          ) : null}
        </div>
      </Panel>

      <QrScannerModal
        open={scannerOpen}
        title="مسح QR"
        onClose={() => setScannerOpen(false)}
        onScan={handleJoinScan}
      />
    </PageShell>
  );
}
