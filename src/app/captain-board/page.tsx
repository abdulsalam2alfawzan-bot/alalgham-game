"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionLink, PageShell, Panel } from "../_components/game-ui";
import type { BoardSquare, Room, Team } from "@/types/game";
import { getBoard, saveBoard } from "@/lib/game/boardService";
import { boardDistribution } from "@/lib/game/constants";
import { validateBoardDistribution } from "@/lib/game/boardValidation";
import { getRoom } from "@/lib/game/roomService";
import { getTeams } from "@/lib/game/teamService";

type SquareChoice = "" | "100" | "300" | "500" | "700" | "mine";

const choices: Array<{ label: string; value: SquareChoice }> = [
  { label: "فارغ", value: "" },
  { label: "100", value: "100" },
  { label: "300", value: "300" },
  { label: "500", value: "500" },
  { label: "700", value: "700" },
  { label: "لغم", value: "mine" },
];

function choiceToSquare(choice: SquareChoice, roomId: string, teamId: string, index: number): BoardSquare {
  const isMine = choice === "mine";
  return {
    id: `${teamId}-square-${index + 1}`,
    roomId,
    teamId,
    position: index + 1,
    kind: isMine ? "mine" : "points",
    value: isMine ? 0 : Number(choice || 100) as BoardSquare["value"],
    revealed: false,
  };
}

function squareToChoice(square: BoardSquare): SquareChoice {
  return square.kind === "mine" ? "mine" : String(square.value) as SquareChoice;
}

export default function CaptainBoardPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [choicesState, setChoicesState] = useState<SquareChoice[]>(Array(12).fill(""));
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const activeRoom = await getRoom();
      if (!activeRoom) {
        return;
      }
      const roomTeams = await getTeams(activeRoom.id);
      const firstTeamId = roomTeams[0]?.id ?? "";
      setRoom(activeRoom);
      setTeams(roomTeams);
      setTeamId(firstTeamId);
    }

    void load();
  }, []);

  useEffect(() => {
    async function loadBoard() {
      if (!room || !teamId) {
        return;
      }

      const board = await getBoard(room.id, teamId);
      setChoicesState(board.locked ? board.squares.map(squareToChoice) : Array(12).fill(""));
      setLocked(board.locked);
    }

    void loadBoard();
  }, [room, teamId]);

  const boardSquares = useMemo(
    () =>
      room && teamId
        ? choicesState
            .map((choice, index) => ({ choice, index }))
            .filter((item) => item.choice)
            .map((item) => choiceToSquare(item.choice, room.id, teamId, item.index))
        : [],
    [choicesState, room, teamId],
  );
  const validation = validateBoardDistribution(boardSquares);

  function updateChoice(index: number, value: SquareChoice) {
    setChoicesState((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  async function submitBoard() {
    if (!room || !teamId || !validation.valid) {
      setMessage("أكمل التوزيع الصحيح قبل اعتماد اللوحة.");
      return;
    }

    const squares = choicesState.map((choice, index) => choiceToSquare(choice, room.id, teamId, index));
    await saveBoard(room.id, teamId, squares, true);
    setLocked(true);
    setMessage("تم اعتماد اللوحة وقفلها.");
  }

  return (
    <PageShell
      eyebrow="الكابتن"
      title="تجهيز اللوحة"
      description="ضع قيم 12 مربعًا، ثم اعتمد اللوحة بعد اكتمال التوزيع."
    >
      {message ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
          {message}
        </p>
      ) : null}

      <Panel title="الفريق">
        <select
          className="min-h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-lg font-black outline-none focus:border-teal-500"
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </Panel>

      <Panel title="المتبقي">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {boardDistribution.map((item) => {
            const key = item.kind === "mine" ? "mine" : String(item.value);
            return (
              <div key={key} className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-bold text-slate-500">
                  {item.kind === "mine" ? "لغم" : item.value}
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {validation.remaining[key] ?? item.count}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="لوحة سرية">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {choicesState.map((choice, index) => (
            <label key={index} className="grid aspect-square place-items-center rounded-3xl bg-slate-950 p-2 text-white">
              <span className="text-xs font-bold opacity-60">{index + 1}</span>
              <select
                disabled={locked}
                className="w-full bg-transparent text-center text-lg font-black outline-none"
                value={choice}
                onChange={(event) => updateChoice(index, event.target.value as SquareChoice)}
              >
                {choices.map((item) => (
                  <option key={item.value} value={item.value} className="text-slate-950">
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={locked || !validation.valid}
          onClick={submitBoard}
          className="min-h-14 rounded-2xl bg-teal-600 px-5 py-4 text-lg font-black text-white shadow-sm disabled:opacity-40"
        >
          {locked ? "اللوحة معتمدة" : "اعتماد اللوحة"}
        </button>
        <ActionLink href="/play" variant="light">
          بدء اللعب
        </ActionLink>
      </section>
    </PageShell>
  );
}
