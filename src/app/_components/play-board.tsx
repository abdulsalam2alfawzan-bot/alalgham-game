"use client";

import { useMemo, useState } from "react";
import { mockBoard, questions, teams } from "../_data/game";
import type { BoardSquare, TeamId } from "../_data/game";

type Phase = "attacker" | "owner";

const firstAttacker: TeamId = "falcons";
const firstOwner: TeamId = "palms";

function makeScores() {
  return Object.fromEntries(
    teams.map((team) => [team.id, team.score]),
  ) as Record<TeamId, number>;
}

function makeDoubles() {
  return Object.fromEntries(teams.map((team) => [team.id, true])) as Record<
    TeamId,
    boolean
  >;
}

export function PlayBoard() {
  const [scores, setScores] = useState(makeScores);
  const [doubles, setDoubles] = useState(makeDoubles);
  const [attackerId, setAttackerId] = useState<TeamId>(firstAttacker);
  const [ownerId, setOwnerId] = useState<TeamId>(firstOwner);
  const [selectedId, setSelectedId] = useState(mockBoard[0].id);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("attacker");
  const [useDouble, setUseDouble] = useState(false);
  const [message, setMessage] = useState("اختر مربعاً ثم ابدأ السؤال.");

  const selectedSquare = mockBoard.find((square) => square.id === selectedId);
  const currentQuestion = questions[selectedId % questions.length];

  const ownerBoard = useMemo(
    () =>
      mockBoard.map((square) => ({
        ...square,
        ownerTeamId: ownerId,
      })),
    [ownerId],
  );

  const attacker = teams.find((team) => team.id === attackerId) ?? teams[0];
  const owner = teams.find((team) => team.id === ownerId) ?? teams[1];
  const allDone = revealed.length === mockBoard.length;

  function changeScore(teamId: TeamId, amount: number) {
    setScores((current) => ({
      ...current,
      [teamId]: current[teamId] + amount,
    }));
  }

  function consumeDouble() {
    if (!useDouble) {
      return;
    }

    setDoubles((current) => ({
      ...current,
      [attackerId]: false,
    }));
  }

  function reveal(square: BoardSquare) {
    setRevealed((current) =>
      current.includes(square.id) ? current : [...current, square.id],
    );
  }

  function chooseNextSquare(square: BoardSquare) {
    const nextSquare = mockBoard.find(
      (item) => item.id !== square.id && !revealed.includes(item.id),
    );

    if (nextSquare) {
      setSelectedId(nextSquare.id);
    }
  }

  function finishTurn(square: BoardSquare, nextMessage: string) {
    reveal(square);
    consumeDouble();
    setUseDouble(false);
    setPhase("attacker");
    setMessage(nextMessage);
    chooseNextSquare(square);
  }

  function attackerCorrect() {
    if (!selectedSquare) {
      return;
    }

    if (selectedSquare.kind === "mine") {
      finishTurn(selectedSquare, "إجابة صحيحة. لا يوجد خصم.");
      return;
    }

    changeScore(attackerId, selectedSquare.value);
    finishTurn(
      selectedSquare,
      `${attacker.name} حصلوا على ${selectedSquare.value} نقطة.`,
    );
  }

  function attackerWrong() {
    if (!selectedSquare) {
      return;
    }

    if (selectedSquare.kind === "mine") {
      const penalty = useDouble ? 1000 : 500;
      changeScore(attackerId, -penalty);
      finishTurn(selectedSquare, `لغم! خسر ${attacker.name} ${penalty} نقطة.`);
      return;
    }

    consumeDouble();
    setUseDouble(false);
    setPhase("owner");
    setMessage(`الإجابة انتقلت إلى ${owner.name}.`);
  }

  function ownerCorrect() {
    if (!selectedSquare) {
      return;
    }

    changeScore(ownerId, selectedSquare.value);
    finishTurn(
      selectedSquare,
      `${owner.name} حصلوا على ${selectedSquare.value} نقطة.`,
    );
  }

  function ownerWrong() {
    if (!selectedSquare) {
      return;
    }

    const penalty = selectedSquare.value / 2;
    changeScore(ownerId, -penalty);
    finishTurn(selectedSquare, `${owner.name} خسروا ${penalty} نقطة.`);
  }

  function selectAttacker(teamId: TeamId) {
    setAttackerId(teamId);
    setUseDouble(false);

    if (teamId === ownerId) {
      const nextOwner = teams.find((team) => team.id !== teamId);
      if (nextOwner) {
        setOwnerId(nextOwner.id);
      }
    }
  }

  function selectOwner(teamId: TeamId) {
    if (teamId !== attackerId) {
      setOwnerId(teamId);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500">لوحة الفريق</p>
            <h2 className="text-2xl font-black text-slate-950">
              {owner.name}
            </h2>
          </div>
          <div className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-black text-teal-800">
            {revealed.length} / {mockBoard.length}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {ownerBoard.map((square) => {
            const isRevealed = revealed.includes(square.id);
            const isSelected = selectedId === square.id;
            const label = isRevealed || isSelected ? square.label : "؟";

            return (
              <button
                key={square.id}
                type="button"
                disabled={isRevealed || phase === "owner"}
                onClick={() => setSelectedId(square.id)}
                className={`flex aspect-square flex-col items-center justify-center rounded-3xl p-2 text-center text-xl font-black transition ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 ring-4 ring-amber-200"
                    : isRevealed
                      ? "bg-slate-200 text-slate-500"
                      : "bg-slate-950 text-white hover:bg-slate-800"
                }`}
              >
                <span>{label}</span>
                <span className="mt-1 text-xs font-bold opacity-70">
                  {square.id}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
          <p className="text-sm font-bold text-teal-200">السؤال الحالي</p>
          <h3 className="mt-2 text-xl font-black">{currentQuestion.title}</h3>
          <p className="mt-3 leading-7 text-slate-100">{currentQuestion.text}</p>
          <p className="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-sm">
            الجواب: {currentQuestion.answer}
          </p>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-black text-slate-950">النقاط</h3>
          <div className="mt-3 grid gap-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"
              >
                <span className="font-bold">{team.name}</span>
                <strong>{scores[team.id]}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-black text-slate-950">الدور</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => selectAttacker(team.id)}
                className={`min-h-12 rounded-2xl px-3 text-sm font-black ${
                  attackerId === team.id
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm font-bold text-slate-500">صاحب اللوحة</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                disabled={team.id === attackerId}
                onClick={() => selectOwner(team.id)}
                className={`min-h-12 rounded-2xl px-3 text-sm font-black disabled:opacity-40 ${
                  ownerId === team.id
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">المضاعفة</h3>
              <p className="text-sm text-slate-500">
                متاحة: {doubles[attackerId] ? "نعم" : "لا"}
              </p>
            </div>
            <button
              type="button"
              disabled={!doubles[attackerId] || phase === "owner"}
              onClick={() => setUseDouble((current) => !current)}
              className={`min-h-12 rounded-2xl px-4 text-sm font-black disabled:opacity-40 ${
                useDouble
                  ? "bg-rose-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {useDouble ? "مفعلة" : "استخدم"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="min-h-12 text-base font-bold leading-7 text-slate-700">
            {allDone ? "انتهت اللوحة." : message}
          </p>
          {phase === "attacker" ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={allDone}
                onClick={attackerCorrect}
                className="min-h-14 rounded-2xl bg-teal-600 px-4 text-lg font-black text-white disabled:opacity-40"
              >
                صحيح
              </button>
              <button
                type="button"
                disabled={allDone}
                onClick={attackerWrong}
                className="min-h-14 rounded-2xl bg-rose-600 px-4 text-lg font-black text-white disabled:opacity-40"
              >
                خطأ
              </button>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={ownerCorrect}
                className="min-h-14 rounded-2xl bg-amber-400 px-4 text-lg font-black text-slate-950"
              >
                صاحبها صحيح
              </button>
              <button
                type="button"
                onClick={ownerWrong}
                className="min-h-14 rounded-2xl bg-slate-950 px-4 text-lg font-black text-white"
              >
                صاحبها خطأ
              </button>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
