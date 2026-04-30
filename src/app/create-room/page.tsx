"use client";

import { FormEvent, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ActionLink, PageShell, Panel } from "../_components/game-ui";
import {
  categories,
  defaultAnswerDurations,
  defaultRoomSettings,
  playersPerTeamOptions,
  teamCountOptions,
} from "@/lib/game/constants";
import { readLocalState } from "@/lib/game/localStore";
import { buildJoinUrl, createRoom } from "@/lib/game/roomService";
import {
  clampNumber,
  inputErrorMessages,
  sanitizeRoomName,
} from "@/lib/security/inputSafety";
import type { PointValue, Room } from "@/types/game";

type GateState = "checking" | "blocked" | "ready";

const pointValues: PointValue[] = [100, 300, 500, 700];

export default function CreateRoomPage() {
  const [gateState, setGateState] = useState<GateState>("checking");
  const [activationCode, setActivationCode] = useState("");
  const [message, setMessage] = useState("");
  const [roomName, setRoomName] = useState("غرفة الأصدقاء");
  const [teamCount, setTeamCount] = useState(defaultRoomSettings.teamsCount);
  const [playersPerTeam, setPlayersPerTeam] = useState(defaultRoomSettings.playersPerTeam);
  const [selectedCategories, setSelectedCategories] = useState(defaultRoomSettings.categories);
  const [durations, setDurations] = useState(defaultAnswerDurations);
  const [doubleEnabled, setDoubleEnabled] = useState(true);
  const [mineReflection, setMineReflection] = useState(false);
  const [objectionsCount, setObjectionsCount] = useState(defaultRoomSettings.objectionsPerTeam);
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

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

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`تم نسخ ${label}`);
    } catch {
      setCopyMessage(`انسخ ${label} يدويًا`);
    }
  }

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeRoomName = sanitizeRoomName(roomName);
    if (!safeRoomName) {
      setMessage(inputErrorMessages.required);
      return;
    }

    setIsCreating(true);

    const { room } = await createRoom({
      activationCode,
      name: safeRoomName,
      settings: {
        teamsCount: clampNumber(teamCount, 2, 4, defaultRoomSettings.teamsCount),
        teamCount: clampNumber(teamCount, 2, 4, defaultRoomSettings.teamsCount),
        playersPerTeam: clampNumber(playersPerTeam, 1, 5, defaultRoomSettings.playersPerTeam),
        categories: selectedCategories.length ? selectedCategories : categories.slice(0, 3),
        answerDurations: durations,
        doubleEnabled,
        minePenalty: 500,
        mineReflection,
        mineReflectionEnabled: mineReflection,
        objectionsCount: clampNumber(objectionsCount, 0, 5, defaultRoomSettings.objectionsPerTeam),
        objectionsPerTeam: clampNumber(objectionsCount, 0, 5, defaultRoomSettings.objectionsPerTeam),
        startingScore: 1000,
      },
    });

    setCreatedRoom(room);
    setIsCreating(false);
    setMessage("تم إنشاء الغرفة");
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
        description="إنشاء الغرف يحتاج رمز تفعيل للمشرف."
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

  if (createdRoom) {
    const joinLink = buildJoinUrl(createdRoom.playerCode);
    return (
      <PageShell
        eyebrow="غرفة جديدة"
        title="تم إنشاء الغرفة"
        description="احتفظ بكود المشرف وشارك كود اللاعب فقط مع اللاعبين."
        showOrganizerLink
      >
        {copyMessage ? (
          <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold leading-6 text-teal-900 ring-1 ring-teal-100">
            {copyMessage}
          </p>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-2">
          <Panel title="كود المشرف">
            <div className="grid gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-900">هذا الكود خاص بالمشرف فقط. لا ترسله للاعبين.</p>
              <p className="rounded-2xl bg-white px-4 py-5 text-center text-3xl font-black tracking-[0.2em] text-slate-950">
                {createdRoom.supervisorCode}
              </p>
              <button
                type="button"
                onClick={() => copyText(createdRoom.supervisorCode, "كود المشرف")}
                className="min-h-12 rounded-2xl bg-slate-950 px-4 text-base font-black text-white"
              >
                نسخ كود المشرف
              </button>
              <div className="grid justify-items-center gap-2">
                <QRCodeSVG value={`/activate?code=${createdRoom.supervisorCode}`} size={144} marginSize={2} className="rounded-2xl bg-white p-2" />
                <p className="text-xs font-bold text-amber-900">QR المشرف — لا تشاركه مع اللاعبين</p>
              </div>
            </div>
          </Panel>

          <Panel title="كود اللاعب">
            <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-black text-slate-500">للاعبين فقط</p>
              <p className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-3xl font-black tracking-[0.2em] text-slate-950">
                {createdRoom.playerCode}
              </p>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-500">رابط الدعوة</span>
                <input
                  readOnly
                  value={joinLink}
                  className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => copyText(createdRoom.playerCode, "كود اللاعب")}
                  className="min-h-12 rounded-2xl bg-teal-600 px-4 text-base font-black text-white"
                >
                  نسخ كود اللاعب
                </button>
                <button
                  type="button"
                  onClick={() => copyText(joinLink, "رابط الدعوة")}
                  className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base font-black text-slate-700"
                >
                  نسخ رابط الدعوة
                </button>
              </div>
              <div className="grid justify-items-center gap-2">
                <QRCodeSVG value={joinLink} size={168} marginSize={2} className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200" />
                <p className="text-xs font-bold text-slate-500">QR دعوة اللاعبين</p>
              </div>
            </div>
          </Panel>
        </section>

        <ActionLink href={`/supervisor-room?room=${createdRoom.id}`} variant="secondary">
          دخول غرفة المشرف
        </ActionLink>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="غرفة جديدة"
      title="إنشاء غرفة"
      description="اضبط الإعدادات الأساسية، ثم أنشئ أكواد منفصلة للمشرف واللاعبين."
    >
      {message ? (
        <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold leading-6 text-teal-900 ring-1 ring-teal-100">
          {message}
        </p>
      ) : null}

      <Panel title="إعدادات الغرفة">
        <form className="grid gap-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200" onSubmit={handleCreateRoom}>
          <label className="grid gap-2">
            <span className="font-bold text-slate-700">اسم الغرفة</span>
            <input
              className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-teal-500"
              maxLength={40}
              value={roomName}
              onChange={(event) => setRoomName(sanitizeRoomName(event.target.value))}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-bold text-slate-700">عدد الفرق</span>
              <select
                className="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-teal-500"
                value={teamCount}
                onChange={(event) => setTeamCount(clampNumber(event.target.value, 2, 4, defaultRoomSettings.teamsCount))}
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
                onChange={(event) => setPlayersPerTeam(clampNumber(event.target.value, 1, 5, defaultRoomSettings.playersPerTeam))}
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
                        [value]: clampNumber(event.target.value, 10, 120, current[value]),
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
                onChange={(event) => setObjectionsCount(clampNumber(event.target.value, 0, 5, defaultRoomSettings.objectionsPerTeam))}
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
