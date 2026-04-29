"use client";

import { ActionLink, PageShell } from "../_components/game-ui";
import { PlayBoard } from "../_components/play-board";

export default function PlayPage() {
  return (
    <PageShell
      eyebrow="اللعب"
      title="لوحة اللعب"
      description="اختر الفريق والمربع، ثم سجل الإجابة بضغطة واحدة."
    >
      <PlayBoard />

      <section className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/organizer" variant="light">
          لوحة التحكم
        </ActionLink>
        <ActionLink href="/results" variant="secondary">
          النتائج
        </ActionLink>
      </section>
    </PageShell>
  );
}
