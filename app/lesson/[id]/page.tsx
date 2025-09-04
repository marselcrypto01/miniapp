'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LessonPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const n = Number(id || 1);

  const goPrev = () => n > 1 && router.push(`/lesson/${n - 1}`);
  const goNext = () => router.push(`/lesson/${n + 1}`);
  const goList = () => router.push('/');

  return (
    <main className="mx-auto w-full max-w-[430px] px-4 py-4">
      {/* верхняя навигация — кнопки по краям, заголовок по центру */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-[var(--border)]"
          style={{ background: 'var(--surface)', color: 'var(--fg)' }}
        >
          <span>←</span> <span className="text-sm font-semibold">Назад</span>
        </button>

        <div className="text-[17px] sm:text-lg font-bold text-center flex-1">
          Урок {n}
        </div>

        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-[var(--border)]"
          style={{ background: 'var(--surface)', color: 'var(--fg)' }}
        >
          <span>🏠</span> <span className="text-sm font-semibold">На главную</span>
        </button>
      </div>

      {/* карточка с видео */}
      <div className="rounded-2xl border border-[var(--border)] p-4 mb-3" style={{ background: 'var(--surface)' }}>
        <div className="font-semibold">🎬 Видео-урок #{n}</div>
        <div className="mt-3 h-40 rounded-xl grid place-items-center border border-[var(--border)]"
             style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>
          Плеер (placeholder)
        </div>
      </div>

      {/* Табы: 3 кнопки = 1/3 ширины */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <button className="h-10 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--brand)', color: '#1c1c1c' }}>📄 Описание</button>
        <button className="h-10 rounded-xl font-semibold text-sm border border-[var(--border)]"
                style={{ background: 'var(--surface)', color: 'var(--fg)' }}>✅ Тест</button>
        <button className="h-10 rounded-xl font-semibold text-sm border border-[var(--border)]"
                style={{ background: 'var(--surface)', color: 'var(--fg)' }}>📎 Материалы</button>
      </div>

      {/* Контент «Описание» */}
      <div className="rounded-2xl border border-[var(--border)] p-4" style={{ background: 'var(--surface)' }}>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li>Базовая терминология и что такое крипта.</li>
          <li>Главная идея урока.</li>
          <li>3–5 ключевых тезисов.</li>
          <li>Что сделать после просмотра.</li>
        </ul>
      </div>

      {/* Нижняя панель навигации — всё в один ряд */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={goList}
          className="h-10 px-3 rounded-xl inline-flex items-center gap-2 text-sm border border-[var(--border)]"
          style={{ background: 'var(--surface)', color: 'var(--fg)' }}
        >
          📚 К списку
        </button>

        <button
          onClick={goPrev}
          disabled={n <= 1}
          className="h-10 px-3 rounded-xl inline-flex items-center gap-2 text-sm border border-[var(--border)] disabled:opacity-50"
          style={{ background: 'var(--surface)', color: 'var(--fg)' }}
        >
          ← Предыдущий
        </button>

        <button
          onClick={goNext}
          className="h-10 px-3 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"
          style={{ background: 'var(--brand)', color: '#1c1c1c' }}
        >
          Следующий →
        </button>

        <span
          className="ml-auto h-10 px-3 rounded-xl inline-flex items-center gap-2 text-sm font-semibold border border-[var(--border)]"
          style={{ background: 'color-mix(in oklab,#3cc25b 25%, var(--surface))', color: '#d7ffe1' }}
        >
          ✔ Пройдено
        </span>
      </div>
    </main>
  );
}
