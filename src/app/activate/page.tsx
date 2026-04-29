"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, PageShell, Panel } from "../_components/game-ui";
import {
  activateCode,
  normalizeActivationCode,
} from "@/lib/game/activationService";

export default function ActivatePage() {
  const router = useRouter();
  const [activationCode, setActivationCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [qrMessage, setQrMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const codeFromQr = params.get("code");
      if (codeFromQr) {
        setActivationCode(normalizeActivationCode(codeFromQr));
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleActivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const normalizedCode = normalizeActivationCode(activationCode);
    const result = await activateCode(normalizedCode);
    setMessage(result.message);
    setIsSuccess(result.ok);
    setIsSubmitting(false);

    if (result.ok) {
      window.setTimeout(() => router.push("/create-room?activated=1"), 500);
    }
  }

  return (
    <PageShell
      eyebrow="تفعيل المنظم"
      title="تفعيل غرفة جديدة"
      description="أدخل رمز التفعيل أو امسح QR لبدء غرفة جديدة."
    >
      <Panel title="رمز التفعيل">
        <form className="grid gap-4" onSubmit={handleActivate}>
          <label className="grid gap-2">
            <span className="font-bold text-slate-700">رمز التفعيل</span>
            <input
              className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-xl font-black uppercase tracking-[0.18em] outline-none focus:border-teal-500"
              inputMode="text"
              placeholder="JWK-4821"
              value={activationCode}
              onChange={(event) => setActivationCode(event.target.value)}
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-14 rounded-2xl bg-teal-600 px-5 py-4 text-lg font-black text-white shadow-sm transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {isSubmitting ? "جاري التفعيل..." : "تفعيل الغرفة"}
          </button>

          {isSuccess ? (
            <ActionLink href="/create-room?activated=1" variant="light">
              متابعة إنشاء الغرفة
            </ActionLink>
          ) : null}
        </form>
      </Panel>

      <Panel title="تفعيل عبر QR" tone="soft">
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() =>
              setQrMessage(
                "يمكنك مسح QR من كاميرا الجوال، أو إدخال رمز التفعيل يدويًا.",
              )
            }
            className="min-h-14 rounded-2xl border border-teal-200 bg-white px-5 py-4 text-lg font-black text-teal-800 shadow-sm transition hover:border-teal-300"
          >
            مسح QR التفعيل
          </button>

          {qrMessage ? (
            <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-6 text-slate-700 ring-1 ring-teal-100">
              {qrMessage}
            </p>
          ) : null}
        </div>
      </Panel>
    </PageShell>
  );
}
