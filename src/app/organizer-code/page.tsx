"use client";

import { ActionLink, InfoGrid, PageShell, Panel } from "../_components/game-ui";
import { room } from "../_data/game";

export default function OrganizerCodePage() {
  return (
    <PageShell
      eyebrow="المنظم"
      title="رمز المنظم"
      description="استخدم هذا الرمز لفتح لوحة التحكم أثناء اللعب."
    >
      <Panel>
        <p className="text-sm font-bold text-slate-500">رمز التحكم</p>
        <p className="mt-3 text-center text-6xl font-black tracking-[0.35em] text-slate-950">
          {room.organizerCode}
        </p>
      </Panel>

      <InfoGrid
        items={[
          { label: "الغرفة", value: room.name },
          { label: "رمز اللاعبين", value: room.code },
          { label: "الحالة", value: room.status },
          { label: "الفرق", value: `${room.teamCount}` },
        ]}
      />

      <section className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/create-room" variant="secondary">
          إنشاء غرفة
        </ActionLink>
        <ActionLink href="/organizer" variant="light">
          لوحة التحكم
        </ActionLink>
      </section>
    </PageShell>
  );
}
