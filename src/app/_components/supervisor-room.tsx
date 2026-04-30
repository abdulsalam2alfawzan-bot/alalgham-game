"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ActionLink, InfoGrid, PageShell, Panel } from "./game-ui";
import type { EffectiveRole, GameEvent, Objection, Player, Question, Room, Team, Turn } from "@/types/game";
import {
  isOwnerCodeExpired,
  isRoomExpired,
} from "@/lib/auth/roomAccess";
import {
  isValidOwnerSession,
  readRoomSession,
} from "@/lib/auth/sessionRole";
import {
  canAdjustScore,
  canAssignCaptain,
  canEndGame,
  canJudgeAnswer,
  canKickPlayer,
  canManageTeams,
  getEffectiveRole,
  unauthorizedMessage,
} from "@/lib/auth/roles";
import { addGameEvent, getRoomEvents } from "@/lib/game/eventService";
import { getObjections, resolveObjection } from "@/lib/game/objectionService";
import { saveBoard } from "@/lib/game/boardService";
import { getPlayers, assignPlayerToTeam, kickPlayer } from "@/lib/game/playerService";
import { getQuestions } from "@/lib/game/questionService";
import { futureTeamDefinitions, getDefaultTeamName } from "@/lib/game/constants";
import {
  endGame,
  lockJoin,
  lockRoom,
  pauseGame,
  restartGame,
  resumeGame,
  setRoomLifecycleStatus,
  startBoardSetup,
  startGame,
  startTeamAssignment,
  unlockJoin,
  unlockRoom,
  updateRoomLifecyclePatch,
} from "@/lib/game/gameStateService";
import { buildJoinUrl, getRoom } from "@/lib/game/roomService";
import { useRoomState } from "@/lib/game/roomState";
import { calculateScoreChange } from "@/lib/game/scoring";
import { adjustTeamScore, getTeams, removeCaptain, saveTeam, setCaptain } from "@/lib/game/teamService";
import { getCurrentTurn, saveTurn } from "@/lib/game/turnService";
import { getNextTeamTurn } from "@/lib/game/turnOrder";
import { buildOwnerQrUrl } from "@/lib/qr/roomQrLinks";
import {
  clampNumber,
  sanitizeReason,
  sanitizeTeamName,
} from "@/lib/security/inputSafety";

