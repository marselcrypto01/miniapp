'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';

const WRAP = 'mx-auto max-w-xl px-4';

type Tab = 'desc' | 'test' | 'materials';

export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id || 1);

  const [tab, setTab] = React.useState<Tab>('desc');

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

      {/* Табы — кликабельные */}
      <div className="grid grid-cols-3 gap-2 mb-3 w-full">
        <button
          onClick={() => setTab('desc')}
          aria-pressed={tab === 'desc'}
          className={`h-9 rounded-xl border font-semibold text-sm flex items-center justify-center gap-1.5
            ${tab === 'desc' ? 'bg-[var(--brand)] text-black border-[var(--brand)]' : 'bg-[var(--surface)] border-[var(--border)]'}`}
        >
          <span>📝</span><span>Описание</span>
        </button>
        <button
          onClick={() => setTab('test')}
          aria-pressed={tab === 'test'}
          className={`h-9 rounded-xl border font-semibold text-sm flex items-center justify-center gap-1.5
            ${tab === 'test' ? 'bg-[var(--brand)] text-black border-[var(--brand)]' : 'bg-[var(--surface)] border-[var(--border)]'}`}
        >
          <span>✅</span><span>Тест</span>
        </button>
        <button
          onClick={() => setTab('materials')}
          aria-pressed={tab === 'materials'}
          className={`h-9 rounded-xl border font-semibold text-sm flex items-center justify-center gap-1.5
            ${tab === 'materials' ? 'bg-[var(--brand)] text-black border-[var(--brand)]' : 'bg-[var(--surface)] border-[var(--border)]'}`}
        >
          <span>📎</span><span>Материалы</span>
        </button>
      </div>

      {/* Контент табов */}
      {tab === 'desc' && (
        <section className="glass p-4 rounded-2xl w-full">
          <ul className="list-disc pl-5 space-y-2 text-[14px]">
            <li>Базовая терминология и что такое крипта.</li>
            <li>Главная идея урока.</li>
            <li>3–5 ключевых тезисов.</li>
            <li>Что сделать после просмотра.</li>
          </ul>
        </section>
      )}
      {tab === 'test' && (
        <section className="glass p-4 rounded-2xl w-full text-sm text-[var(--muted)]">
          Здесь будет мини-квиз по уроку.
        </section>
      )}
      {tab === 'materials' && (
        <section className="glass p-4 rounded-2xl w-full text-sm text-[var(--muted)]">
          Доп. материалы и ссылки.
        </section>
      )}

      {/* Нижняя навигация: только Предыдущий / Следующий / Пройдено */}
      <div className="mt-4 grid grid-cols-3 gap-2 w-full">
        <button
          onClick={() => id > 1 && router.push(`/lesson/${id - 1}`)}
          disabled={id <= 1}
          className="h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          title="Предыдущий урок"
        >
          <span>←</span><span>Предыдущий</span>
        </button>

        <button
          onClick={() => router.push(`/lesson/${id + 1}`)}
          className="h-11 rounded-xl bg-[var(--brand)] text-black font-semibold text-sm flex items-center justify-center gap-2"
          title="Следующий урок"
        >
          <span>Следующий</span><span>→</span>
        </button>

        <button
          className="h-11 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,green 45%,var(--surface))] text-black font-semibold text-sm flex items-center justify-center gap-2"
          title="Отметить как пройдено"
        >
          <span>✔</span><span>Пройдено</span>
        </button>
      </div>

      <div className="pb-24" />
    </main>
  );
}
