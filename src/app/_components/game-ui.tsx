"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { mockBoard, room, teams } from "../_data/game";
import type { BoardSquare, Team } from "../_data/game";

type PageShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  showOrganizerLink?: boolean;
  children: ReactNode;
};

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "light" | "danger";
  className?: string;
};

const buttonStyles = {
  primary:
    "bg-slate-950 text-white shadow-sm hover:bg-slate-800 focus-visible:outline-slate-950",
  secondary:
    "bg-teal-600 text-white shadow-sm hover:bg-teal-700 focus-visible:outline-teal-700",
  light:
    "border border-slate-200 bg-white text-slate-950 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:outline-rose-700",
};

export function PageShell({
  eyebrow = "الألغام",
  title,
  description,
  showOrganizerLink = false,
  children,
}: PageShellProps) {
  return (
    <main className="min-h-dvh bg-[#f7f7fb] px-4 py-5 text-slate-950 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex min-h-12 items-center gap-2 rounded-full bg-white px-3 text-sm font-black text-slate-950 shadow-sm ring-1 ring-slate-200"
            aria-label="العودة للرئيسية"
          >
            <Image
              src="/mine-mark.svg"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9"
              aria-hidden="true"
            />
            <span>الألغام</span>
          </Link>
          {showOrganizerLink ? (
            <Link
              href="/supervisor-room"
              className="min-h-12 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"
            >
              غرفة المشرف
            </Link>
          ) : null}
        </header>

        <section className="rounded-[2rem] bg-white px-5 py-6 shadow-sm ring-1 ring-slate-200 sm:px-8">
          <p className="text-sm font-bold text-teal-700">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              {description}
            </p>
          ) : null}
        </section>

        {children}
      </div>
    </main>
  );
}

export function ActionLink({
  href,
  children,
  variant = "primary",
  className = "",
}: ActionLinkProps) {
  return (
    <Link
      href={href}
      className={`flex min-h-14 items-center justify-center rounded-2xl px-5 py-4 text-center text-lg font-black transition ${buttonStyles[variant]} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
    >
      {children}
    </Link>
  );
}

export function Panel({
  title,
  children,
  tone = "white",
}: {
  title?: string;
  children: ReactNode;
  tone?: "white" | "dark" | "soft";
}) {
  const toneClass =
    tone === "dark"
      ? "rounded-3xl bg-slate-950 p-5 text-white"
      : tone === "soft"
        ? "rounded-3xl bg-teal-50 p-5 text-slate-950"
        : "text-slate-950";

  return (
    <section className={toneClass}>
      {title ? <h2 className="text-xl font-black">{title}</h2> : null}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

export function InfoGrid({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <p className="text-sm font-bold text-slate-500">{item.label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function TeamList({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} compact={compact} />
      ))}
    </div>
  );
}

export function TeamCard({
  team,
  compact = false,
}: {
  team: Team;
  compact?: boolean;
}) {
  return (
    <article className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`h-4 w-4 rounded-full ${team.color}`} />
          <div>
            <h3 className="font-black text-slate-950">{team.name}</h3>
            <p className="text-sm text-slate-500">القائد: {team.captain}</p>
          </div>
        </div>
        <strong className="rounded-2xl bg-slate-100 px-3 py-2 text-slate-950">
          {team.score}
        </strong>
      </div>
      {!compact ? (
        <p className="mt-4 text-sm leading-7 text-slate-600">
          {team.players.join("، ")}
        </p>
      ) : null}
    </article>
  );
}

export function BoardGrid({
  squares = mockBoard,
  showValues = false,
}: {
  squares?: BoardSquare[];
  showValues?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {squares.map((square) => (
        <div
          key={square.id}
          className="flex aspect-square items-center justify-center rounded-3xl bg-slate-950 p-2 text-center text-lg font-black text-white shadow-sm"
        >
          {showValues ? square.label : `مربع ${square.id}`}
        </div>
      ))}
    </div>
  );
}

export function RoomBadge({
  code = room.playerCode,
  label = "كود اللاعبين",
}: {
  code?: string;
  label?: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
      <p className="text-sm font-bold text-teal-200">{label}</p>
      <p className="mt-2 text-5xl font-black tracking-[0.4em]">{code}</p>
    </div>
  );
}
