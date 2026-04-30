"use client";

import { useEffect, useMemo, useState } from "react";
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
import { getPlayers, assignPlayerToTeam, kickPlayer } from "@/lib/game/playerService";
import { getQuestions } from "@/lib/game/questionService";
import { futureTeamDefinitions, getDefaultTeamName } from "@/lib/game/constants";
import { buildJoinUrl, getRoom, updateRoomStatus } from "@/lib/game/roomService";
import { adjustTeamScore, getTeams, removeCaptain, saveTeam, setCaptain } from "@/lib/game/teamService";
import { getCurrentTurn } from "@/lib/game/turnService";
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

export function SupervisorRoom() {
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

  async function loadSupervisorRoom() {
    const session = readRoomSession();
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("room") ?? session?.roomId;
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
  const effectiveRole: EffectiveRole = getEffectiveRole(undefined, room, session, teams);
  const sessionValid = isValidOwnerSession(room, session);
  const ownerLink = room ? buildOwnerQrUrl(room.ownerCode) : "";
  const joinLink = room ? buildJoinUrl(room.playerCode) : "";
  const activePlayers = players.filter((player) => player.status !== "kicked");
  const currentQuestion = questions[0];
  const activeTeam = teams.find((team) => team.id === selectedTeamId);
  const visibleEvents = showMoreEvents ? events : events.slice(0, 10);
  const canEditTeamNames = room ? !["playing", "paused", "finished", "expired"].includes(room.status) : false;

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

  async function updatePhase(status: Room["status"]) {
    if (!room || !guard(canManageTeams(effectiveRole))) {
      return;
    }

    await updateRoomStatus(room.id, status);
    await loadSupervisorRoom();
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

    await addGameEvent(room.id, "turn_resolved", `إجراء المشرف: ${action}`);
    setMessage(`تم تسجيل إجراء: ${action}`);
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

    await updateRoomStatus(room.id, "finished");
    await addGameEvent(room.id, "game_finished", "تم إنهاء اللعبة");
    setMessage("تم إنهاء اللعبة");
    await loadSupervisorRoom();
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

      <Panel title="اللاعبون">
        <div className="grid gap-3">
          {activePlayers.map((player) => {
            const playerTeam = teams.find((team) => team.id === player.teamId);
            const isCaptain = player.role === "captain" || teams.some((team) => team.captainId === player.id || team.captainPlayerId === player.id);
            return (
              <article key={player.id} className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:grid-cols-[1fr_12rem_11rem_9rem] lg:items-center">
                <div>
                  <h3 className="font-black text-slate-950">{player.name}</h3>
                  <p className="text-sm font-bold text-slate-500">
                    {player.status} · {roleLabel(player)} · {playerTeam?.name ?? "بدون فريق"}
                  </p>
                </div>
                <select value={player.teamId ?? ""} onChange={(event) => movePlayer(player.id, event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-bold">
                  <option value="" disabled>اختر فريق</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                <div className="grid gap-2">
                  <button type="button" disabled={!player.teamId} onClick={() => player.teamId && chooseCaptain(player.teamId, player.id)} className="min-h-11 rounded-2xl bg-amber-400 px-3 font-black text-slate-950 disabled:opacity-40">
                    تعيين كابتن
                  </button>
                  {isCaptain && player.teamId ? (
                    <button type="button" onClick={() => clearCaptain(player.teamId!)} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 font-black text-slate-700">
                      إزالة الكابتن
                    </button>
                  ) : null}
                </div>
                <button type="button" onClick={() => removePlayer(player.id)} className="min-h-12 rounded-2xl border border-rose-200 bg-rose-50 px-3 font-black text-rose-700">
                  طرد لاعب
                </button>
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
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold leading-7 text-slate-600">
                  {members.length ? members.map((member) => member.name).join("، ") : "لا يوجد أعضاء بعد"}
                </div>
                <p className={`rounded-2xl px-3 py-2 text-sm font-bold ${team.boardLocked ? "bg-teal-50 text-teal-900" : "bg-slate-50 text-slate-600"}`}>
                  اللوحة: {team.boardLocked ? "جاهزة" : "غير جاهزة"}
                </p>
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel title="مراحل اللعبة">
        <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-bold text-slate-500">المرحلة الحالية</p>
          <p className="text-3xl font-black text-slate-950">{room?.status}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {room?.status === "waiting" ? (
              <button type="button" onClick={() => updatePhase("team_assignment")} className="min-h-14 rounded-2xl bg-teal-600 px-4 font-black text-white">بدء توزيع الفرق</button>
            ) : null}
            {room?.status === "team_assignment" ? (
              <button type="button" onClick={() => updatePhase("board_setup")} className="min-h-14 rounded-2xl bg-teal-600 px-4 font-black text-white">بدء تجهيز اللوحات</button>
            ) : null}
            {room?.status === "board_setup" ? (
              <button type="button" onClick={() => updatePhase("playing")} className="min-h-14 rounded-2xl bg-teal-600 px-4 font-black text-white">بدء اللعبة</button>
            ) : null}
            {room?.status === "playing" ? (
              <button type="button" onClick={() => updatePhase("paused")} className="min-h-14 rounded-2xl bg-amber-400 px-4 font-black text-slate-950">إيقاف مؤقت</button>
            ) : null}
            {room?.status === "paused" ? (
              <button type="button" onClick={() => updatePhase("playing")} className="min-h-14 rounded-2xl bg-teal-600 px-4 font-black text-white">استئناف</button>
            ) : null}
          </div>
        </div>
      </Panel>

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
              <button type="button" onClick={() => logJudgeAction("صح")} className="min-h-14 rounded-2xl bg-teal-600 px-4 text-lg font-black text-white">صح</button>
              <button type="button" onClick={() => logJudgeAction("خطأ")} className="min-h-14 rounded-2xl bg-rose-600 px-4 text-lg font-black text-white">خطأ</button>
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

      <Panel title="منطقة الخطر">
        <div className="grid gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-bold leading-6 text-rose-800">
            هذه الإجراءات قد تؤثر على سير اللعبة. استخدمها بحذر.
          </p>
          <button type="button" onClick={finishGame} className="min-h-14 rounded-2xl bg-rose-600 px-4 text-lg font-black text-white">
            إنهاء اللعبة
          </button>
        </div>
      </Panel>
    </PageShell>
  );
}
