"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, PageShell, Panel } from "../_components/game-ui";
import { room } from "../_data/game";
import {
  consumeActivationMessage,
  createRoomInvitation,
  readActivation,
  saveRoomInvitation,
} from "../_lib/room-session";

type GateState = "checking" | "blocked" | "ready";

export default function CreateRoomPage() {
  const router = useRouter();
  const [gateState, setGateState] = useState<GateState>("checking");
  const [activationCode, setActivationCode] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const activation = readActivation();
    if (!activation) {
      setGateState("blocked");
      return;
    }

    setActivationCode(activation.code);
    setMessage(consumeActivationMessage());
    setGateState("ready");
  }, []);

  function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const invitation = createRoomInvitation(activationCode);
    saveRoomInvitation(invitation);
    router.push("/waiting-room");
  }

  if (gateState === "checking") {
    return (
      <PageShell
        eyebrow="غرفة جديدة"
        title="إنشاء غرفة"
        description="نتحقق من تفعيل الغرفة قبل بدء الإعداد."
      >
        <Panel>
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-600">
            جاري التحقق من رمز التفعيل...
          </p>
        </Panel>
      </PageShell>
    );
  }

  if (gateState === "blocked") {
    return (
      <PageShell
        eyebrow="غرفة جديدة"
        title="إنشاء غرفة"
        description="إنشاء الغرف يحتاج رمز تفعيل للمنظم."
      >
        <Panel title="التفعيل مطلوب">
          <div className="grid gap-4">
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
              أدخل رمز التفعيل أو امسح QR قبل إنشاء غرفة جديدة.
            </p>
            <ActionLink href="/activate" variant="secondary">
              تفعيل غرفة جديدة
            </ActionLink>
          </div>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="غرفة جديدة"
      title="إنشاء غرفة"
      description="إعداد سريع وبسيط. كل شيء محلي الآن."
    >
      {message ? (
        <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold leading-6 text-teal-900 ring-1 ring-teal-100">
          {message}
        </p>
      ) : null}

      <Panel title="الإعدادات">
        <form className="grid gap-4" onSubmit={handleCreateRoom}>
          <label className="grid gap-2">
            <span className="font-bold text-slate-700">اسم الغرفة</span>
            <input
              className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-teal-500"
              defaultValue={room.name}
            />
          </label>

          <label className="grid gap-2">
            <span className="font-bold text-slate-700">عدد الفرق</span>
            <select
              className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-teal-500"
              defaultValue={room.teamCount}
            >
              <option value="2">فريقان</option>
              <option value="3">3 فرق</option>
              <option value="4">4 فرق</option>
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="rounded-3xl bg-slate-50 p-4">
              <span className="font-bold text-slate-700">نقاط البداية</span>
              <input
                className="mt-2 w-full bg-transparent text-3xl font-black outline-none"
                defaultValue="1000"
              />
            </label>
            <label className="rounded-3xl bg-slate-50 p-4">
              <span className="font-bold text-slate-700">مربعات اللوحة</span>
              <input
                className="mt-2 w-full bg-transparent text-3xl font-black outline-none"
                defaultValue="12"
              />
            </label>
          </div>

          <button
            type="submit"
            className="min-h-14 rounded-2xl bg-teal-600 px-5 py-4 text-lg font-black text-white shadow-sm transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            إنشاء الغرفة
          </button>
        </form>
      </Panel>
    </PageShell>
  );
}
