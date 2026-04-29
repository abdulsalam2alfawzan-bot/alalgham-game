"use client";

import { ActionLink, PageShell, Panel } from "../_components/game-ui";
import { teams } from "../_data/game";

const finalScores = [
  { ...teams[0], score: 1850 },
  { ...teams[1], score: 1450 },
  { ...teams[2], score: 1000 },
  { ...teams[3], score: 500 },
].sort((a, b) => b.score - a.score);

export default function ResultsPage() {
  const winner = finalScores[0];

  return (
    <PageShell
      eyebrow="النهاية"
      title="النتائج"
      description="الفريق الأعلى نقاطاً هو الفائز."
    >
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-sm font-bold text-teal-200">الفائز</p>
        <h2 className="mt-2 text-4xl font-black">{winner.name}</h2>
        <p className="mt-3 text-6xl font-black text-amber-300">
          {winner.score}
        </p>
      </section>

      <Panel title="الترتيب">
        <div className="grid gap-3">
          {finalScores.map((team, index) => (
            <article
              key={team.id}
              className="flex items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-black text-slate-950">{team.name}</h3>
                  <p className="text-sm text-slate-500">
                    القائد: {team.captain}
                  </p>
                </div>
              </div>
              <strong className="text-2xl font-black text-slate-950">
                {team.score}
              </strong>
            </article>
          ))}
        </div>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/create-room" variant="secondary">
          لعبة جديدة
        </ActionLink>
        <ActionLink href="/" variant="light">
          الرئيسية
        </ActionLink>
      </section>
    </PageShell>
  );
}