function formatTimeRemaining(value: number | string | undefined) {
  if (!value) {
    return "منتهي";
  }

  const expiresAt = typeof value === "string" ? Date.parse(value) : value;
  const remaining = expiresAt - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return "منتهي";
  }

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours} س ${minutes} د`;
}

function roleLabel(player: Player) {
  return player.role === "captain" || player.isCaptain ? "كابتن" : "لاعب";
}

type SupervisorTab =
  | "room"
  | "codes"
  | "players"
  | "teams"
  | "state"
  | "play"
  | "scores"
  | "events"
  | "danger";

const supervisorTabs: Array<{ id: SupervisorTab; label: string }> = [
  { id: "room", label: "الغرفة" },
  { id: "codes", label: "الأكواد" },
  { id: "players", label: "اللاعبين" },
  { id: "teams", label: "الفرق" },
  { id: "state", label: "حالة اللعبة" },
  { id: "play", label: "لوحة اللعب" },
  { id: "scores", label: "النقاط" },
  { id: "events", label: "الأحداث" },
  { id: "danger", label: "الخطر" },
];

export function SupervisorRoom() {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [objections, setObjections] = useState<Objection[]>([]);
  const [turn, setTurn] = useState<Turn | undefined>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [pointsDelta, setPointsDelta] = useState(100);
  const [scoreReason, setScoreReason] = useState("");
  const [message, setMessage] = useState("");
  const [showMoreEvents, setShowMoreEvents] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [requestedRoomId, setRequestedRoomId] = useState<string>();
  const [pendingAction, setPendingAction] = useState("");
  const [activeTab, setActiveTab] = useState<SupervisorTab>("room");

  async function loadSupervisorRoom() {
    const session = readRoomSession();
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("room") ?? session?.roomId;
    setRequestedRoomId(roomId ?? undefined);
    const activeRoom = await getRoom(roomId ?? undefined);
    if (!activeRoom) {
      setLoaded(true);
      return;
    }

    const displayRoom: Room = isRoomExpired(activeRoom)
      ? { ...activeRoom, status: "expired" }
      : activeRoom;
    const roomTeams = await getTeams(displayRoom.id);
    setRoom(displayRoom);
    setTeams(roomTeams);
    setPlayers(await getPlayers(displayRoom.id));
    setEvents(await getRoomEvents(displayRoom.id));
    setObjections(await getObjections(displayRoom.id));
    setTurn(await getCurrentTurn(displayRoom.id));
    setQuestions(await getQuestions());
    setSelectedTeamId((current) => current || roomTeams[0]?.id || "");
    setLoaded(true);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSupervisorRoom();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const session = readRoomSession();
  const liveState = useRoomState(requestedRoomId);
  const effectiveRole: EffectiveRole = getEffectiveRole(undefined, room, session, teams);
  const sessionValid = isValidOwnerSession(room, session);
  const ownerLink = room ? buildOwnerQrUrl(room.ownerCode) : "";
  const joinLink = room ? buildJoinUrl(room.playerCode) : "";
  const activePlayers = players.filter((player) => player.status !== "kicked");
  const currentQuestion = questions[0];
  const activeTeam = teams.find((team) => team.id === selectedTeamId);
  const visibleEvents = showMoreEvents ? events : events.slice(0, 10);
  const canEditTeamNames = room ? !["playing", "paused", "finished", "locked", "expired"].includes(room.status) : false;
  const readyTeamsCount = teams.filter((team) => team.boardLocked).length;
  const turnBoard = liveState.boards.find((board) => board.teamId === turn?.ownerTeamId);
  const turnSquare = turnBoard?.squares.find((square) => square.id === turn?.selectedSquareId);

  useEffect(() => {
    if (liveState.loading || !liveState.room) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRoom(liveState.room);
      setTeams(liveState.teams);
      setPlayers(liveState.players);
      setEvents(liveState.events);
      setTurn(liveState.currentTurn);
      setQuestions(liveState.questions);
      setSelectedTeamId((current) => current || liveState.teams[0]?.id || "");
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    liveState.loading,
    liveState.room,
    liveState.teams,
    liveState.players,
    liveState.events,
    liveState.currentTurn,
    liveState.questions,
  ]);

  const roomAccessMessage = useMemo(() => {
    if (!room) {
      return "هذه الصفحة مخصصة للمشرف فقط";
    }

    if (isRoomExpired(room)) {
      return "انتهت صلاحية الغرفة";
    }

    if (isOwnerCodeExpired(room)) {
      return "انتهت صلاحية كود مالك الغرفة";
    }

    return "هذه الصفحة مخصصة للمشرف فقط";
  }, [room]);

  function guard(allowed: boolean) {
    if (!allowed) {
      setMessage(unauthorizedMessage);
      return false;
    }

    if (room && isRoomExpired(room)) {
      setMessage("انتهت صلاحية الغرفة");
      return false;
    }

    return true;
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`تم نسخ ${label}`);
    } catch {
      setMessage(`انسخ ${label} يدويًا`);
    }
  }

  async function runStateAction(label: string, action: () => Promise<unknown>) {
    if (!room || !guard(canManageTeams(effectiveRole))) {
      return;
    }

    setPendingAction(label);
    setMessage("جاري التحديث...");
    try {
      await action();
      setMessage("تم الحفظ");
      await loadSupervisorRoom();
    } catch (error) {
      console.warn("Supervisor state action failed", error);
      setMessage("فشل التحديث، حاول مرة أخرى");
    } finally {
      setPendingAction("");
    }
  }

  async function updateTeamName(team: Team, name: string) {
    if (!guard(canManageTeams(effectiveRole))) {
      return;
    }

    if (!canEditTeamNames) {
      setMessage("يمكن تعديل أسماء الفرق قبل بدء اللعبة فقط");
      return;
    }

    await saveTeam({ ...team, name: sanitizeTeamName(name) || getDefaultTeamName(team.id, team.order) });
    await loadSupervisorRoom();
  }

  async function movePlayer(playerId: string, teamId: string) {
    if (!room || !guard(canManageTeams(effectiveRole))) {
      return;
    }

    await assignPlayerToTeam(room.id, playerId, teamId);
    await loadSupervisorRoom();
  }

  async function chooseCaptain(teamId: string, playerId: string) {
    if (!room || !guard(canAssignCaptain(effectiveRole))) {
      return;
    }

    await setCaptain(room.id, teamId, playerId);
    await loadSupervisorRoom();
  }

  async function clearCaptain(teamId: string) {
    if (!room || !guard(canAssignCaptain(effectiveRole))) {
      return;
    }

    await removeCaptain(room.id, teamId);
    await loadSupervisorRoom();
  }

  async function removePlayer(playerId: string) {
    if (!room || !guard(canKickPlayer(effectiveRole))) {
      return;
    }

    await kickPlayer(room.id, playerId);
    await loadSupervisorRoom();
  }

  async function logJudgeAction(action: string) {
    if (!room || !guard(canJudgeAnswer(effectiveRole))) {
      return;
    }

    if (turn && turnSquare) {
      const attacker = teams.find((team) => team.id === turn.attackerTeamId);
      const owner = teams.find((team) => team.id === turn.ownerTeamId);
      const ownerDecision = action === "صاحب اللوحة صح" ? true : action === "صاحب اللوحة خطأ" ? false : undefined;
      const attackerDecision = action === "المهاجم صح" || action === "صح"
        ? true
        : action === "المهاجم خطأ" || action === "خطأ"
          ? false
          : undefined;

      if (attacker && attackerDecision !== undefined) {
        const resolution = calculateScoreChange({
          square: turnSquare,
          useDouble: turn.useDouble,
          attackerCorrect: attackerDecision,
        });

        if (resolution.finalState === "transfer_to_owner") {
          await saveTurn({ ...turn, phase: "owner_answer" });
          await addGameEvent(room.id, "turn_resolved", "انتقلت الإجابة إلى صاحب اللوحة");
          setMessage("انتقلت الإجابة إلى صاحب اللوحة");
          await loadSupervisorRoom();
          return;
        }

        if (resolution.attackerChange) {
          await adjustTeamScore(room.id, attacker.id, resolution.attackerChange);
        }

        await revealSquareAndAdvanceTurn(resolution.message);
        return;
      }

      if (owner && ownerDecision !== undefined) {
        const resolution = calculateScoreChange({
          square: turnSquare,
          useDouble: false,
          attackerCorrect: false,
          ownerCorrect: ownerDecision,
        });

        if (resolution.ownerChange) {
          await adjustTeamScore(room.id, owner.id, resolution.ownerChange);
        }

        await revealSquareAndAdvanceTurn(resolution.message);
        return;
      }
    }

    await addGameEvent(room.id, "turn_resolved", `إجراء المشرف: ${action}`);
    setMessage(`تم تسجيل إجراء: ${action}`);
    await loadSupervisorRoom();
  }

  async function revealSquareAndAdvanceTurn(messageText: string) {
    if (!room || !turn || !turnBoard || !turnSquare) {
      return;
    }

    await saveBoard(
      room.id,
      turnBoard.teamId,
      turnBoard.squares.map((square) =>
        square.id === turnSquare.id ? { ...square, revealed: true } : square,
      ),
      turnBoard.locked,
    );

    const nextTeam = getNextTeamTurn(teams, turn.attackerTeamId);
    await saveTurn({ ...turn, phase: "resolved" });
    if (nextTeam) {
      const nextTeamName = teams.find((team) => team.id === nextTeam.id)?.name ?? nextTeam.id;
      await updateRoomLifecyclePatch(
        room.id,
        { status: "playing", currentTurnTeamId: nextTeam.id },
        `بدأ دور ${nextTeamName}`,
      );
    }
    await addGameEvent(room.id, "turn_resolved", messageText);
    setMessage("تم احتساب الجولة");
    await loadSupervisorRoom();
  }

  async function changeScore(amountSign: 1 | -1) {
    if (!room || !selectedTeamId || !guard(canAdjustScore(effectiveRole))) {
      return;
    }

    const amount = clampNumber(pointsDelta, 1, 5000, 100) * amountSign;
    const reason = sanitizeReason(scoreReason);
    if (!reason) {
      setMessage("يرجى إدخال سبب تعديل النقاط");
      return;
    }

    await adjustTeamScore(room.id, selectedTeamId, amount);
    await addGameEvent(room.id, "score_adjusted", `تعديل نقاط ${activeTeam?.name ?? ""}: ${amount} - ${reason}`);
    setScoreReason("");
    await loadSupervisorRoom();
  }

  async function handleResolveObjection(objectionId: string, status: "accepted" | "rejected") {
    if (!room || !guard(canJudgeAnswer(effectiveRole))) {
      return;
    }

    await resolveObjection(room.id, objectionId, status);
    await loadSupervisorRoom();
  }

  async function finishGame() {
    if (!room || !guard(canEndGame(effectiveRole))) {
      return;
    }

    const confirmed = window.confirm(
      "إنهاء اللعبة؟\nسيتم إيقاف اللعب وحفظ النتائج النهائية. لن يستطيع اللاعبون تعديل الإجابات أو اللوحات بعد الإنهاء.",
    );
    if (!confirmed) {
      return;
    }

    await runStateAction("finish", async () => {
      await endGame(room.id);
      router.push(`/results?room=${room.id}`);
    });
  }

  if (!loaded) {
    return (
      <PageShell
        eyebrow="المشرف"
        title="غرفة المشرف"
        description="جاري تحميل صلاحيات الغرفة."
      >
        <Panel>
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            جاري التحميل...
          </p>
        </Panel>
      </PageShell>
    );
  }

  if (!sessionValid) {
    return (
      <PageShell
        eyebrow="المشرف"
        title="غرفة المشرف"
        description="هذه الصفحة مخصصة للمشرف فقط."
      >
        <Panel title="صلاحية غير متاحة">
          <div className="grid gap-4">
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-800 ring-1 ring-rose-100">
              {roomAccessMessage}
            </p>
            <ActionLink href="/owner" variant="secondary">
              دخول بكود مالك الغرفة
            </ActionLink>
          </div>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="المشرف"
      title="غرفة المشرف"
      description="إدارة الغرفة، الفرق، الأسئلة، والنقاط"
      showOrganizerLink
    >
      {message ? (
        <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold leading-6 text-teal-900 ring-1 ring-teal-100">
          {message}
        </p>
      ) : null}

      <nav className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9" aria-label="أقسام غرفة المشرف">
        {supervisorTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-11 rounded-2xl px-2 text-sm font-black transition ${
              activeTab === tab.id
                ? "bg-slate-950 text-white"
                : tab.id === "danger"
                  ? "bg-rose-50 text-rose-800 ring-1 ring-rose-100"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={activeTab === "room" ? "grid gap-5" : "hidden"}>
      <Panel title="بيانات الغرفة">
        <InfoGrid
          items={[
            { label: "الغرفة", value: room?.name ?? "..." },
            { label: "الحالة", value: room?.status ?? "..." },
            { label: "انتهاء الغرفة", value: formatTimeRemaining(room?.expiresAt) },
            { label: "انتهاء كود المالك", value: formatTimeRemaining(room?.ownerCodeExpiresAt) },
            { label: "انتهاء كود اللاعبين", value: formatTimeRemaining(room?.playerCodeExpiresAt) },
            { label: "عدد اللاعبين", value: `${activePlayers.length}` },
            { label: "عدد الفرق", value: `${teams.length}` },
          ]}
        />
      </Panel>
      </div>

      <div className={activeTab === "codes" ? "grid gap-5" : "hidden"}>
      <Panel title="أكواد و QR الغرفة">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="grid gap-3 rounded-3xl border-2 border-amber-300 bg-amber-50 p-4">
            <div>
              <h3 className="text-lg font-black text-amber-950">مالك الغرفة</h3>
              <p className="text-sm font-bold text-amber-900">QR مالك الغرفة</p>
            </div>
            <p className="rounded-2xl bg-white px-4 py-4 text-center text-2xl font-black tracking-[0.18em] text-slate-950">
              {room?.ownerCode}
            </p>
            {ownerLink ? (
              <div className="grid justify-items-center gap-2 rounded-3xl bg-white p-3 ring-1 ring-amber-100">
                <QRCodeSVG value={ownerLink} size={168} marginSize={2} className="rounded-2xl bg-white p-2" />
                <p className="text-xs font-black text-amber-900">QR مالك الغرفة</p>
              </div>
            ) : null}
            <input readOnly value={ownerLink} className="min-h-12 rounded-2xl border border-amber-200 bg-white px-3 text-sm font-bold text-amber-950 outline-none" />
            <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-bold leading-6 text-amber-950">
              هذا الكود خاص بالمشرف فقط. لا ترسله للاعبين.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => room && copyText(room.ownerCode, "كود مالك الغرفة")} className="min-h-12 rounded-2xl bg-slate-950 px-4 font-black text-white">
                نسخ كود مالك الغرفة
              </button>
              <button type="button" onClick={() => copyText(ownerLink, "رابط مالك الغرفة")} className="min-h-12 rounded-2xl border border-amber-200 bg-white px-4 font-black text-amber-950">
                نسخ رابط مالك الغرفة
              </button>
            </div>
            <ActionLink href={`/print/owner-card?room=${room?.id ?? ""}`} variant="light" className="text-base">
              طباعة بطاقة مالك الغرفة
            </ActionLink>
          </article>

          <article className="grid gap-3 rounded-3xl border border-teal-100 bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div>
              <h3 className="text-lg font-black text-slate-950">اللاعبون</h3>
              <p className="text-sm font-bold text-teal-700">QR اللاعبين</p>
            </div>
            <p className="rounded-2xl bg-slate-50 px-4 py-4 text-center text-2xl font-black tracking-[0.18em] text-slate-950">
              {room?.playerCode}
            </p>
            {joinLink ? (
              <div className="grid justify-items-center gap-2 rounded-3xl bg-teal-50 p-3 ring-1 ring-teal-100">
                <QRCodeSVG value={joinLink} size={168} marginSize={2} className="rounded-2xl bg-white p-2" />
                <p className="text-xs font-black text-teal-800">QR اللاعبين</p>
              </div>
            ) : null}
            <input readOnly value={joinLink} className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none" />
            <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold leading-6 text-teal-900">
              أرسل هذا الكود أو QR للاعبين للانضمام.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => room && copyText(room.playerCode, "كود اللاعبين")} className="min-h-12 rounded-2xl bg-teal-600 px-4 font-black text-white">
                نسخ كود اللاعبين
              </button>
              <button type="button" onClick={() => copyText(joinLink, "رابط اللاعبين")} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-black text-slate-700">
                نسخ رابط اللاعبين
              </button>
            </div>
            <ActionLink href={`/print/player-card?room=${room?.id ?? ""}`} variant="secondary" className="text-base">
              طباعة بطاقة اللاعبين
            </ActionLink>
          </article>
        </div>
        <div className="mt-4">
          <ActionLink href={`/print/room-cards?room=${room?.id ?? ""}`} variant="light" className="text-base">
            طباعة البطاقتين معًا
          </ActionLink>
        </div>
      </Panel>
      </div>

      <div className={activeTab === "teams" ? "grid gap-5" : "hidden"}>
      <Panel title="إعداد الفرق">
        <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-bold leading-6 text-slate-600">
            يمكن تعديل اسمي الفريقين قبل بدء اللعبة. الفريق الثالث والرابع غير متاحين في هذا الـ MVP.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {teams.map((team, index) => (
              <label key={team.id} className="grid gap-2">
                <span className="font-bold text-slate-700">
                  {index === 0 ? "اسم الفريق الأول" : "اسم الفريق الثاني"}
                </span>
                <input
                  className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-lg font-black outline-none focus:border-teal-500 disabled:bg-slate-100 disabled:text-slate-400"
                  value={team.name}
                  maxLength={25}
                  disabled={!canEditTeamNames}
                  onChange={(event) => {
                    const nextName = sanitizeTeamName(event.target.value);
                    setTeams((current) =>
                      current.map((item) =>
                        item.roomId === team.roomId && item.id === team.id ? { ...item, name: nextName } : item,
                      ),
                    );
                  }}
                  onBlur={(event) => updateTeamName(team, event.target.value)}
                  placeholder={getDefaultTeamName(team.id, team.order)}
                />
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {futureTeamDefinitions.map((team) => (
              <div key={team.id} className="rounded-3xl border border-slate-200 bg-slate-100 p-4 text-slate-400">
                <p className="text-lg font-black">{team.name}</p>
                <p className="mt-1 text-sm font-bold">غير متاح للتفعيل الآن</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>
      </div>

      <div className={activeTab === "players" ? "grid gap-5" : "hidden"}>
      <Panel title="اللاعبون">
        <div className="grid gap-3">
          {activePlayers.map((player) => {
            const playerTeam = teams.find((team) => team.id === player.teamId);
            const isCaptain = player.role === "captain" || teams.some((team) => team.captainId === player.id || team.captainPlayerId === player.id);
            return (
              <article key={player.id} className="grid gap-2 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black text-slate-950">{player.name}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${isCaptain ? "bg-teal-100 text-teal-900" : "bg-slate-100 text-slate-700"}`}>
                    {roleLabel(player)}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-500">
                  {player.status} · {playerTeam?.name ?? "بدون فريق"}
                </p>
              </article>
            );
          })}
          {!activePlayers.length ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
              لم ينضم أي لاعب بعد.
            </p>
          ) : null}
        </div>
      </Panel>
      </div>

      <div className={activeTab === "teams" ? "grid gap-5" : "hidden"}>
      <Panel title="الفرق">
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((team) => {
            const captainId = team.captainId ?? team.captainPlayerId;
            const captain = players.find((player) => player.id === captainId);
            const members = activePlayers.filter((player) => player.teamId === team.id);
            return (
              <article key={team.id} className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`h-5 w-5 rounded-full ${team.color}`} />
                    <div>
                      <h3 className="text-xl font-black text-slate-950">{team.name}</h3>
                      <p className="text-sm font-bold text-slate-500">اللون: {team.id === "blue-team" ? "أزرق" : "أحمر"}</p>
                    </div>
                  </div>
                  <strong className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                    {members.length} لاعب
                  </strong>
                </div>
                <p className="text-sm font-bold text-slate-500">الكابتن: {captain?.name ?? "لم يحدد"}</p>
                <div className="grid gap-2">
                  {members.length ? (
                    members.map((member) => {
                      const memberIsCaptain = member.role === "captain" || team.captainId === member.id || team.captainPlayerId === member.id;
                      return (
                        <div key={member.id} className="grid gap-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-black text-slate-950">{member.name}</p>
                              <p className="text-xs font-bold text-slate-500">{member.status}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${memberIsCaptain ? "bg-teal-100 text-teal-900" : "bg-white text-slate-700"}`}>
                              {memberIsCaptain ? "كابتن" : "لاعب"}
                            </span>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <select
                              value={member.teamId ?? ""}
                              onChange={(event) => movePlayer(member.id, event.target.value)}
                              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold"
                              aria-label={`نقل ${member.name}`}
                            >
                              {teams.map((targetTeam) => (
                                <option key={targetTeam.id} value={targetTeam.id}>
                                  نقل إلى {targetTeam.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!member.teamId}
                              onClick={() => member.teamId && chooseCaptain(member.teamId, member.id)}
                              className="min-h-11 rounded-2xl bg-amber-400 px-3 text-sm font-black text-slate-950 disabled:opacity-40"
                            >
                              تعيين كابتن
                            </button>
                            <button
                              type="button"
                              onClick={() => removePlayer(member.id)}
                              className="min-h-11 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-black text-rose-700"
                            >
                              طرد
                            </button>
                          </div>
                          {memberIsCaptain ? (
                            <button
                              type="button"
                              onClick={() => clearCaptain(team.id)}
                              className="min-h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
                            >
                              إزالة الكابتن
                            </button>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold leading-7 text-slate-600">
                      لا يوجد أعضاء بعد
                    </p>
                  )}
                </div>
                <p className={`rounded-2xl px-3 py-2 text-sm font-bold ${team.boardLocked ? "bg-teal-50 text-teal-900" : "bg-slate-50 text-slate-600"}`}>
                  اللوحة: {team.boardLocked ? "جاهزة" : "غير جاهزة"}
                </p>
              </article>
            );
          })}
          {futureTeamDefinitions.map((team) => (
            <article key={team.id} className="grid gap-2 rounded-3xl border border-slate-200 bg-slate-100 p-4 text-slate-400">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-black">{team.name}</p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">قريبًا</span>
              </div>
              <p className="text-sm font-bold">غير متاح في نسخة الـ MVP الحالية</p>
            </article>
          ))}
        </div>
      </Panel>
      </div>

      <div className={activeTab === "state" ? "grid gap-5" : "hidden"}>
      <Panel title="حالة اللعبة">
        <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <InfoGrid
            items={[
              { label: "الحالة الحالية", value: room?.status ?? "..." },
              { label: "آخر تحديث", value: room?.updatedAt ? new Date(room.updatedAt).toLocaleString("ar-SA") : "..." },
              { label: "عدد اللاعبين", value: `${activePlayers.length}` },
              { label: "الفرق الجاهزة", value: `${readyTeamsCount}/${teams.length}` },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {room?.status === "waiting" ? (
              <>
                <button type="button" disabled={pendingAction === "team_assignment"} onClick={() => runStateAction("team_assignment", () => startTeamAssignment(room.id))} className="min-h-14 rounded-2xl bg-teal-600 px-4 font-black text-white disabled:opacity-50">بدء توزيع الفرق</button>
                <button type="button" disabled={pendingAction === "lock_join"} onClick={() => runStateAction("lock_join", () => lockJoin(room.id))} className="min-h-14 rounded-2xl bg-amber-400 px-4 font-black text-slate-950 disabled:opacity-50">قفل دخول اللاعبين</button>
              </>
            ) : null}
            {room?.status === "team_assignment" ? (
              <>
                <button type="button" disabled={pendingAction === "board_setup"} onClick={() => runStateAction("board_setup", () => startBoardSetup(room.id))} className="min-h-14 rounded-2xl bg-teal-600 px-4 font-black text-white disabled:opacity-50">بدء تجهيز اللوحات</button>
                <button type="button" disabled={pendingAction === "lock_join"} onClick={() => runStateAction("lock_join", () => lockJoin(room.id))} className="min-h-14 rounded-2xl bg-amber-400 px-4 font-black text-slate-950 disabled:opacity-50">قفل دخول اللاعبين</button>
                <button type="button" disabled={pendingAction === "waiting"} onClick={() => runStateAction("waiting", () => setRoomLifecycleStatus(room.id, "waiting", "تمت إعادة الغرفة للانتظار"))} className="min-h-14 rounded-2xl border border-slate-200 bg-white px-4 font-black text-slate-700 disabled:opacity-50">إعادة للانتظار</button>
              </>
            ) : null}
            {room?.status === "board_setup" ? (
              <>
                <button type="button" disabled={pendingAction === "start_game"} onClick={() => runStateAction("start_game", () => startGame(room.id))} className="min-h-14 rounded-2xl bg-teal-600 px-4 font-black text-white disabled:opacity-50">بدء اللعبة</button>
                <button type="button" disabled={pendingAction === "team_assignment"} onClick={() => runStateAction("team_assignment", () => startTeamAssignment(room.id))} className="min-h-14 rounded-2xl border border-slate-200 bg-white px-4 font-black text-slate-700 disabled:opacity-50">إعادة توزيع الفرق</button>
                <button type="button" disabled={pendingAction === "lock_room"} onClick={() => runStateAction("lock_room", () => lockRoom(room.id))} className="min-h-14 rounded-2xl bg-rose-600 px-4 font-black text-white disabled:opacity-50">قفل الغرفة</button>
              </>
            ) : null}
            {room?.status === "playing" ? (
              <>
                <button type="button" disabled={pendingAction === "pause"} onClick={() => runStateAction("pause", () => pauseGame(room.id))} className="min-h-14 rounded-2xl bg-amber-400 px-4 font-black text-slate-950 disabled:opacity-50">إيقاف مؤقت</button>
                <button type="button" onClick={finishGame} className="min-h-14 rounded-2xl bg-rose-600 px-4 font-black text-white">إنهاء اللعبة</button>
                <button type="button" disabled={pendingAction === "lock_room"} onClick={() => runStateAction("lock_room", () => lockRoom(room.id))} className="min-h-14 rounded-2xl border border-rose-200 bg-rose-50 px-4 font-black text-rose-700 disabled:opacity-50">قفل الغرفة</button>
              </>
            ) : null}
            {room?.status === "paused" ? (
              <>
                <button type="button" disabled={pendingAction === "resume"} onClick={() => runStateAction("resume", () => resumeGame(room.id))} className="min-h-14 rounded-2xl bg-teal-600 px-4 font-black text-white disabled:opacity-50">استئناف اللعبة</button>
                <button type="button" onClick={finishGame} className="min-h-14 rounded-2xl bg-rose-600 px-4 font-black text-white">إنهاء اللعبة</button>
                <button type="button" disabled={pendingAction === "restart"} onClick={() => runStateAction("restart", () => restartGame(room.id))} className="min-h-14 rounded-2xl border border-slate-200 bg-white px-4 font-black text-slate-700 disabled:opacity-50">إعادة ضبط الجولة</button>
              </>
            ) : null}
            {room?.status === "finished" ? (
              <>
                <ActionLink href={`/results?room=${room.id}`} variant="secondary">عرض النتائج</ActionLink>
                <button type="button" disabled={pendingAction === "restart"} onClick={() => window.confirm("إعادة تشغيل اللعبة؟\nسيتم تصفير النقاط واللوحات والجولات، مع الاحتفاظ بالغرفة واللاعبين والأكواد.") && runStateAction("restart", () => restartGame(room.id))} className="min-h-14 rounded-2xl bg-amber-400 px-4 font-black text-slate-950 disabled:opacity-50">إعادة تشغيل اللعبة</button>
                <button type="button" disabled={pendingAction === "lock_room"} onClick={() => window.confirm("قفل الغرفة نهائيًا؟") && runStateAction("lock_room", () => lockRoom(room.id))} className="min-h-14 rounded-2xl bg-rose-600 px-4 font-black text-white disabled:opacity-50">قفل الغرفة نهائيًا</button>
              </>
            ) : null}
            {room?.status === "locked" ? (
              <>
                <button type="button" disabled={pendingAction === "unlock_room"} onClick={() => runStateAction("unlock_room", () => unlockRoom(room.id))} className="min-h-14 rounded-2xl bg-teal-600 px-4 font-black text-white disabled:opacity-50">فتح الغرفة</button>
                <ActionLink href={`/results?room=${room.id}`} variant="light">عرض الحالة</ActionLink>
                <button type="button" onClick={finishGame} className="min-h-14 rounded-2xl bg-rose-600 px-4 font-black text-white">إنهاء اللعبة</button>
              </>
            ) : null}
          </div>
          {room?.isJoinLocked ? (
            <button type="button" disabled={pendingAction === "unlock_join"} onClick={() => room && runStateAction("unlock_join", () => unlockJoin(room.id))} className="min-h-14 rounded-2xl border border-teal-200 bg-teal-50 px-4 font-black text-teal-900 disabled:opacity-50">
              فتح دخول اللاعبين
            </button>
          ) : null}
        </div>
      </Panel>
      </div>

      <div className={activeTab === "play" ? "grid gap-5" : "hidden"}>
      {room?.status === "playing" || room?.status === "paused" ? (
        <Panel title="لوحة الحكم">
          <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <InfoGrid
              items={[
                { label: "الفريق المهاجم", value: turn?.attackerTeamId ?? "..." },
                { label: "الفريق الهدف", value: turn?.ownerTeamId ?? "..." },
                { label: "المربع", value: turn?.selectedSquareId ?? "..." },
                { label: "الحالة", value: turn?.phase ?? "..." },
              ]}
            />
            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <p className="text-sm font-bold text-teal-200">{currentQuestion?.category ?? "السؤال الحالي"}</p>
              <h3 className="mt-2 text-xl font-black">{currentQuestion?.questionText ?? "لا يوجد سؤال محدد"}</h3>
              <p className="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-sm">الإجابة المرسلة: {turn?.submittedAnswer ?? "لم ترسل بعد"}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => logJudgeAction("المهاجم صح")} className="min-h-14 rounded-2xl bg-teal-600 px-4 text-lg font-black text-white">المهاجم صح</button>
              <button type="button" onClick={() => logJudgeAction("المهاجم خطأ")} className="min-h-14 rounded-2xl bg-rose-600 px-4 text-lg font-black text-white">المهاجم خطأ</button>
              <button type="button" onClick={() => logJudgeAction("صاحب اللوحة صح")} className="min-h-14 rounded-2xl bg-teal-50 px-4 text-lg font-black text-teal-900 ring-1 ring-teal-100">صاحب اللوحة صح</button>
              <button type="button" onClick={() => logJudgeAction("صاحب اللوحة خطأ")} className="min-h-14 rounded-2xl bg-rose-50 px-4 text-lg font-black text-rose-800 ring-1 ring-rose-100">صاحب اللوحة خطأ</button>
              <button type="button" onClick={() => logJudgeAction("تغيير السؤال")} className="min-h-14 rounded-2xl border border-slate-200 bg-white px-4 font-black text-slate-700">تغيير السؤال</button>
              <button type="button" onClick={() => logJudgeAction("إلغاء السؤال")} className="min-h-14 rounded-2xl border border-slate-200 bg-white px-4 font-black text-slate-700">إلغاء السؤال</button>
            </div>
            <details className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
              <summary className="cursor-pointer font-black text-rose-800">خيارات متقدمة</summary>
              <button type="button" onClick={() => logJudgeAction("حذف السؤال")} className="mt-3 min-h-12 w-full rounded-2xl bg-rose-600 px-4 font-black text-white">حذف السؤال</button>
            </details>
          </div>
        </Panel>
      ) : null}
      </div>

      <div className={activeTab === "scores" ? "grid gap-5" : "hidden"}>
      <Panel title="إدارة النقاط">
        <div className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:grid-cols-[1fr_8rem_1fr_8rem_8rem]">
          <select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-bold">
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <input type="number" min="1" max="5000" value={pointsDelta} onChange={(event) => setPointsDelta(clampNumber(event.target.value, 1, 5000, 100))} className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center font-black" />
          <input value={scoreReason} maxLength={120} onChange={(event) => setScoreReason(sanitizeReason(event.target.value))} placeholder="سبب التعديل" className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-bold outline-none" />
          <button type="button" onClick={() => changeScore(1)} className="min-h-12 rounded-2xl bg-teal-600 px-3 font-black text-white">إضافة نقاط</button>
          <button type="button" onClick={() => changeScore(-1)} className="min-h-12 rounded-2xl bg-rose-600 px-3 font-black text-white">خصم نقاط</button>
        </div>
      </Panel>

      <Panel title="الاعتراضات">
        <div className="grid gap-3">
          {objections.map((objection) => (
            <article key={objection.id} className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-[1fr_9rem_9rem] sm:items-center">
              <div>
                <p className="font-bold leading-7 text-slate-700">{objection.text}</p>
                <p className="text-sm font-bold text-slate-500">{objection.teamId ?? "فريق"} · {objection.status}</p>
              </div>
              <button type="button" onClick={() => handleResolveObjection(objection.id, "accepted")} className="min-h-12 rounded-2xl bg-teal-600 px-3 font-black text-white">قبول اعتراض</button>
              <button type="button" onClick={() => handleResolveObjection(objection.id, "rejected")} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 font-black text-slate-700">رفض اعتراض</button>
            </article>
          ))}
          {!objections.length ? <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">لا توجد اعتراضات حالية.</p> : null}
        </div>
      </Panel>
      </div>

      <div className={activeTab === "events" ? "grid gap-5" : "hidden"}>
      <Panel title="سجل الأحداث">
        <ol className="grid gap-3">
          {visibleEvents.map((event, index) => (
            <li key={event.id} className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 font-black">{index + 1}</span>
              <span className="font-bold text-slate-700">{event.message}</span>
            </li>
          ))}
        </ol>
        {events.length > 10 ? (
          <button type="button" onClick={() => setShowMoreEvents((current) => !current)} className="mt-4 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-black text-slate-700">
            {showMoreEvents ? "عرض أقل" : "عرض المزيد"}
          </button>
        ) : null}
      </Panel>
      </div>

      <div className={activeTab === "danger" ? "grid gap-5" : "hidden"}>
      <Panel title="منطقة الخطر">
        <div className="grid gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-bold leading-6 text-rose-800">
            هذه الإجراءات قد تؤثر على سير اللعبة. استخدمها بحذر.
          </p>
          <button type="button" onClick={finishGame} className="min-h-14 rounded-2xl bg-rose-600 px-4 text-lg font-black text-white">
            إنهاء اللعبة
          </button>
          <button
            type="button"
            disabled={!room || pendingAction === "restart"}
            onClick={() =>
              room &&
              window.confirm("إعادة تشغيل اللعبة؟\nسيتم تصفير النقاط واللوحات والجولات، مع الاحتفاظ بالغرفة واللاعبين والأكواد.") &&
              runStateAction("restart", () => restartGame(room.id))
            }
            className="min-h-14 rounded-2xl border border-rose-200 bg-white px-4 text-lg font-black text-rose-700 disabled:opacity-50"
          >
            إعادة تشغيل اللعبة
          </button>
          <button
            type="button"
            disabled={!room || pendingAction === "lock_room"}
            onClick={() =>
              room &&
              window.confirm("قفل الغرفة نهائيًا؟") &&
              runStateAction("lock_room", () => lockRoom(room.id))
            }
            className="min-h-14 rounded-2xl border border-rose-200 bg-white px-4 text-lg font-black text-rose-700 disabled:opacity-50"
          >
            قفل الغرفة نهائيًا
          </button>
        </div>
      </Panel>
      </div>
    </PageShell>
  );
}
