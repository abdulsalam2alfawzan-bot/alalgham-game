"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell, Panel } from "../_components/game-ui";
import { QrScannerModal } from "@/components/qr/QrScannerModal";
import { validateSupervisorCode } from "@/lib/auth/roomAccess";
import { saveSupervisorSession } from "@/lib/auth/sessionRole";
import {
  activateCode,
  normalizeActivationCode,
} from "@/lib/game/activationService";
import {
  inputErrorMessages,
  isValidActivationCode,
  isValidSupervisorCode,
  sanitizeCode,
} from "@/lib/security/inputSafety";
import { parseQrValue } from "@/lib/qr/parseQrValue";

export default function ActivatePage() {
  const router = useRouter();
  const [activationCode, setActivationCode] = useState("");
  const [supervisorCode, setSupervisorCode] = useState("");
  const [message, setMessage] = useState("");
  const [supervisorMessage, setSupervisorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [qrMessage, setQrMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSupervisorSubmitting, setIsSupervisorSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const codeFromQr = params.get("activation") ?? params.get("code");
      if (codeFromQr) {
        const parsed = parseQrValue(codeFromQr);
        if (parsed.activationCode) {
          setActivationCode(parsed.activationCode);
        } else if (parsed.supervisorCode) {
          setSupervisorCode(parsed.supervisorCode);
        }
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleActivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = normalizeActivationCode(sanitizeCode(activationCode));

    if (!isValidActivationCode(normalizedCode)) {
      setMessage(inputErrorMessages.invalidCode);
      setIsSuccess(false);
      return;
    }

    setIsSubmitting(true);
    const result = await activateCode(normalizedCode);
    setMessage(result.message);
    setIsSuccess(result.ok);
    setIsSubmitting(false);

    if (result.ok) {
      window.setTimeout(() => router.push("/create-room?activated=1"), 500);
    }
  }

  async function handleSupervisorLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = sanitizeCode(supervisorCode);

    if (!isValidSupervisorCode(normalizedCode)) {
      setSupervisorMessage("كود المشرف غير صحيح أو منتهي");
      return;
    }

    setIsSupervisorSubmitting(true);
    const room = await validateSupervisorCode(normalizedCode);
    setIsSupervisorSubmitting(false);

    if (!room) {
      setSupervisorMessage("كود المشرف غير صحيح أو منتهي");
      return;
    }

    saveSupervisorSession(room);
    setSupervisorMessage("تم دخول غرفة المشرف");
    router.push(`/supervisor-room?room=${room.id}`);
  }

  function handleActivationScan(value: string) {
    const parsed = parseQrValue(value);
    if (!parsed.valid || !parsed.activationCode) {
      setQrMessage("رمز QR غير صالح");
      return;
    }

    setActivationCode(normalizeActivationCode(parsed.activationCode));
    setIsSuccess(false);
    setMessage("");
    setQrMessage("تم قراءة الرمز، اضغط تفعيل وإنشاء غرفة للمتابعة.");
  }

  return (
    <PageShell
      eyebrow="المشرف"
      title="تفعيل غرفة جديدة"
      description="أدخل رمز التفعيل لإنشاء غرفة، أو استخدم كود المشرف للدخول إلى غرفة قائمة."
    >
      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="تفعيل غرفة جديدة">
          <form className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200" onSubmit={handleActivate}>
            <p className="text-sm font-bold leading-6 text-slate-500">
              أدخل رمز التفعيل أو امسح QR لبدء غرفة جديدة.
            </p>
            <label className="grid gap-2">
              <span className="font-bold text-slate-700">رمز التفعيل</span>
              <input
                className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-xl font-black uppercase tracking-[0.18em] outline-none focus:border-teal-500"
                inputMode="text"
                maxLength={20}
                placeholder="JWK-4821"
                value={activationCode}
                onChange={(event) => setActivationCode(sanitizeCode(event.target.value))}
              />
            </label>

            {message ? (
              <p
                className={`rounded-2xl px-4 py-3 text-sm font-bold leading-6 ring-1 ${
                  isSuccess
                    ? "bg-teal-50 text-teal-900 ring-teal-100"
                    : "bg-rose-50 text-rose-800 ring-rose-100"
                }`}
              >
                {message}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-14 rounded-2xl bg-teal-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
              >
                {isSubmitting ? "جاري التفعيل..." : "تفعيل وإنشاء غرفة"}
              </button>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="min-h-14 rounded-2xl border border-teal-200 bg-white px-5 py-4 text-base font-black text-teal-800 shadow-sm transition hover:border-teal-300"
              >
                مسح QR التفعيل
              </button>
            </div>

            {qrMessage ? (
              <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold leading-6 text-teal-900 ring-1 ring-teal-100">
                {qrMessage}
              </p>
            ) : null}
          </form>
        </Panel>

        <Panel title="دخول مشرف لغرفة قائمة">
          <form className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200" onSubmit={handleSupervisorLogin}>
            <p className="text-sm font-bold leading-6 text-slate-500">
              كود المشرف خاص بإدارة الغرفة فقط ولا يستخدم لدخول اللاعبين.
            </p>
            <label className="grid gap-2">
              <span className="font-bold text-slate-700">كود المشرف</span>
              <input
                className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-xl font-black uppercase tracking-[0.18em] outline-none focus:border-teal-500"
                inputMode="text"
                maxLength={20}
                placeholder="M-4821-93"
                value={supervisorCode}
                onChange={(event) => setSupervisorCode(sanitizeCode(event.target.value))}
              />
            </label>
            {supervisorMessage ? (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
                {supervisorMessage}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isSupervisorSubmitting}
              className="min-h-14 rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white shadow-sm disabled:opacity-60"
            >
              {isSupervisorSubmitting ? "جاري الدخول..." : "دخول غرفة المشرف"}
            </button>
          </form>
        </Panel>
      </section>

      <QrScannerModal
        open={scannerOpen}
        title="مسح QR التفعيل"
        onClose={() => setScannerOpen(false)}
        onScan={handleActivationScan}
      />
    </PageShell>
  );
}
