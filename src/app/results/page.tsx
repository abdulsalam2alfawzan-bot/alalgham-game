"use client";

import { useMemo } from "react";
import { ActionLink, PageShell, Panel } from "../_components/game-ui";
import { useRoomState } from "@/lib/game/roomState";

export default function ResultsPage() {
  const { room, teams, events, syncing } = useRoomState();

  const finalScores = useMemo(
    () =>
      room?.results?.ranking?.length
        ? room.results.ranking.map((entry) => ({
            id: entry.teamId,
            name: entry.teamName,
            score: entry.score,
          }))
        : [...teams].sort((left, right) => right.score - left.score),
    [room, teams],
  );
  const winner = finalScores[0];
  const savedStats = room?.results?.stats;
  const minesExploded = savedStats?.minesExploded ?? events.filter((event) => event.message.includes("انفجر")).length;
  const minesDefused = savedStats?.minesDefused ?? events.filter((event) => event.message.includes("تفكيك")).length;
  const doubleUsage = savedStats?.doubleUsed ?? events.filter((event) => event.message.includes("دبل") || event.message.includes("double")).length;
  const objectionsCount = savedStats?.objectionsUsed ?? events.filter((event) => event.type === "objection").length;
  const answersCount = (savedStats?.correctAnswers ?? 0) + (savedStats?.wrongAnswers ?? 0);
  const scoreEvents = events.filter((event) => event.type === "score_adjusted" || event.type === "turn_resolved");

  return (
    <PageShell
      eyebrow="النهاية"
      title="النتائج"
      description={`الفريق الأعلى نقاطًا هو الفائز. ${room?.roomNumber ? `رقم الغرفة ${room.roomNumber}` : ""}`}
    >
      {syncing ? (
        <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-900">
          جاري التحديث...
        </p>
      ) : null}
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
            { label: "إجابات صحيحة/خاطئة", value: `${answersCount || scoreEvents.length}` },
            { label: "ألغام انفجرت", value: `${minesExploded}` },
            { label: "ألغام مفككة", value: `${minesDefused}` },
            { label: "استخدام الدبل", value: `${doubleUsage}` },
            { label: "الاعتراضات", value: `${objectionsCount}` },
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
