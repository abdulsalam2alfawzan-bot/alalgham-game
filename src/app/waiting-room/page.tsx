"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ActionLink, InfoGrid, PageShell, Panel, RoomBadge } from "../_components/game-ui";
import type { Player, Room, Team } from "@/types/game";
import { getPlayers, assignPlayerToTeam } from "@/lib/game/playerService";
import { buildJoinUrl, getRoom, getRoomByCode, updateRoomStatus } from "@/lib/game/roomService";
import { getTeams, setCaptain } from "@/lib/game/teamService";

export default function WaitingRoomPage() {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [copyMessage, setCopyMessage] = useState("");

  async function loadWaitingRoom() {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get("room");
    const activeRoom = roomCode ? await getRoomByCode(roomCode) : await getRoom();
    if (!activeRoom) {
      return;
    }

    setRoom(activeRoom);
    setTeams(await getTeams(activeRoom.id));
    setPlayers(await getPlayers(activeRoom.id));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWaitingRoom();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleAssign(playerId: string, teamId: string) {
    if (!room) {
      return;
    }

    await assignPlayerToTeam(room.id, playerId, teamId);
    await loadWaitingRoom();
  }

  async function handleCaptain(teamId: string, playerId: string) {
    if (!room) {
      return;
    }

    await setCaptain(room.id, teamId, playerId);
    await loadWaitingRoom();
  }

  async function handleStartBoards() {
    if (!room) {
      return;
    }

    await updateRoomStatus(room.id, "board_setup");
    router.push("/teams");
  }

  async function copyInviteLink() {
    if (!room) {
      return;
    }

    const link = buildJoinUrl(room.roomCode);
    try {
      await navigator.clipboard.writeText(link);
      setCopyMessage("تم نسخ رابط الدعوة");
    } catch {
      setCopyMessage("انسخ الرابط يدويًا من الحقل");
    }
  }

  const joinLink = room ? buildJoinUrl(room.roomCode) : "";
  const playerCount = players.length;

  return (
    <PageShell
      eyebrow="انتظار اللاعبين"
      title="غرفة الانتظار"
      description="شارك رمز الغرفة أو QR الدعوة، ثم وزّع اللاعبين على الفرق."
    >
      <RoomBadge code={room?.roomCode ?? "----"} />

      <Panel title="دعوة اللاعبين">
        <div className="grid gap-4 lg:grid-cols-[1fr_12rem] lg:items-center">
          <div className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-500">رابط انضمام اللاعبين</span>
              <input
                readOnly
                value={joinLink}
                className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={copyInviteLink}
              className="min-h-12 rounded-2xl bg-slate-950 px-4 text-base font-black text-white"
            >
              نسخ رابط الدعوة
            </button>
            {copyMessage ? (
              <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-900">
                {copyMessage}
              </p>
            ) : null}
            <p className="text-sm font-bold leading-6 text-slate-500">
              رمز التفعيل للمنظم فقط. رمز الغرفة وQR الدعوة للاعبين.
            </p>
          </div>

          <div className="grid justify-items-center gap-2">
            {joinLink ? (
              <QRCodeSVG
                value={joinLink}
                size={176}
                marginSize={2}
                className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200"
              />
            ) : null}
            <p className="text-center text-xs font-bold text-slate-500">
              QR دعوة اللاعبين
            </p>
          </div>
        </div>
      </Panel>

      <InfoGrid
        items={[
          { label: "الغرفة", value: room?.name ?? "..." },
          { label: "اللاعبون", value: `${playerCount}` },
          { label: "الفرق", value: `${teams.length}` },
          { label: "الحالة", value: room?.status ?? "..." },
        ]}
      />

      <Panel title="اللاعبون">
        <div className="grid gap-3">
          {players.map((player) => (
            <article
              key={player.id}
              className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-[1fr_12rem_10rem]"
            >
              <div>
                <h3 className="font-black text-slate-950">{player.name}</h3>
                <p className="text-sm font-bold text-slate-500">
                  {player.isCaptain ? "كابتن" : "لاعب"}
                </p>
              </div>
              <select
                className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-bold"
                value={player.teamId ?? ""}
                onChange={(event) => handleAssign(player.id, event.target.value)}
              >
                <option value="">بدون فريق</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!player.teamId}
                onClick={() => player.teamId && handleCaptain(player.teamId, player.id)}
                className="min-h-12 rounded-2xl bg-amber-400 px-3 font-black text-slate-950 disabled:opacity-40"
              >
                تعيين كابتن
              </button>
            </article>
          ))}
          {!players.length ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
              لم ينضم أي لاعب بعد.
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel title="الفرق">
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((team) => {
            const captain = players.find((player) => player.id === team.captainPlayerId);
            const teamPlayers = players.filter((player) => player.teamId === team.id);
            return (
              <article key={team.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-slate-950">{team.name}</h3>
                  <span className={`h-4 w-4 rounded-full ${team.color}`} />
                </div>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  الكابتن: {captain?.name ?? "لم يحدد"}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {teamPlayers.map((player) => player.name).join("، ") || "لا يوجد لاعبون"}
                </p>
              </article>
            );
          })}
        </div>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleStartBoards}
          className="min-h-14 rounded-2xl bg-teal-600 px-5 py-4 text-lg font-black text-white shadow-sm"
        >
          بدء تجهيز اللوحات
        </button>
        <ActionLink href="/join" variant="light">
          دخول لاعب
        </ActionLink>
      </section>
    </PageShell>
  );
}
