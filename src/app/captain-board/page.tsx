"use client";

import { ActionLink, BoardGrid, InfoGrid, PageShell, Panel } from "../_components/game-ui";
import { mockBoard, teams } from "../_data/game";

const ownerTeam = teams[1];

export default function CaptainBoardPage() {
  return (
    <PageShell
      eyebrow="القائد"
      title="تجهيز اللوحة"
      description="القائد يرى القيم، والفرق الأخرى تختار مربعات مخفية."
    >
      <InfoGrid
        items={[
          { label: "الفريق", value: ownerTeam.name },
          { label: "القائد", value: ownerTeam.captain },
          { label: "المربعات", value: `${mockBoard.length}` },
          { label: "الألغام", value: "3" },
        ]}
      />

      <Panel title="لوحة مخفية">
        <BoardGrid showValues />
      </Panel>

      <Panel title="توزيع اللوحة">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {["100×2", "300×3", "500×2", "700×2", "لغم×3"].map((item) => (
            <div
              key={item}
              className="rounded-3xl bg-white p-4 text-center text-xl font-black shadow-sm ring-1 ring-slate-200"
            >
              {item}
            </div>
          ))}
        </div>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/play" variant="secondary">
          اللوحة جاهزة
        </ActionLink>
        <ActionLink href="/teams" variant="light">
          رجوع للفرق
        </ActionLink>
      </section>
    </PageShell>
  );
}
