"use client";

import { useEffect, useState } from "react";
import { ActionLink, InfoGrid, PageShell, Panel, RoomBadge } from "../_components/game-ui";
import type { EffectiveRole, Player, Room, Team } from "@/types/game";
import { getSessionPlayerId, readRoomSession } from "@/lib/auth/sessionRole";
import { getEffectiveRole } from "@/lib/game/permissions";
import { getPlayers } from "@/lib/game/playerService";
import { getRoom } from "@/lib/game/roomService";
import { getTeams } from "@/lib/game/teamService";

export default function WaitingRoomPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [actorId, setActorId] = useState<string>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadWaitingRoom() {
      const session = readRoomSession();
      const params = new URLSearchParams(window.location.search);
      const roomId = params.get("room") ?? session?.roomId;
      const activeRoom = await getRoom(roomId ?? undefined);
      if (!activeRoom) {
        setLoaded(true);
        return;
      }

      const roomTeams = await getTeams(activeRoom.id);
      const roomPlayers = await getPlayers(activeRoom.id);
      const playerId = getSessionPlayerId(session);
      const player = roomPlayers.find((item) => item.id === playerId);

      setActorId(player?.id);
      setRoom(activeRoom);
      setTeams(roomTeams);
      setPlayers(roomPlayers);
      setLoaded(true);
    }

    const timer = window.setTimeout(() => {
      void loadWaitingRoom();
    }, 0);
    const interval = window.setInterval(() => {
      void loadWaitingRoom();
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  const session = readRoomSession();
  const currentPlayer = players.find((player) => player.id === actorId);
  const effectiveRole: EffectiveRole = getEffectiveRole(actorId, room, session, teams, currentPlayer);
  const currentTeam = teams.find((team) => team.id === currentPlayer?.teamId);
  const currentTeamMembers = currentTeam
    ? players.filter((player) => player.teamId === currentTeam.id && player.status !== "kicked")
    : [];

  if (!loaded) {
    return (
      <PageShell
        eyebrow="انتظار اللاعبين"
        title="غرفة الانتظار"
        description="جاري تحميل الغرفة."
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
        eyebrow="المشرف"
        title="غرفة الانتظار"
        description="إدارة اللاعبين والفرق تتم من غرفة المشرف."
        showOrganizerLink
      >
        <Panel title="غرفة المشرف">
          <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-bold leading-6 text-slate-600">
              هذه شاشة انتظار اللاعبين. افتح غرفة المشرف لإدارة الأكواد والفرق وبدء اللعبة.
            </p>
            <ActionLink href={`/supervisor-room?room=${room?.id ?? ""}`} variant="secondary">
              فتح غرفة المشرف
            </ActionLink>
          </div>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="انتظار اللاعبين"
      title="غرفة الانتظار"
      description="تابع حالة انضمامك وانتظر توزيع الفرق من المشرف."
    >
      <RoomBadge code={room?.playerCode ?? "----"} />

      <InfoGrid
        items={[
          { label: "الغرفة", value: room?.name ?? "..." },
          { label: "الحالة", value: room?.status ?? "..." },
          { label: "اللاعب", value: currentPlayer?.name ?? "..." },
          { label: "الفريق المختار", value: currentTeam?.name ?? "لم يتم اختيار فريق بعد" },
        ]}
      />

      <Panel title="حالة اللاعب">
        <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-2">
            <p className="text-sm font-bold text-slate-500">اسم اللاعب</p>
            <p className="text-2xl font-black text-slate-950">{currentPlayer?.name ?? "لاعب"}</p>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-bold text-slate-500">حالة التوزيع</p>
            <p className="font-bold text-slate-700">
              {currentTeam ? `الفريق المختار: ${currentTeam.name}` : "لم يتم اختيار فريق بعد"}
            </p>
          </div>
          {currentTeam ? (
            <div className="grid gap-2">
              <p className="text-sm font-bold text-slate-500">أعضاء الفريق</p>
              <p className="font-bold leading-7 text-slate-700">
                {currentTeamMembers.map((player) => player.name).join("، ") || "لا يوجد لاعبون"}
              </p>
            </div>
          ) : null}
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-600">
            بانتظار المشرف لتعيين الكابتن وبدء اللعبة
          </p>
        </div>
      </Panel>

      {effectiveRole === "captain" ? (
        <Panel title="صلاحيات الكابتن">
          <div className="grid gap-3 rounded-3xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-100">
            <p className="text-lg font-black">أنت كابتن الفريق</p>
            {room?.status === "board_setup" ? (
              <ActionLink href="/captain-board" variant="secondary">
                تجهيز لوحة الفريق
              </ActionLink>
            ) : (
              <p className="text-sm font-bold leading-6">
                بانتظار بدء تجهيز اللوحات
              </p>
            )}
          </div>
        </Panel>
      ) : null}
    </PageShell>
  );
}
