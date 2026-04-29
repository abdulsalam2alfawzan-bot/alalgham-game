"use client";

import { useEffect, useState } from "react";
import { ActionLink, InfoGrid, PageShell, Panel } from "../_components/game-ui";
import type { GameEvent, Question, Room, Team, Turn } from "@/types/game";
import { addGameEvent, getRoomEvents } from "@/lib/game/eventService";
import { getQuestions } from "@/lib/game/questionService";
import { getRoom, updateRoomStatus } from "@/lib/game/roomService";
import { adjustTeamScore, getTeams } from "@/lib/game/teamService";
import { getCurrentTurn } from "@/lib/game/turnService";

const controlActions = [
  "صح",
  "خطأ",
  "تغيير السؤال",
  "حذف السؤال",
  "إلغاء السؤال",
  "قبول اعتراض",
  "رفض اعتراض",
  "تغيير كابتن",
  "طرد لاعب",
  "إيقاف مؤقت",
];

export default function OrganizerPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [turn, setTurn] = useState<Turn | undefined>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [pointsDelta, setPointsDelta] = useState(100);
  const [message, setMessage] = useState("");

  async function loadControl() {
    const activeRoom = await getRoom();
    if (!activeRoom) {
      return;
    }

    const roomTeams = await getTeams(activeRoom.id);
    setRoom(activeRoom);
    setTeams(roomTeams);
    setEvents(await getRoomEvents(activeRoom.id));
    setTurn(await getCurrentTurn(activeRoom.id));
    setQuestions(await getQuestions());
    setSelectedTeamId(roomTeams[0]?.id ?? "");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadControl();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function logAction(action: string) {
    if (!room) {
      return;
    }

    await addGameEvent(room.id, "turn_resolved", `إجراء المنظم: ${action}`);
    setMessage(`تم تسجيل إجراء: ${action}`);
    await loadControl();
  }

  async function changeScore(amount: number) {
    if (!room || !selectedTeamId) {
      return;
    }

    await adjustTeamScore(room.id, selectedTeamId, amount);
    await addGameEvent(room.id, "score_adjusted", `تعديل نقاط: ${amount}`);
    await loadControl();
  }

  async function finishGame() {
    if (!room) {
      return;
    }

    await updateRoomStatus(room.id, "finished");
    await addGameEvent(room.id, "game_finished", "تم إنهاء اللعبة");
    setMessage("تم إنهاء اللعبة");
    await loadControl();
  }

  const currentQuestion = questions[0];
  const activeTeam = teams.find((team) => team.id === selectedTeamId);

  return (
    <PageShell
      eyebrow="التحكم"
      title="لوحة المنظم"
      description="إدارة السؤال الحالي والنقاط والاعتراضات من مكان واحد."
    >
      {message ? (
        <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold leading-6 text-teal-900 ring-1 ring-teal-100">
          {message}
        </p>
      ) : null}

      <InfoGrid
        items={[
          { label: "الغرفة", value: room?.roomCode ?? "..." },
          { label: "الحالة", value: room?.status ?? "..." },
          { label: "الدور", value: turn?.attackerTeamId ?? teams[0]?.name ?? "..." },
          { label: "الفريق", value: activeTeam?.name ?? "..." },
        ]}
      />

      <Panel title="السؤال الحالي" tone="dark">
        <div className="grid gap-3">
          <p className="text-sm font-bold text-teal-200">{currentQuestion?.category ?? "تصنيف"}</p>
          <h2 className="text-2xl font-black">{currentQuestion?.questionText ?? "لا يوجد سؤال محدد"}</h2>
          <p className="rounded-2xl bg-white/10 px-3 py-2 text-sm">
            الإجابة المرسلة: {turn?.submittedAnswer ?? "لم ترسل بعد"}
          </p>
        </div>
      </Panel>

      <Panel title="أوامر المنظم">
        <div className="grid gap-3 sm:grid-cols-3">
          {controlActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => logAction(action)}
              className="min-h-14 rounded-2xl bg-white px-3 text-base font-black text-slate-800 shadow-sm ring-1 ring-slate-200"
            >
              {action}
            </button>
          ))}
          <button
            type="button"
            onClick={finishGame}
            className="min-h-14 rounded-2xl bg-rose-600 px-3 text-base font-black text-white shadow-sm"
          >
            إنهاء اللعبة
          </button>
        </div>
      </Panel>

      <Panel title="إضافة أو خصم نقاط">
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem_8rem]">
          <select
            className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-bold"
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center font-black"
            value={pointsDelta}
            onChange={(event) => setPointsDelta(Number(event.target.value))}
          />
          <button
            type="button"
            onClick={() => changeScore(pointsDelta)}
            className="min-h-12 rounded-2xl bg-teal-600 px-3 font-black text-white"
          >
            إضافة
          </button>
          <button
            type="button"
            onClick={() => changeScore(-pointsDelta)}
            className="min-h-12 rounded-2xl bg-rose-600 px-3 font-black text-white"
          >
            خصم
          </button>
        </div>
      </Panel>

      <Panel title="النقاط">
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <span className="font-black">{team.name}</span>
              <strong className="text-2xl">{team.score}</strong>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="السجل">
        <ol className="grid gap-3">
          {events.slice(0, 8).map((event, index) => (
            <li key={event.id} className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 font-black">
                {index + 1}
              </span>
              <span className="font-bold text-slate-700">{event.message}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/play" variant="secondary">
          العودة للعب
        </ActionLink>
        <ActionLink href="/results" variant="light">
          النتائج
        </ActionLink>
      </section>
    </PageShell>
  );
}
