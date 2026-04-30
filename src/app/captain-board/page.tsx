"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionLink, PageShell, Panel } from "../_components/game-ui";
import type { BoardSquare, EffectiveRole, Player, Room, Team } from "@/types/game";
import { getSessionPlayerId, readRoomSession } from "@/lib/auth/sessionRole";
import { getBoard, saveBoard } from "@/lib/game/boardService";
import { boardDistribution } from "@/lib/game/constants";
import { validateBoardDistribution } from "@/lib/game/boardValidation";
import {
  canSetupBoard,
  getEffectiveRole,
  unauthorizedMessage,
} from "@/lib/game/permissions";
import { getPlayers } from "@/lib/game/playerService";
import { getRoom } from "@/lib/game/roomService";
import { getTeams } from "@/lib/game/teamService";

type SquareChoice = "" | "100" | "300" | "500" | "700" | "mine";

const tools: Array<{ label: string; value: SquareChoice }> = [
  { label: "100", value: "100" },
  { label: "300", value: "300" },
  { label: "500", value: "500" },
  { label: "700", value: "700" },
  { label: "لغم", value: "mine" },
  { label: "مسح", value: "" },
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [actorId, setActorId] = useState<string>();
  const [choicesState, setChoicesState] = useState<SquareChoice[]>(Array(12).fill(""));
  const [selectedTool, setSelectedTool] = useState<SquareChoice>("100");
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadBoardPage() {
      const session = readRoomSession();
      const activeRoom = await getRoom(session?.roomId);
      if (!activeRoom) {
        setLoaded(true);
        return;
      }

      const roomTeams = await getTeams(activeRoom.id);
      const roomPlayers = await getPlayers(activeRoom.id);
      const currentActorId = getSessionPlayerId(session);
      const ownTeam = roomTeams.find(
        (team) => team.captainId === currentActorId || team.captainPlayerId === currentActorId,
      );

      setActorId(currentActorId);
      setRoom(activeRoom);
      setTeams(roomTeams);
      setPlayers(roomPlayers);

      if (ownTeam) {
        const board = await getBoard(activeRoom.id, ownTeam.id);
        setChoicesState(board.locked ? board.squares.map(squareToChoice) : Array(12).fill(""));
        setLocked(board.locked);
      }

      setLoaded(true);
    }

    const timer = window.setTimeout(() => {
      void loadBoardPage();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const session = readRoomSession();
  const currentPlayer = players.find((player) => player.id === actorId);
  const effectiveRole: EffectiveRole = getEffectiveRole(actorId, room, session, teams, currentPlayer);
  const ownTeam = teams.find(
    (team) => team.captainId === actorId || team.captainPlayerId === actorId,
  );
  const setupOpen = room?.status === "board_setup" || locked;
  const boardSquares = useMemo(
    () =>
      room && ownTeam
        ? choicesState
            .map((choice, index) => ({ choice, index }))
            .filter((item) => item.choice)
            .map((item) => choiceToSquare(item.choice, room.id, ownTeam.id, item.index))
        : [],
    [choicesState, ownTeam, room],
  );
  const validation = validateBoardDistribution(boardSquares);

  function paintSquare(index: number) {
    if (locked) {
      return;
    }

    setChoicesState((current) => current.map((item, itemIndex) => (itemIndex === index ? selectedTool : item)));
  }

  async function submitBoard() {
    if (!canSetupBoard(effectiveRole)) {
      setMessage(unauthorizedMessage);
      return;
    }

    if (!room || !ownTeam || !validation.valid || choicesState.some((choice) => !choice)) {
      setMessage("يجب تعبئة كل المربعات بالتوزيع الصحيح قبل اعتماد اللوحة.");
      return;
    }

    const squares = choicesState.map((choice, index) => choiceToSquare(choice, room.id, ownTeam.id, index));
    await saveBoard(room.id, ownTeam.id, squares, true);
    setLocked(true);
    setMessage("تم اعتماد اللوحة وقفلها.");
  }

  if (!loaded) {
    return (
      <PageShell
        eyebrow="الكابتن"
        title="تجهيز اللوحة"
        description="جاري تحميل صلاحيات الكابتن."
      >
        <Panel>
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            جاري التحميل...
          </p>
        </Panel>
      </PageShell>
    );
  }

  if (effectiveRole !== "captain") {
    return (
      <PageShell
        eyebrow="الكابتن"
        title="تجهيز اللوحة"
        description="تجهيز اللوحة مخصص لكابتن الفريق فقط."
        showOrganizerLink={effectiveRole === "organizer"}
      >
        <Panel title="صلاحية غير متاحة">
          <div className="grid gap-4">
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-800 ring-1 ring-rose-100">
              {effectiveRole === "organizer"
                ? "المشرف لا يجهز لوحة الفريق. يمكنه متابعة جاهزية الفرق من غرفة المشرف."
                : "هذه الصفحة مخصصة لكابتن الفريق فقط"}
            </p>
            <ActionLink href="/waiting-room" variant="light">
              العودة لغرفة الانتظار
            </ActionLink>
          </div>
        </Panel>
      </PageShell>
    );
  }

  if (!setupOpen || !ownTeam) {
    return (
      <PageShell
        eyebrow="الكابتن"
        title="تجهيز اللوحة"
        description="انتظر المشرف حتى يبدأ تجهيز اللوحات."
      >
        <Panel title="أنت كابتن الفريق">
          <div className="grid gap-4">
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
              بانتظار بدء تجهيز اللوحات
            </p>
            <ActionLink href="/waiting-room" variant="light">
              العودة لغرفة الانتظار
            </ActionLink>
          </div>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="الكابتن"
      title="تجهيز اللوحة"
      description="اختر أداة ثم اضغط المربعات لتجهيز لوحة فريقك السرية فقط."
    >
      {message ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
          {message}
        </p>
      ) : null}

      <Panel title="الفريق">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-bold text-slate-500">أنت تجهز لوحة</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{ownTeam.name}</p>
          {locked ? (
            <p className="mt-3 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-900">
              اللوحة معتمدة ومقفلة
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel title="الأدوات">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {tools.map((tool) => (
            <button
              key={tool.label}
              type="button"
              onClick={() => setSelectedTool(tool.value)}
              className={`min-h-12 rounded-2xl px-3 font-black ${
                selectedTool === tool.value
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="المتبقي">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {boardDistribution.map((item) => {
            const key = item.kind === "mine" ? "mine" : String(item.value);
            const label = item.kind === "mine" ? "ألغام متبقية" : `${item.value} متبقي`;
            return (
              <div key={key} className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-bold text-slate-500">{label}</p>
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
            <button
              key={index}
              type="button"
              disabled={locked}
              onClick={() => paintSquare(index)}
              className="grid aspect-square place-items-center rounded-3xl bg-slate-950 p-2 text-white disabled:opacity-70"
            >
              <span className="text-xs font-bold opacity-60">{index + 1}</span>
              <span className="text-xl font-black">{choice === "mine" ? "لغم" : choice || "فارغ"}</span>
            </button>
          ))}
        </div>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={locked || !validation.valid || choicesState.some((choice) => !choice)}
          onClick={submitBoard}
          className="min-h-14 rounded-2xl bg-teal-600 px-5 py-4 text-lg font-black text-white shadow-sm disabled:opacity-40"
        >
          {locked ? "اللوحة معتمدة" : "اعتماد اللوحة"}
        </button>
        <ActionLink href="/waiting-room" variant="light">
          العودة لغرفة الانتظار
        </ActionLink>
      </section>
    </PageShell>
  );
}
