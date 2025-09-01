'use client';

import { useEffect, useState } from "react";

export default function CoursesPage() {
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem("all_completed") === "true";
      setLocked(!v);
    } catch {}
  }, []);

  const Card = ({
    title, desc, emoji,
  }: { title: string; desc: string; emoji: string }) => (
    <div className="glass p-4 rounded-[18px]">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center text-xl w-9 h-9 rounded bg-[var(--brand-200)] border border-[var(--brand)]">
          {emoji}
        </div>
        <div>
          <div className="text-[17px] font-semibold">{title}</div>
          <div className="text-sm text-[var(--muted)]">{desc}</div>
        </div>
      </div>

      <div className="mt-3">
        <button
          className="btn-brand"
          disabled={locked}
          onClick={() => alert("Заявка отправлена ✨")}
          style={locked ? { opacity: .6, cursor: "not-allowed" } : undefined}
        >
          {locked ? "Доступ после прохождения курса" : "Оставить заявку"}
        </button>
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-xl px-4 py-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Следующий шаг</h1>
      <div className="mt-2 h-[3px] w-24 rounded bg-[var(--brand)]" />

      <p className="mt-3 text-sm text-[var(--muted)]">
        После завершения базового курса доступны расширенные программы обучения.
      </p>

      <div className="mt-4 space-y-3">
        <Card emoji="💼" title="Индивидуальное обучение" desc="Персональный разбор и сопровождение." />
        <Card emoji="👥" title="Групповое обучение" desc="Работа в группе, созвоны и практика." />
        <div className="glass p-4 rounded-[18px]">
          <div className="text-[17px] font-semibold">Бесплатные материалы</div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Чек-листы, шаблоны, разборы — откроются автоматически после прохождения курса.
          </p>
        </div>
      </div>

      <p className="mt-6 pb-24 text-center text-xs text-[var(--muted)]">@your_bot</p>
    </main>
  );
}
