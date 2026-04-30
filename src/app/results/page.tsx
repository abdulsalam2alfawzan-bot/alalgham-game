"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionLink, PageShell, Panel } from "../_components/game-ui";
import type { GameEvent, Team } from "@/types/game";
import { getRoomEvents } from "@/lib/game/eventService";
import { getRoom } from "@/lib/game/roomService";
import { getTeams } from "@/lib/game/teamService";

export default function ResultsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    async function loadResults() {
      const room = await getRoom();
      if (!room) {
        return;
      }

      setTeams(await getTeams(room.id));
      setEvents(await getRoomEvents(room.id));
    }

    void loadResults();
  }, []);

  const finalScores = useMemo(
    () => [...teams].sort((left, right) => right.score - left.score),
    [teams],
  );
  const winner = finalScores[0];
  const minesExploded = events.filter((event) => event.message.includes("انفجر")).length;
  const minesDefused = events.filter((event) => event.message.includes("تفكيك")).length;
  const doubleUsage = events.filter((event) => event.message.includes("دبل") || event.message.includes("double")).length;
  const objections = events.filter((event) => event.type === "objection");
  const scoreEvents = events.filter((event) => event.type === "score_adjusted" || event.type === "turn_resolved");

  return (
    <PageShell
      eyebrow="النهاية"
      title="النتائج"
      description="الفريق الأعلى نقاطًا هو الفائز."
    >
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-sm font-bold text-teal-200">الفائز</p>
        <h2 className="mt-2 text-4xl font-black">{winner?.name ?? "..."}</h2>
        <p className="mt-3 text-6xl font-black text-amber-300">
          {winner?.score ?? 0}
        </p>
      </section>

      <Panel title="الترتيب">
        <div className="grid gap-3">
          {finalScores.map((team, index) => (
            <article key={team.id} className="flex items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black">
                  {index + 1}
                </span>
                <h3 className="font-black text-slate-950">{team.name}</h3>
              </div>
              <strong className="text-2xl font-black text-slate-950">{team.score}</strong>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="إحصائيات اللعبة">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "إجابات صحيحة/خاطئة", value: `${scoreEvents.length}` },
            { label: "ألغام انفجرت", value: `${minesExploded}` },
            { label: "ألغام مفككة", value: `${minesDefused}` },
            { label: "استخدام الدبل", value: `${doubleUsage}` },
            { label: "الاعتراضات", value: `${objections.length}` },
            { label: "أحداث السجل", value: `${events.length}` },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-bold text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="ملخص الأحداث">
        <ol className="grid gap-3">
          {events.slice(0, 10).map((event, index) => (
            <li key={event.id} className="rounded-3xl bg-white p-4 font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
              {index + 1}. {event.message}
            </li>
          ))}
        </ol>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/owner" variant="secondary">
          دخول مالك الغرفة
        </ActionLink>
        <ActionLink href="/" variant="light">
          الرئيسية
        </ActionLink>
      </section>
    </PageShell>
  );
}
