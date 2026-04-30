"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Room } from "@/types/game";
import { getRoom } from "@/lib/game/roomService";
import { buildOwnerQrUrl, buildPlayerQrUrl } from "@/lib/qr/roomQrLinks";

type PrintMode = "owner" | "player" | "both";
type CardKind = "owner" | "player";

function PrintStyles() {
  return (
    <style>{`
      @page {
        size: A4;
        margin: 14mm;
      }

      @media print {
        body {
          background: #fff !important;
        }

        .screen-actions {
          display: none !important;
        }

        .print-page {
          min-height: auto !important;
          padding: 0 !important;
        }

        .print-card {
          box-shadow: none !important;
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    `}</style>
  );
}

function PrintCard({ kind, room }: { kind: CardKind; room: Room }) {
  const isOwner = kind === "owner";
  const code = isOwner ? room.ownerCode : room.playerCode;
  const qrValue = isOwner ? buildOwnerQrUrl(room.ownerCode) : buildPlayerQrUrl(room.playerCode);

  return (
    <article
      className={`print-card grid gap-5 rounded-[2rem] border-2 bg-white p-6 text-center ${
        isOwner ? "border-amber-400" : "border-teal-400"
      }`}
    >
      <div className="grid gap-2">
        <p className={`text-sm font-black ${isOwner ? "text-amber-800" : "text-teal-700"}`}>
          {isOwner ? "QR مالك الغرفة" : "QR اللاعبين"}
        </p>
        <h1 className="text-3xl font-black text-slate-950">
          {isOwner ? "بطاقة مالك الغرفة" : "دخول اللاعبين"}
        </h1>
        <p className="text-lg font-bold text-slate-600">{room.name}</p>
      </div>

      <div className="mx-auto rounded-3xl bg-white p-4 ring-1 ring-slate-200">
        <QRCodeSVG value={qrValue} size={260} marginSize={2} />
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-black text-slate-500">
          {isOwner ? "كود مالك الغرفة" : "كود اللاعبين"}
        </p>
        <p className="rounded-3xl bg-slate-950 px-5 py-4 text-4xl font-black tracking-[0.18em] text-white">
          {code}
        </p>
      </div>

      {isOwner ? (
        <p className="rounded-3xl bg-amber-50 px-5 py-4 text-lg font-black leading-8 text-amber-950 ring-1 ring-amber-200">
          خاص بمالك الغرفة فقط — لا تشاركه مع اللاعبين
        </p>
      ) : (
        <div className="grid gap-2 rounded-3xl bg-teal-50 px-5 py-4 text-base font-black leading-7 text-teal-950 ring-1 ring-teal-100">
          <p>امسح QR أو أدخل كود اللاعبين</p>
          <p>هذا الكود لا يمنح صلاحيات المشرف</p>
        </div>
      )}
    </article>
  );
}

export function PrintRoomCards({ mode }: { mode: PrintMode }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadRoom() {
      const params = new URLSearchParams(window.location.search);
      const roomId = params.get("room") ?? undefined;
      const activeRoom = await getRoom(roomId);
      setRoom(activeRoom ?? null);
      setLoaded(true);
    }

    const timer = window.setTimeout(() => {
      void loadRoom();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const title =
    mode === "owner"
      ? "بطاقة مالك الغرفة"
      : mode === "player"
        ? "دخول اللاعبين"
        : "بطاقات الغرفة";

  return (
    <main dir="rtl" className="print-page min-h-dvh bg-slate-100 px-4 py-6 text-slate-950">
      <PrintStyles />

      <div className="mx-auto grid w-full max-w-4xl gap-5">
        <div className="screen-actions grid gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <div>
            <p className="text-sm font-bold text-slate-500">الألغام</p>
            <h2 className="text-2xl font-black">{title}</h2>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-12 rounded-2xl bg-slate-950 px-5 font-black text-white"
          >
            طباعة
          </button>
          <Link
            href={`/supervisor-room?room=${room?.id ?? ""}`}
            className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 font-black text-slate-700"
          >
            رجوع لغرفة المشرف
          </Link>
        </div>

        {!loaded ? (
          <p className="rounded-3xl bg-white p-5 text-center font-black shadow-sm ring-1 ring-slate-200">
            جاري تحميل البطاقة...
          </p>
        ) : null}

        {loaded && !room ? (
          <p className="rounded-3xl bg-white p-5 text-center font-black text-rose-700 shadow-sm ring-1 ring-rose-100">
            لم يتم العثور على الغرفة
          </p>
        ) : null}

        {room ? (
          <section className={mode === "both" ? "grid gap-8 md:grid-cols-2" : "mx-auto grid w-full max-w-xl"}>
            {mode === "owner" || mode === "both" ? <PrintCard kind="owner" room={room} /> : null}
            {mode === "player" || mode === "both" ? <PrintCard kind="player" room={room} /> : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
