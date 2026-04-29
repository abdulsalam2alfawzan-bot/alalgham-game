"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, PageShell, Panel } from "../_components/game-ui";
import {
  categories,
  defaultAnswerDurations,
  defaultRoomSettings,
  playersPerTeamOptions,
  teamCountOptions,
} from "@/lib/game/constants";
import { readLocalState } from "@/lib/game/localStore";
import { createRoom } from "@/lib/game/roomService";
import type { PointValue } from "@/types/game";

type GateState = "checking" | "blocked" | "ready";

const pointValues: PointValue[] = [100, 300, 500, 700];

export default function CreateRoomPage() {
  const router = useRouter();
  const [gateState, setGateState] = useState<GateState>("checking");
  const [activationCode, setActivationCode] = useState("");
  const [message, setMessage] = useState("");
  const [roomName, setRoomName] = useState("غرفة الأصدقاء");
  const [teamCount, setTeamCount] = useState(defaultRoomSettings.teamCount);
  const [playersPerTeam, setPlayersPerTeam] = useState(defaultRoomSettings.playersPerTeam);
  const [selectedCategories, setSelectedCategories] = useState(defaultRoomSettings.categories);
  const [durations, setDurations] = useState(defaultAnswerDurations);
  const [doubleEnabled, setDoubleEnabled] = useState(true);
  const [mineReflection, setMineReflection] = useState(false);
  const [objectionsCount, setObjectionsCount] = useState(defaultRoomSettings.objectionsCount);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const state = readLocalState();
      const pendingActivation = state.currentActivationCode;
      if (!pendingActivation) {
        setGateState("blocked");
        return;
      }

      setActivationCode(pendingActivation);
      const params = new URLSearchParams(window.location.search);
      if (params.get("activated") === "1") {
        setMessage("تم تفعيل الغرفة بنجاح");
      }
      setGateState("ready");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);

    const { room } = await createRoom({
      activationCode,
      name: roomName,
      settings: {
        teamCount,
        playersPerTeam,
        categories: selectedCategories.length ? selectedCategories : categories.slice(0, 3),
        answerDurations: durations,
        doubleEnabled,
        mineReflection,
        objectionsCount,
        startingScore: 1000,
      },
    });

    setIsCreating(false);
    router.push(`/waiting-room?room=${room.roomCode}`);
  }

  if (gateState === "checking") {
    return (
      <PageShell
        eyebrow="غرفة جديدة"
        title="إنشاء غرفة"
        description="نتحقق من تفعيل الغرفة قبل بدء الإعداد."
      >
        <Panel>
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-600">
            جاري التحقق من رمز التفعيل...
          </p>
        </Panel>
      </PageShell>
    );
  }

  if (gateState === "blocked") {
    return (
      <PageShell
        eyebrow="غرفة جديدة"
        title="إنشاء غرفة"
        description="إنشاء الغرف يحتاج رمز تفعيل للمنظم."
      >
        <Panel title="التفعيل مطلوب">
          <div className="grid gap-4">
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
              أدخل رمز التفعيل أو امسح QR قبل إنشاء غرفة جديدة.
            </p>
            <ActionLink href="/activate" variant="secondary">
              تفعيل غرفة جديدة
            </ActionLink>
          </div>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="غرفة جديدة"
      title="إنشاء غرفة"
      description="اضبط الإعدادات الأساسية، ثم شارك رابط الدعوة مع اللاعبين."
    >
      {message ? (
        <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold leading-6 text-teal-900 ring-1 ring-teal-100">
          {message}
        </p>
      ) : null}

      <Panel title="إعدادات الغرفة">
        <form className="grid gap-5" onSubmit={handleCreateRoom}>
          <label className="grid gap-2">
            <span className="font-bold text-slate-700">اسم الغرفة</span>
            <input
              className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-teal-500"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-bold text-slate-700">عدد الفرق</span>
              <select
                className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-teal-500"
                value={teamCount}
                onChange={(event) => setTeamCount(Number(event.target.value))}
              >
                {teamCountOptions.map((option) => (
                  <option key={option} value={option}>
                    {option} فرق
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-bold text-slate-700">لاعبون لكل فريق</span>
              <select
                className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-teal-500"
                value={playersPerTeam}
                onChange={(event) => setPlayersPerTeam(Number(event.target.value))}
              >
                {playersPerTeamOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="grid gap-3">
            <legend className="font-bold text-slate-700">التصنيفات</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.map((category) => {
                const checked = selectedCategories.includes(category);
                return (
                  <label
                    key={category}
                    className={`flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border px-3 text-center text-sm font-bold ${
                      checked
                        ? "border-teal-600 bg-teal-50 text-teal-900"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleCategory(category)}
                    />
                    {category}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="font-bold text-slate-700">مدة الإجابة بالثواني</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {pointValues.map((value) => (
                <label key={value} className="rounded-3xl bg-slate-50 p-4">
                  <span className="text-sm font-bold text-slate-500">{value}</span>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    className="mt-2 w-full bg-transparent text-3xl font-black outline-none"
                    value={durations[value]}
                    onChange={(event) =>
                      setDurations((current) => ({
                        ...current,
                        [value]: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 p-4 font-bold text-slate-700">
              الدبل
              <input
                type="checkbox"
                checked={doubleEnabled}
                onChange={(event) => setDoubleEnabled(event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 p-4 font-bold text-slate-700">
              انعكاس اللغم
              <input
                type="checkbox"
                checked={mineReflection}
                onChange={(event) => setMineReflection(event.target.checked)}
              />
            </label>
            <label className="grid gap-2 rounded-3xl bg-slate-50 p-4">
              <span className="font-bold text-slate-700">الاعتراضات</span>
              <input
                type="number"
                min="0"
                max="5"
                className="w-full bg-transparent text-3xl font-black outline-none"
                value={objectionsCount}
                onChange={(event) => setObjectionsCount(Number(event.target.value))}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="min-h-14 rounded-2xl bg-teal-600 px-5 py-4 text-lg font-black text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
          >
            {isCreating ? "جاري إنشاء الغرفة..." : "إنشاء الغرفة"}
          </button>
        </form>
      </Panel>
    </PageShell>
  );
}
