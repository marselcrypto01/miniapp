'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';

/** Тот же контейнер, что у нижнего бара */
const WRAP = 'mx-auto max-w-xl px-4';

export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id || 1);

  return (
    <main className={`${WRAP} py-4`}>
      {/* Верхняя навигация */}
      <div className="flex items-center justify-between gap-2 mb-3 w-full">
        <button onClick={() => router.back()} className="px-3 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-2 text-sm shrink-0">
          <span>←</span><span className="font-semibold">Назад</span>
        </button>
        <div className="text-sm font-extrabold opacity-80 text-center grow">Урок {id}</div>
        <button onClick={() => router.push('/')} className="px-3 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-2 text-sm shrink-0">
          <span>🏠</span><span className="font-semibold">На главную</span>
        </button>
      </div>

      {/* Плеер */}
      <section className="glass p-4 rounded-2xl mb-3 w-full">
        <div className="text-[15px] font-semibold mb-3">🎬 Видео-урок #{id}</div>
        <div className="h-44 rounded-xl border border-[var(--border)] grid place-items-center text-[var(--muted)] w-full">
          Плеер (placeholder)
        </div>
      </section>

      {/* Табы */}
      <div className="grid grid-cols-3 gap-2 mb-3 w-full">
        <button className="h-9 rounded-xl border border-[var(--border)] bg-[var(--brand)] text-black font-semibold text-sm flex items-center justify-center gap-1.5">
          <span>📝</span><span>Описание</span>
        </button>
        <button className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-semibold text-sm flex items-center justify-center gap-1.5">
          <span>✅</span><span>Тест</span>
        </button>
        <button className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-semibold text-sm flex items-center justify-center gap-1.5">
          <span>📎</span><span>Материалы</span>
        </button>
      </div>

      {/* Контент «Описание» */}
      <section className="glass p-4 rounded-2xl w-full">
        <ul className="list-disc pl-5 space-y-2 text-[14px]">
          <li>Базовая терминология и что такое крипта.</li>
          <li>Главная идея урока.</li>
          <li>3–5 ключевых тезисов.</li>
          <li>Что сделать после просмотра.</li>
        </ul>
      </section>

      {/* Нижняя навигация — стрелки */}
      <div className="mt-4 grid grid-cols-[auto_1fr_1fr_auto] gap-2 w-full">
        <button
          onClick={() => router.push('/')}
          className="px-3 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] grid place-items-center text-sm"
          title="К списку уроков"
        >
          📚
        </button>

        <button
          onClick={() => id > 1 && router.push(`/lesson/${id - 1}`)}
          disabled={id <= 1}
          className="h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] font-semibold text-sm disabled:opacity-50 grid place-items-center"
          title="Предыдущий"
        >
          ←
        </button>

        <button
          onClick={() => router.push(`/lesson/${id + 1}`)}
          className="h-10 rounded-xl bg-[var(--brand)] text-black font-semibold text-sm grid place-items-center"
          title="Следующий"
        >
          →
        </button>

        <div
          className="px-3 h-10 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,green 45%,var(--surface))] text-black font-semibold grid place-items-center text-sm"
          title="Отметить пройдено"
        >
          ✔
        </div>
      </div>

      <div className="pb-24" />
    </main>
  );
}
