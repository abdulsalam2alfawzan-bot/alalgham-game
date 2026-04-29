"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, PageShell, Panel } from "../_components/game-ui";
import type { Player, Room, Team } from "@/types/game";
import { getPlayers, assignPlayerToTeam } from "@/lib/game/playerService";
import { getRoom, updateRoomStatus } from "@/lib/game/roomService";
import { getTeams, saveTeam, setCaptain } from "@/lib/game/teamService";

export default function TeamsPage() {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [message, setMessage] = useState("");

  async function loadTeamsPage() {
    const activeRoom = await getRoom();
    if (!activeRoom) {
      return;
    }

    setRoom(activeRoom);
    setTeams(await getTeams(activeRoom.id));
    setPlayers(await getPlayers(activeRoom.id));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTeamsPage();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function updateTeamName(team: Team, name: string) {
    await saveTeam({ ...team, name });
    await loadTeamsPage();
  }

  async function movePlayer(playerId: string, teamId: string) {
    if (!room) {
      return;
    }

    await assignPlayerToTeam(room.id, playerId, teamId);
    await loadTeamsPage();
  }

  async function chooseCaptain(teamId: string, playerId: string) {
    if (!room) {
      return;
    }

    await setCaptain(room.id, teamId, playerId);
    await loadTeamsPage();
  }

  async function startBoardSetup() {
    if (!room) {
      return;
    }

    const missingCaptain = teams.some((team) => !team.captainPlayerId);
    if (missingCaptain) {
      setMessage("يجب تعيين كابتن لكل فريق قبل تجهيز اللوحات.");
      return;
    }

    await updateRoomStatus(room.id, "board_setup");
    router.push("/captain-board");
  }

  return (
    <PageShell
      eyebrow="الفرق"
      title="توزيع الفرق"
      description="عدّل أسماء الفرق، انقل اللاعبين، وحدد كابتن لكل فريق."
    >
      {message ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
          {message}
        </p>
      ) : null}

      <Panel title="الفرق والكباتن">
        <div className="grid gap-4">
          {teams.map((team) => {
            const teamPlayers = players.filter((player) => player.teamId === team.id);
            return (
              <article key={team.id} className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <span className={`h-4 w-4 rounded-full ${team.color}`} />
                  <input
                    className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-lg font-black outline-none focus:border-teal-500"
                    value={team.name}
                    onChange={(event) => updateTeamName(team, event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  {teamPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-[1fr_12rem_10rem]"
                    >
                      <span className="font-bold text-slate-700">{player.name}</span>
                      <select
                        className="min-h-10 rounded-xl border border-slate-200 bg-white px-2 font-bold"
                        value={player.teamId ?? ""}
                        onChange={(event) => movePlayer(player.id, event.target.value)}
                      >
                        {teams.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => chooseCaptain(team.id, player.id)}
                        className={`min-h-10 rounded-xl px-3 font-black ${
                          team.captainPlayerId === player.id
                            ? "bg-amber-400 text-slate-950"
                            : "bg-white text-slate-700"
                        }`}
                      >
                        كابتن
                      </button>
                    </div>
                  ))}
                  {!teamPlayers.length ? (
                    <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                      لا يوجد لاعبون في هذا الفريق.
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel title="لاعبون بدون فريق">
        <div className="grid gap-2">
          {players
            .filter((player) => !player.teamId)
            .map((player) => (
              <div key={player.id} className="grid gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:grid-cols-[1fr_12rem]">
                <span className="font-bold text-slate-700">{player.name}</span>
                <select
                  className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-2 font-bold"
                  defaultValue=""
                  onChange={(event) => movePlayer(player.id, event.target.value)}
                >
                  <option value="" disabled>
                    اختر فريق
                  </option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
        </div>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={startBoardSetup}
          className="min-h-14 rounded-2xl bg-teal-600 px-5 py-4 text-lg font-black text-white shadow-sm"
        >
          بدء تجهيز اللوحات
        </button>
        <ActionLink href="/waiting-room" variant="light">
          رجوع للانتظار
        </ActionLink>
      </section>
    </PageShell>
  );
}
