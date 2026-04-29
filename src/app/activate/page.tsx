"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell, Panel } from "../_components/game-ui";
import {
  activationErrorMessage,
  isActivationCodeValid,
  normalizeActivationCode,
  saveActivation,
} from "../_lib/room-session";

export default function ActivatePage() {
  const router = useRouter();
  const [activationCode, setActivationCode] = useState("");
  const [message, setMessage] = useState("");
  const [qrMessage, setQrMessage] = useState("");

  function handleActivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = normalizeActivationCode(activationCode);
    if (!isActivationCodeValid(normalizedCode)) {
      setMessage(activationErrorMessage);
      return;
    }

    saveActivation(normalizedCode);
    router.push("/create-room");
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
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-800 ring-1 ring-rose-100">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            className="min-h-14 rounded-2xl bg-teal-600 px-5 py-4 text-lg font-black text-white shadow-sm transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            تفعيل وإنشاء غرفة
          </button>
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
