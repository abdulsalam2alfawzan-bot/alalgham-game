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
        <ActionLink href="/owner" variant="secondary">
          دخول مالك الغرفة
        </ActionLink>
        <ActionLink href="/join" variant="light">
          دخول لاعب
        </ActionLink>
      </section>

      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
        نسخة تجريبية — البيانات محلية أو سحابية حسب الإعداد.
      </p>

      <section className="grid gap-2 rounded-3xl bg-white p-4 text-sm font-bold leading-6 text-slate-600 shadow-sm ring-1 ring-slate-200">
        <p>من 2 إلى 4 فرق</p>
        <p>كل فريق يبدأ بـ 1000 نقطة</p>
        <p>خطأ اللغم يخصم 500</p>
      </section>
    </PageShell>
  );
}
