"use client";

import { useEffect, useMemo, useState } from "react";
import type { Board, EffectiveRole, Question, Room, Team } from "@/types/game";
import { readRoomSession } from "@/lib/auth/sessionRole";
import { getBoards } from "@/lib/game/boardService";
import { addGameEvent } from "@/lib/game/eventService";
import { createDefaultBoardSquares } from "@/lib/game/mockData";
import {
  canSubmitAnswer,
  canUseDouble,
  unauthorizedMessage,
} from "@/lib/game/permissions";
import { saveObjection } from "@/lib/game/objectionService";
import { getQuestions } from "@/lib/game/questionService";
import { getRoom } from "@/lib/game/roomService";
import { getTeams, saveTeam } from "@/lib/game/teamService";
import { selectQuestionForSquare } from "@/lib/game/questionSelection";
import { sanitizeAnswer } from "@/lib/security/inputSafety";

type PlayBoardProps = {
  role: EffectiveRole;
  captainTeamId?: string;
};

export function PlayBoard({ role, captainTeamId }: PlayBoardProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attackerTeamId, setAttackerTeamId] = useState("");
  const [ownerTeamId, setOwnerTeamId] = useState("");
  const [selectedSquareId, setSelectedSquareId] = useState("");
  const [useDouble, setUseDouble] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const [message, setMessage] = useState("اختر فريقًا منافسًا ومربعًا، ثم أرسل الإجابة للمشرف.");
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    async function loadPlayData() {
      const session = readRoomSession();
      const activeRoom = await getRoom(session?.roomId);
      if (!activeRoom) {
        return;
      }

      const roomTeams = await getTeams(activeRoom.id);
      const roomBoards = await getBoards(activeRoom.id);
      const roomQuestions = await getQuestions();
      const attackerId = captainTeamId ?? activeRoom.currentTurnTeamId ?? roomTeams[0]?.id ?? "";
      const ownerId = roomTeams.find((team) => team.id !== attackerId)?.id ?? "";

      setRoom(activeRoom);
      setTeams(roomTeams);
      setBoards(roomBoards);
      setQuestions(roomQuestions);
      setAttackerTeamId(attackerId);
      setOwnerTeamId(ownerId);
    }

    const timer = window.setTimeout(() => {
      void loadPlayData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [captainTeamId]);

  const attacker = teams.find((team) => team.id === attackerTeamId);
  const owner = teams.find((team) => team.id === ownerTeamId);
  const ownerBoard = useMemo(() => {
    if (!room || !ownerTeamId) {
      return undefined;
    }

    return (
      boards.find((board) => board.teamId === ownerTeamId) ?? {
        id: `board-${ownerTeamId}`,
        roomId: room.id,
        teamId: ownerTeamId,
        locked: false,
        squares: createDefaultBoardSquares(room.id, ownerTeamId),
        createdAt: 0,
        updatedAt: 0,
      }
    );
  }, [boards, ownerTeamId, room]);
  const selectedSquare = ownerBoard?.squares.find((square) => square.id === selectedSquareId);
  const currentQuestion = selectedSquare
    ? selectQuestionForSquare(selectedSquare, questions)
    : questions[0];

  useEffect(() => {
    if (!currentQuestion || !room) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft(room.settings.answerDurations[currentQuestion.pointValue] ?? 30);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentQuestion, room]);

  useEffect(() => {
    if (!selectedSquare || secondsLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft, selectedSquare]);

  function changeOwner(teamId: string) {
    setOwnerTeamId(teamId);
    setSelectedSquareId("");
    setSubmittedAnswer("");
  }

  async function toggleDouble() {
    if (!canUseDouble(role)) {
      setMessage(unauthorizedMessage);
      return;
    }

    if (!attacker?.doubleAvailable) {
      setMessage("تم استخدام الدبل لهذا الفريق.");
      return;
    }

    setUseDouble((current) => !current);
  }

  async function submitCaptainAnswer() {
    if (!canSubmitAnswer(role)) {
      setMessage(unauthorizedMessage);
      return;
    }

    if (!room || !attacker || !owner || !selectedSquare) {
      setMessage("اختر مربعًا قبل إرسال الإجابة.");
      return;
    }

    const safeAnswer = sanitizeAnswer(submittedAnswer);
    if (!safeAnswer) {
      setMessage("اكتب الإجابة النهائية قبل الإرسال.");
      return;
    }

    if (useDouble && attacker.doubleAvailable) {
      const updatedAttacker = { ...attacker, doubleAvailable: false };
      await saveTeam(updatedAttacker);
      setTeams((current) => current.map((team) => (team.id === attacker.id ? updatedAttacker : team)));
    }

    await addGameEvent(room.id, "team_updated", `إجابة كابتن ${attacker.name}: ${safeAnswer}`, {
      attackerTeamId: attacker.id,
      ownerTeamId: owner.id,
      squareId: selectedSquare.id,
      useDouble,
    });

    setMessage("تم إرسال الإجابة للمشرف.");
    setSubmittedAnswer("");
    setUseDouble(false);
  }

  async function submitObjection() {
    if (!canSubmitAnswer(role)) {
      setMessage(unauthorizedMessage);
      return;
    }

    if (!room || !attacker) {
      return;
    }

    await saveObjection({
      roomId: room.id,
      teamId: attacker.id,
      text: "اعتراض من الكابتن",
    });
    setMessage("تم إرسال الاعتراض للمنظم.");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-500">فريقك</span>
            <select
              className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-bold"
              value={attackerTeamId}
              disabled={Boolean(captainTeamId)}
              onChange={(event) => setAttackerTeamId(event.target.value)}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-500">الفريق المنافس</span>
            <select
              className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-bold"
              value={ownerTeamId}
              onChange={(event) => changeOwner(event.target.value)}
            >
              {teams
                .filter((team) => team.id !== attackerTeamId)
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {ownerBoard?.squares.map((square) => {
            const selected = square.id === selectedSquareId;
            return (
              <button
                key={square.id}
                type="button"
                disabled={square.revealed}
                onClick={() => setSelectedSquareId(square.id)}
                className={`flex aspect-square flex-col items-center justify-center rounded-3xl p-2 text-center text-xl font-black transition ${
                  selected
                    ? "bg-amber-400 text-slate-950 ring-4 ring-amber-200"
                    : square.revealed
                      ? "bg-slate-200 text-slate-500"
                      : "bg-slate-950 text-white hover:bg-slate-800"
                }`}
              >
                <span>{square.revealed || selected ? (square.kind === "mine" ? "لغم" : square.value) : "؟"}</span>
                <span className="mt-1 text-xs font-bold opacity-70">{square.position}</span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
          <p className="text-sm font-bold text-teal-200">السؤال الحالي</p>
          <h3 className="mt-2 text-xl font-black">{currentQuestion?.category ?? "..."}</h3>
          <p className="mt-3 leading-7 text-slate-100">{currentQuestion?.questionText ?? "اختر مربعًا"}</p>
          <p className="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-sm">
            المؤقت: {secondsLeft} ثانية
          </p>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-black text-slate-950">النقاط</h3>
          <div className="mt-3 grid gap-2">
            {teams.map((team) => (
              <div key={team.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                <span className="font-bold">{team.name}</span>
                <strong>{team.score}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">الدبل</h3>
              <p className="text-sm text-slate-500">
                متاح: {attacker?.doubleAvailable ? "نعم" : "لا"}
              </p>
            </div>
            <button
              type="button"
              disabled={!attacker?.doubleAvailable}
              onClick={toggleDouble}
              className={`min-h-12 rounded-2xl px-4 text-sm font-black disabled:opacity-40 ${
                useDouble ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {useDouble ? "مفعلة" : "تفعيل الدبل"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="min-h-12 text-base font-bold leading-7 text-slate-700">{message}</p>
          <label className="mt-3 grid gap-2">
            <span className="text-sm font-bold text-slate-500">
              إجابة الكابتن
            </span>
            <input
              className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-bold outline-none focus:border-teal-500"
              value={submittedAnswer}
              maxLength={200}
              onChange={(event) => setSubmittedAnswer(sanitizeAnswer(event.target.value))}
              placeholder="اكتب الإجابة النهائية"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={submitCaptainAnswer}
              className="min-h-14 rounded-2xl bg-teal-600 px-4 text-base font-black text-white"
            >
              إرسال الإجابة
            </button>
            <button
              type="button"
              onClick={submitObjection}
              className="min-h-14 rounded-2xl bg-amber-400 px-4 text-base font-black text-slate-950"
            >
              اعتراض
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
