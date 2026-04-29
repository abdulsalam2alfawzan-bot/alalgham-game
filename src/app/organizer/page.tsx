"use client";

import {
  ActionLink,
  InfoGrid,
  PageShell,
  Panel,
  TeamList,
} from "../_components/game-ui";
import { room, scoreEvents, teams } from "../_data/game";

export default function OrganizerPage() {
  return (
    <PageShell
      eyebrow="التحكم"
      title="لوحة المنظم"
      description="تابع النقاط، الدور، وحالة الغرفة من مكان واحد."
    >
      <InfoGrid
        items={[
          { label: "الغرفة", value: room.code },
          { label: "الحالة", value: "جولة 3" },
          { label: "الدور", value: teams[0].name },
          { label: "اللوحة", value: teams[1].name },
        ]}
      />

      <Panel title="أوامر سريعة">
        <div className="grid gap-3 sm:grid-cols-4">
          <button className="min-h-14 rounded-2xl bg-teal-600 px-4 text-lg font-black text-white">
            بدء
          </button>
          <button className="min-h-14 rounded-2xl bg-amber-400 px-4 text-lg font-black text-slate-950">
            إيقاف
          </button>
          <button className="min-h-14 rounded-2xl bg-slate-950 px-4 text-lg font-black text-white">
            التالي
          </button>
          <button className="min-h-14 rounded-2xl bg-rose-600 px-4 text-lg font-black text-white">
            خصم
          </button>
        </div>
      </Panel>

      <Panel title="النقاط">
        <TeamList compact />
      </Panel>

      <Panel title="السجل">
        <ol className="grid gap-3">
          {scoreEvents.map((event, index) => (
            <li
              key={event}
              className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 font-black">
                {index + 1}
              </span>
              <span className="font-bold text-slate-700">{event}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/play" variant="secondary">
          العودة للعب
        </ActionLink>
        <ActionLink href="/results" variant="light">
          إنهاء وعرض النتائج
        </ActionLink>
      </section>
    </PageShell>
  );
}
