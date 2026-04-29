"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell, Panel, RoomBadge } from "../_components/game-ui";
import { joinRoom } from "@/lib/game/playerService";

export default function JoinPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [message, setMessage] = useState("");
  const [qrMessage, setQrMessage] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setRoomCode(params.get("room") ?? "4821");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsJoining(true);
    const result = await joinRoom(roomCode, playerName);
    setIsJoining(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setMessage("تم دخول الغرفة");
    router.push(`/waiting-room?room=${result.room.roomCode}`);
  }

  return (
    <PageShell
      eyebrow="لاعب"
      title="دخول لاعب"
      description="اكتب رمز الغرفة واسمك، ثم انضم للعبة."
    >
      <RoomBadge code={roomCode || "----"} />

      <Panel title="بيانات اللاعب">
        <form className="grid gap-4" onSubmit={handleJoin}>
          <label className="grid gap-2">
            <span className="font-bold text-slate-700">رمز الغرفة</span>
            <input
              className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-3xl font-black tracking-[0.35em] outline-none focus:border-teal-500"
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="font-bold text-slate-700">اسمك</span>
            <input
              className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-teal-500"
              placeholder="مثال: أحمد"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
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
          <button
            type="button"
            onClick={() =>
              setQrMessage("يمكنك مسح رمز QR بكاميرا الجوال أو إدخال رمز الغرفة يدويًا.")
            }
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
    </PageShell>
  );
}
