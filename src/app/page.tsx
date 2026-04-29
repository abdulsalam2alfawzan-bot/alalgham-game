"use client";

import { ActionLink, PageShell } from "./_components/game-ui";

export default function Home() {
  return (
    <PageShell
      title="الألغام"
      description="اختر مربعك، جاوب صح، واجمع النقاط… أو يقع فريقك في اللغم."
      showOrganizerLink={false}
    >
      <section className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/activate" variant="secondary">
          إنشاء غرفة
        </ActionLink>
        <ActionLink href="/join" variant="light">
          دخول لاعب
        </ActionLink>
      </section>

      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
        نسخة تجريبية — البيانات محلية للتجربة فقط.
      </p>
    </PageShell>
  );
}
