"use client";

import { ActionLink, InfoGrid, PageShell, Panel, RoomBadge } from "../_components/game-ui";
import { PlayBoard } from "../_components/play-board";
import type { EffectiveRole } from "@/types/game";
import { readRoomSession } from "@/lib/auth/sessionRole";
import { getEffectiveRole } from "@/lib/game/permissions";
import { useRoomState } from "@/lib/game/roomState";

export default function PlayPage() {
  const session = readRoomSession();
  const state = useRoomState(session?.roomId);
  const { room, teams, players, actorId, loading } = state;
  const currentPlayer = players.find((player) => player.id === actorId);
  const effectiveRole: EffectiveRole = getEffectiveRole(actorId, room, session, teams, currentPlayer);
  const captainTeam = teams.find(
    (team) => team.captainId === actorId || team.captainPlayerId === actorId,
  );
  const playerTeam = teams.find((team) => team.id === currentPlayer?.teamId);
  const activeTeam = teams.find((team) => team.id === room?.currentTurnTeamId);
  const closedStatusMessage =
    room?.status === "finished"
      ? "انتهت اللعبة"
      : room?.status === "locked"
        ? "تم قفل الغرفة من المشرف"
        : room?.status === "expired"
          ? "انتهت صلاحية الغرفة"
          : room?.status === "paused"
            ? "اللعبة متوقفة مؤقتًا بقرار المشرف"
            : room?.status === "board_setup"
              ? "بانتظار تجهيز اللوحات"
              : room?.status === "team_assignment"
                ? "جاري تجهيز الفرق"
                : room?.status === "waiting"
                  ? "لم تبدأ اللعبة بعد"
                  : "";

  if (loading) {
    return (
      <PageShell
        eyebrow="اللعب"
        title="لوحة اللعب"
        description="جاري تحميل اللعبة."
      >
        <Panel>
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            جاري التحميل...
          </p>
        </Panel>
      </PageShell>
    );
  }

  if (effectiveRole === "organizer") {
    return (
      <PageShell
        eyebrow="اللعب"
        title="لوحة اللعب"
        description="المشرف يدير التحكيم من غرفة منفصلة."
        showOrganizerLink
      >
        <Panel title="غرفة المشرف">
          <div className="grid gap-4">
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-600">
              استخدم غرفة المشرف لإدارة الإجابات والنقاط وإنهاء اللعبة.
            </p>
            <ActionLink href={`/supervisor-room?room=${room?.id ?? ""}`} variant="secondary">
              فتح لوحة المشرف
            </ActionLink>
          </div>
        </Panel>
      </PageShell>
    );
  }

  if (effectiveRole === "player") {
    return (
      <PageShell
        eyebrow="اللعب"
        title="لوحة اللعب"
        description="تابع حالة اللعبة وانتظر قرار كابتن فريقك."
      >
        <RoomBadge code={room?.roomNumber ?? "----"} label="رقم الغرفة" />
        <InfoGrid
          items={[
            { label: "الغرفة", value: room?.name ?? "..." },
            { label: "رقم الغرفة", value: room?.roomNumber ?? "..." },
            { label: "الحالة", value: room?.status ?? "..." },
            { label: "الدور", value: activeTeam?.name ?? "..." },
          ]}
        />
        <Panel title="حالتك">
          <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-600">
              {closedStatusMessage ||
                (playerTeam?.id === activeTeam?.id
                  ? "ناقش الإجابة مع فريقك، والكابتن هو من يرسل الإجابة النهائية"
                  : "بانتظار دور فريقك")}
            </p>
            <div className="grid gap-2">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="font-bold">{team.name}</span>
                  <strong>{team.score}</strong>
                </div>
              ))}
            </div>
            {room?.status === "finished" ? (
              <ActionLink href={`/results?room=${room.id}`} variant="secondary">
                عرض النتائج
              </ActionLink>
            ) : (
              <ActionLink href="/waiting-room" variant="light">
                العودة لغرفة الانتظار
              </ActionLink>
            )}
          </div>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="اللعب"
      title="لوحة اللعب"
      description="اختر الفريق والمربع، ثم أرسل الإجابة النهائية للمشرف."
    >
      <RoomBadge code={room?.roomNumber ?? "----"} label="رقم الغرفة" />
      <Panel title="صلاحيات الكابتن" tone="soft">
        <div className="grid gap-2">
          <p className="text-base font-black text-teal-950">كابتن الفريق</p>
          <p className="text-sm font-bold text-teal-900">{captainTeam?.name ?? "فريقك"}</p>
          {closedStatusMessage ? (
            <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-6 text-slate-700">
              {closedStatusMessage}
            </p>
          ) : null}
          {room?.status === "board_setup" ? (
            <ActionLink href="/captain-board" variant="secondary">
              تجهيز لوحة الفريق
            </ActionLink>
          ) : null}
        </div>
      </Panel>
      {room?.status === "playing" || room?.status === "paused" ? (
        <PlayBoard role={effectiveRole} captainTeamId={captainTeam?.id} roomState={state} />
      ) : null}
      {room?.status === "finished" ? (
        <ActionLink href={`/results?room=${room.id}`} variant="secondary">
          عرض النتائج
        </ActionLink>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/waiting-room" variant="light">
          غرفة الانتظار
        </ActionLink>
        <ActionLink href="/results" variant="secondary">
          النتائج
        </ActionLink>
      </section>
    </PageShell>
  );
}
