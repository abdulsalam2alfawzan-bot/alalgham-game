"use client";

import { useEffect, useState } from "react";
import {
  ActionLink,
  InfoGrid,
  PageShell,
  Panel,
  RoomBadge,
  TeamList,
} from "../_components/game-ui";
import { QrCode } from "../_components/qr-code";
import { room, teams } from "../_data/game";
import type { RoomInvitation } from "../_lib/room-session";
import { readRoomInvitation } from "../_lib/room-session";

export default function WaitingRoomPage() {
  const [invitation, setInvitation] = useState<RoomInvitation | null>(null);
  const playerCount = teams.reduce((sum, team) => sum + team.players.length, 0);
  const roomCode = invitation?.roomCode ?? room.code;
  const joinUrl = invitation?.joinUrl ?? `/join?room=${roomCode}`;

  useEffect(() => {
    setInvitation(readRoomInvitation(room.code));
  }, []);

  const qrValue = joinUrl.length <= 78 ? joinUrl : `/join?room=${roomCode}`;

  return (
    <PageShell
      eyebrow="انتظار اللاعبين"
      title="غرفة الانتظار"
      description="شارك الرمز، ثم ابدأ تقسيم الفرق عندما يكتمل العدد."
    >
      <RoomBadge code={roomCode} />

      <Panel title="دعوة اللاعبين">
        <div className="grid gap-4 lg:grid-cols-[1fr_12rem] lg:items-center">
          <div className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div>
              <p className="text-sm font-bold text-slate-500">
                رمز دخول اللاعبين
              </p>
              <p className="mt-2 text-5xl font-black tracking-[0.35em] text-slate-950">
                {roomCode}
              </p>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-500">
                رابط انضمام اللاعبين
              </span>
              <input
                readOnly
                value={joinUrl}
                className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none"
              />
            </label>

            <p className="text-sm font-bold leading-6 text-slate-500">
              هذا الرمز وQR الدعوة للاعبين فقط. رمز التفعيل مخصص للمنظم قبل إنشاء الغرفة.
            </p>
          </div>

          <QrCode label="QR الدعوة للاعبين" value={qrValue} />
        </div>
      </Panel>

      <InfoGrid
        items={[
          { label: "الغرفة", value: room.name },
          { label: "اللاعبون", value: `${playerCount}` },
          { label: "الفرق", value: `${teams.length}` },
          { label: "الحالة", value: "بانتظار" },
        ]}
      />

      <Panel title="اللاعبون">
        <TeamList />
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/teams" variant="secondary">
          تقسيم الفرق
        </ActionLink>
        <ActionLink href="/join" variant="light">
          دخول لاعب
        </ActionLink>
      </section>
    </PageShell>
  );
}
