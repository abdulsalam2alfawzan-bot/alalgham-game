"use client";

import { useEffect, useState } from "react";
import { ActionLink, PageShell, Panel, RoomBadge } from "../_components/game-ui";
import { room, teams } from "../_data/game";
import { readRoomInvitation } from "../_lib/room-session";

export default function JoinPage() {
  const [roomCode, setRoomCode] = useState(room.code);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("room");
    const invitation = readRoomInvitation(room.code);
    setRoomCode(codeFromUrl ?? invitation.roomCode);
  }, []);

  return (
    <PageShell
      eyebrow="لاعب"
      title="دخول لاعب"
      description="اكتب الرمز والاسم، ثم انضم للفريق."
    >
      <RoomBadge code={roomCode} />

      <Panel title="بيانات اللاعب">
        <form className="grid gap-4">
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
            />
          </label>

          <label className="grid gap-2">
            <span className="font-bold text-slate-700">الفريق</span>
            <select className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-teal-500">
              {teams.map((team) => (
                <option key={team.id}>{team.name}</option>
              ))}
            </select>
          </label>
        </form>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/waiting-room" variant="secondary">
          دخول الغرفة
        </ActionLink>
        <ActionLink href="/teams" variant="light">
          عرض الفرق
        </ActionLink>
      </section>
    </PageShell>
  );
}
