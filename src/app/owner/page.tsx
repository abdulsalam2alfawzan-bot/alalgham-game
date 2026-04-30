"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell, Panel } from "../_components/game-ui";
import { QrScannerModal } from "@/components/qr/QrScannerModal";
import { validateOwnerCode } from "@/lib/auth/roomAccess";
import { saveOwnerSession } from "@/lib/auth/sessionRole";
import {
  inputErrorMessages,
  isValidOwnerCode,
  sanitizeCode,
} from "@/lib/security/inputSafety";
import { parseQrValue } from "@/lib/qr/parseQrValue";

export default function OwnerPage() {
  const router = useRouter();
  const [ownerCode, setOwnerCode] = useState("");
  const [message, setMessage] = useState("");
  const [qrMessage, setQrMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get("code") ?? "";
      const parsed = parseQrValue(codeFromUrl);
      if (parsed.ownerCode) {
        setOwnerCode(parsed.ownerCode);
      } else if (parsed.playerCode) {
        setMessage("هذا QR خاص باللاعبين وليس مالك الغرفة");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleOwnerLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeCode = sanitizeCode(ownerCode);

    if (!isValidOwnerCode(safeCode)) {
      setMessage("كود مالك الغرفة غير صحيح أو منتهي");
      return;
    }

    setIsSubmitting(true);
    const room = await validateOwnerCode(safeCode);
    setIsSubmitting(false);

    if (!room) {
      setMessage("كود مالك الغرفة غير صحيح أو منتهي");
      return;
    }

    saveOwnerSession(room);
    setMessage("تم دخول غرفة المشرف");
    router.push(`/supervisor-room?room=${room.id}`);
  }

  function handleOwnerScan(value: string) {
    const parsed = parseQrValue(value);
    if (parsed.playerCode) {
      setQrMessage("هذا QR خاص باللاعبين وليس مالك الغرفة");
      return;
    }

    if (!parsed.valid || !parsed.ownerCode) {
      setQrMessage("رمز QR غير صالح");
      return;
    }

    setOwnerCode(parsed.ownerCode);
    setMessage("");
    setQrMessage("تم قراءة كود مالك الغرفة، اضغط دخول غرفة المشرف للمتابعة.");
  }

  return (
    <PageShell
      eyebrow="مالك الغرفة"
      title="دخول مالك الغرفة"
      description="أدخل كود مالك الغرفة لإدارة الجلسة."
    >
      <Panel title="كود مالك الغرفة">
        <form className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200" onSubmit={handleOwnerLogin}>
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
            هذا الكود خاص بالمشرف فقط. لا تشاركه مع اللاعبين.
          </p>
          <label className="grid gap-2">
            <span className="font-bold text-slate-700">كود مالك الغرفة</span>
            <input
              className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-2xl font-black uppercase tracking-[0.18em] outline-none focus:border-teal-500"
              inputMode="text"
              maxLength={20}
              placeholder="M-4821-93"
              value={ownerCode}
              onChange={(event) => {
                const nextCode = sanitizeCode(event.target.value);
                setOwnerCode(nextCode);
                if (nextCode && !isValidOwnerCode(nextCode)) {
                  setMessage(inputErrorMessages.invalidCode);
                } else {
                  setMessage("");
                }
              }}
            />
          </label>

          {message ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-800 ring-1 ring-rose-100">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-14 rounded-2xl bg-teal-600 px-5 py-4 text-lg font-black text-white shadow-sm disabled:opacity-60"
          >
            {isSubmitting ? "جاري الدخول..." : "دخول غرفة المشرف"}
          </button>
        </form>
      </Panel>

      <Panel title="الدخول عبر QR" tone="soft">
        <div className="grid gap-3">
          <p className="text-sm font-bold leading-6 text-teal-950">
            QR كود مالك الغرفة — خاص بالمشرف.
          </p>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="min-h-14 rounded-2xl border border-teal-200 bg-white px-5 py-4 text-lg font-black text-teal-800"
          >
            مسح QR كود المالك
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
        title="مسح QR كود المالك"
        onClose={() => setScannerOpen(false)}
        onScan={handleOwnerScan}
      />
    </PageShell>
  );
}
