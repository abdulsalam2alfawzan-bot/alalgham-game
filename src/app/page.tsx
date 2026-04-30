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
        <ActionLink href="/owner" variant="owner">
          دخول مالك الغرفة
        </ActionLink>
        <ActionLink href="/join" variant="player">
          دخول لاعب
        </ActionLink>
      </section>

      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
        نسخة تجريبية — البيانات محلية أو سحابية حسب الإعداد.
      </p>

      <section className="grid gap-3 sm:grid-cols-3">
        {["من 2 إلى 4 فرق", "كل فريق يبدأ بـ 1000 نقطة", "خطأ اللغم يخصم 500"].map((rule) => (
          <p key={rule} className="rounded-3xl bg-white p-4 text-sm font-black leading-6 text-slate-700 shadow-sm ring-1 ring-slate-200">
            {rule}
          </p>
        ))}
      </section>
    </PageShell>
  );
}
