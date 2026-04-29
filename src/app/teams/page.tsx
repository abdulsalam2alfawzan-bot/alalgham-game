"use client";

import { ActionLink, InfoGrid, PageShell, Panel, TeamList } from "../_components/game-ui";
import { teams } from "../_data/game";

export default function TeamsPage() {
  return (
    <PageShell
      eyebrow="الفرق"
      title="تقسيم الفرق"
      description="كل فريق يبدأ بـ 1000 نقطة وله قائد ولوحة مخفية."
    >
      <InfoGrid
        items={[
          { label: "الحد الأدنى", value: "2" },
          { label: "الحد الأعلى", value: "4" },
          { label: "البداية", value: "1000" },
          { label: "مضاعفة", value: "1" },
        ]}
      />

      <Panel title="الفرق">
        <TeamList />
      </Panel>

      <Panel title="ترتيب الدور">
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((team, index) => (
            <div
              key={team.id}
              className="rounded-3xl bg-slate-50 p-4 text-slate-950"
            >
              <p className="text-sm font-bold text-slate-500">
                الدور {index + 1}
              </p>
              <p className="mt-1 text-2xl font-black">{team.name}</p>
              <p className="mt-2 text-sm text-slate-600">
                القائد: {team.captain}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/captain-board" variant="secondary">
          تجهيز اللوحة
        </ActionLink>
        <ActionLink href="/waiting-room" variant="light">
          رجوع للانتظار
        </ActionLink>
      </section>
    </PageShell>
  );
}
