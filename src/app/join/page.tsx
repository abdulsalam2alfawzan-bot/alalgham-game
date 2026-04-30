"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell, Panel, RoomBadge } from "../_components/game-ui";
import { QrScannerModal } from "@/components/qr/QrScannerModal";
import type { Team } from "@/types/game";
import { validatePlayerCode } from "@/lib/auth/roomAccess";
import { activeTeamDefinitions, futureTeamDefinitions, isActiveTeamId } from "@/lib/game/constants";
import { joinRoom } from "@/lib/game/playerService";
import { useRoomState } from "@/lib/game/roomState";
import {
  inputErrorMessages,
  isSafeText,
  isValidPlayerCode,
  sanitizeCode,
  sanitizeName,
} from "@/lib/security/inputSafety";
import { parseQrValue } from "@/lib/qr/parseQrValue";

export default function JoinPage() {
  const router = useRouter();
  const [playerCode, setPlayerCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [joinRoomId, setJoinRoomId] = useState<string>();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [message, setMessage] = useState("");
  const [qrMessage, setQrMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const liveRoom = useRoomState(joinRoomId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get("code") ?? params.get("room") ?? "";
      const parsed = parseQrValue(codeFromUrl);
      if (parsed.playerCode) {
        setPlayerCode(parsed.playerCode);
      } else if (parsed.ownerCode) {
        setMessage("هذا QR خاص بمالك الغرفة وليس للاعبين");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTeamsForCode() {
      const safeCode = sanitizeCode(playerCode);
      if (!isValidPlayerCode(safeCode)) {
        setAvailableTeams([]);
        setJoinRoomId(undefined);
        setSelectedTeamId("");
        return;
      }

      const room = await validatePlayerCode(safeCode);
      if (!room) {
        if (!cancelled) {
          setAvailableTeams([]);
          setJoinRoomId(undefined);
          setSelectedTeamId("");
        }
        return;
      }

      if (!cancelled) {
        setJoinRoomId(room.id);
      }
    }

    void loadTeamsForCode();
    return () => {
      cancelled = true;
    };
  }, [playerCode]);

  useEffect(() => {
    if (joinRoomId) {
      const timer = window.setTimeout(() => {
        setAvailableTeams(liveRoom.teams.filter((team) => isActiveTeamId(team.id)));
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [joinRoomId, liveRoom.teams]);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeCode = sanitizeCode(playerCode);
    const safeName = sanitizeName(playerName);

    if (!isValidPlayerCode(safeCode)) {
      setMessage("كود اللاعبين غير صحيح أو منتهي");
      return;
    }

    if (!safeName || !isSafeText(safeName)) {
      setMessage(inputErrorMessages.required);
      return;
    }

    if (!isActiveTeamId(selectedTeamId)) {
      setMessage("يرجى اختيار فريق صحيح");
      return;
    }

    setIsJoining(true);
    const result = await joinRoom(safeCode, safeName, selectedTeamId);
    setIsJoining(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setMessage("تم دخول الغرفة");
    router.push(`/waiting-room?room=${result.room.id}`);
  }

  function handleJoinScan(value: string) {
    const parsed = parseQrValue(value);
    if (parsed.ownerCode) {
      setQrMessage("هذا QR خاص بمالك الغرفة وليس للاعبين");
      return;
    }

    if (!parsed.valid || !parsed.playerCode) {
      setQrMessage("رمز QR غير صالح");
      return;
    }

    setPlayerCode(parsed.playerCode);
    setSelectedTeamId("");
    setMessage("");
    setQrMessage("تم قراءة كود اللاعبين، اضغط دخول الغرفة للمتابعة.");
  }

  return (
    <PageShell
      eyebrow="لاعب"
      title="دخول لاعب"
      description="أدخل كود اللاعبين للانضمام إلى الغرفة."
    >
      <RoomBadge code={playerCode || "----"} />

      <Panel title="بيانات اللاعب">
        <form className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200" onSubmit={handleJoin}>
          <label className="grid gap-2">
            <span className="font-bold text-slate-700">كود اللاعبين</span>
            <input
              className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-2xl font-black uppercase tracking-[0.18em] outline-none focus:border-teal-500"
              maxLength={20}
              value={playerCode}
              onChange={(event) => setPlayerCode(sanitizeCode(event.target.value))}
              placeholder="P-4821-27"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-bold text-slate-700">اسم اللاعب</span>
            <input
              className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-teal-500"
              placeholder="مثال: أحمد"
              maxLength={30}
              value={playerName}
              onChange={(event) => setPlayerName(sanitizeName(event.target.value))}
            />
          </label>

          <fieldset className="grid gap-3">
            <legend className="font-bold text-slate-700">اختر فريقك</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeTeamDefinitions.map((teamDefinition) => {
                const team = availableTeams.find((item) => item.id === teamDefinition.id);
                const teamName = team?.name ?? teamDefinition.defaultName;
                const selected = selectedTeamId === teamDefinition.id;
                const isBlue = teamDefinition.id === "blue-team";

                return (
                  <button
                    key={teamDefinition.id}
                    type="button"
                    onClick={() => setSelectedTeamId(teamDefinition.id)}
                    className={`min-h-24 rounded-3xl border-2 p-4 text-right shadow-sm transition ${
                      selected
                        ? isBlue
                          ? "border-blue-600 bg-blue-50 text-blue-950 ring-4 ring-blue-100"
                          : "border-red-600 bg-red-50 text-red-950 ring-4 ring-red-100"
                        : "border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <span className={`mb-3 block h-3 w-16 rounded-full ${isBlue ? "bg-blue-600" : "bg-red-600"}`} />
                    <span className="block text-xl font-black">{teamName}</span>
                    <span className="mt-1 block text-sm font-bold opacity-70">
                      {selected ? "تم الاختيار" : "اضغط للاختيار"}
                    </span>
                  </button>
                );
              })}

              {futureTeamDefinitions.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  disabled
                  className="min-h-24 cursor-not-allowed rounded-3xl border-2 border-slate-200 bg-slate-100 p-4 text-right text-slate-400"
                >
                  <span className="mb-3 block h-3 w-16 rounded-full bg-slate-300" />
                  <span className="block text-xl font-black">{team.name}</span>
                  <span className="mt-1 block text-sm font-bold">غير متاح الآن</span>
                </button>
              ))}
            </div>
          </fieldset>

          {message ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isJoining}
            className="min-h-14 rounded-2xl bg-teal-600 px-5 py-4 text-lg font-black text-white shadow-sm disabled:opacity-60"
          >
            {isJoining ? "جاري الدخول..." : "دخول الغرفة"}
          </button>
        </form>
      </Panel>

      <Panel title="الدخول عبر QR" tone="soft">
        <div className="grid gap-3">
          <p className="text-sm font-bold leading-6 text-teal-950">
            يمكنك مسح رمز QR بكاميرا الجوال أو إدخال كود اللاعبين يدويًا.
          </p>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="min-h-14 rounded-2xl border border-teal-200 bg-white px-5 py-4 text-lg font-black text-teal-800"
          >
            مسح QR
          </button>
          {qrMessage ? (
            <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-6 text-slate-700 ring-1 ring-teal-100">
              {qrMessage}
            </p>
          ) : null}
        </div>
      </Panel>

      <QrScannerModal
        open={scannerOpen}
        title="مسح QR"
        onClose={() => setScannerOpen(false)}
        onScan={handleJoinScan}
      />
    </PageShell>
  );
}
