"use client";

import { useEffect, useState } from "react";
import { ActionLink, InfoGrid, PageShell, Panel } from "../_components/game-ui";
import { PlayBoard } from "../_components/play-board";
import type { EffectiveRole, Player, Room, Team } from "@/types/game";
import { getSessionPlayerId, readRoomSession } from "@/lib/auth/sessionRole";
import { getEffectiveRole } from "@/lib/game/permissions";
import { getPlayers } from "@/lib/game/playerService";
import { getRoom } from "@/lib/game/roomService";
import { getTeams } from "@/lib/game/teamService";

export default function PlayPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [actorId, setActorId] = useState<string>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const session = readRoomSession();
      const activeRoom = await getRoom(session?.roomId);
      if (!activeRoom) {
        setLoaded(true);
        return;
      }

      setActorId(getSessionPlayerId(session));
      setRoom(activeRoom);
      setTeams(await getTeams(activeRoom.id));
      setPlayers(await getPlayers(activeRoom.id));
      setLoaded(true);
    }

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const session = readRoomSession();
  const currentPlayer = players.find((player) => player.id === actorId);
  const effectiveRole: EffectiveRole = getEffectiveRole(actorId, room, session, teams, currentPlayer);
  const captainTeam = teams.find(
    (team) => team.captainId === actorId || team.captainPlayerId === actorId,
  );

  if (!loaded) {
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
        <InfoGrid
          items={[
            { label: "الغرفة", value: room?.name ?? "..." },
            { label: "الحالة", value: room?.status ?? "..." },
            { label: "الفرق", value: `${teams.length}` },
            { label: "الدور", value: room?.currentTurnTeamId ?? "..." },
          ]}
        />
        <Panel title="حالتك">
          <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-600">
              انتظر قرار الكابتن
            </p>
            <div className="grid gap-2">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="font-bold">{team.name}</span>
                  <strong>{team.score}</strong>
                </div>
              ))}
            </div>
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
      <Panel title="صلاحيات الكابتن" tone="soft">
        <p className="text-base font-black text-teal-950">أنت كابتن الفريق</p>
      </Panel>
      <PlayBoard role={effectiveRole} captainTeamId={captainTeam?.id} />

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
