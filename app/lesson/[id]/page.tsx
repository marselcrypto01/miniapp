'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';

/** Совпадает с мини-баром */
const WRAP = 'mx-auto max-w-[360px] px-4';

type Tab = 'desc' | 'test' | 'materials';

const TITLES: Record<number, string> = {
  1: 'Крипта без сложных слов',
  2: 'Арбитраж: простой способ зарабатывать',
  3: 'Риски и страхи: как не потерять на старте',
  4: '5 ошибок новичков, которые убивают заработок',
  5: 'Финал: твой первый шаг в мир крипты',
};

export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id || 1);

  const [tab, setTab] = React.useState<Tab>('desc');

  const title = `Урок ${id}. ${TITLES[id] ?? 'Видео-урок'}`;

  return (
    <main className={`${WRAP} py-4`}>
      {/* Заголовок, как на главной */}
      <header className="mb-3">
        <h1 className="text-2xl font-extrabold tracking-tight leading-[1.1]">{title}</h1>
        <div className="mt-2 h-[3px] w-24 rounded bg-[var(--brand)]" />
      </header>

      {/* Плеер */}
      <section className="glass p-4 rounded-2xl mb-3 w-full">
        <div className="text-[15px] font-semibold mb-3">🎬 Видео-урок #{id}</div>
        <div className="h-44 rounded-xl border border-[var(--border)] grid place-items-center text-[var(--muted)] w-full">
          Плеер (placeholder)
        </div>
      </section>

      {/* Табы: 3 равные, 40–44px, бордер между ними */}
      <div className="w-full mb-3">
        <div className="grid grid-cols-3 rounded-xl overflow-hidden border border-[var(--border)]">
          {[
            { key: 'desc' as const, label: 'Описание', icon: '📝' },
            { key: 'test' as const, label: 'Тест', icon: '✅' },
            { key: 'materials' as const, label: 'Материалы', icon: '📎' },
          ].map((t, i) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`h-11 w-full flex items-center justify-center gap-1.5 text-sm
                  ${active ? 'bg-[var(--brand)] text-black' : 'bg-[var(--surface)] text-[var(--fg)]'}
                  ${i !== 0 ? 'border-l border-[var(--border)]' : ''}`}
                aria-pressed={active}
              >
                <span>{t.icon}</span>
                <span className="whitespace-nowrap">{t.label}</span>
              </button>
            );
          })}
        </div>
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
          Мини-квиз по уроку (заглушка).
        </section>
      )}
      {tab === 'materials' && (
        <section className="glass p-4 rounded-2xl w-full text-sm text-[var(--muted)]">
          Дополнительные материалы и ссылки (заглушка).
        </section>
      )}

      {/* Нижняя навигация — одна линия, общая высота 44–48px */}
      <div className="mt-4 grid grid-cols-[auto_auto_1fr_1fr_auto] gap-2 w-full">
        {/* Вторичные */}
        <button
          onClick={() => router.push('/courses')}
          className="px-3 h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center gap-2 text-sm"
          title="К списку уроков"
        >
          <span>📚</span><span className="whitespace-nowrap">К списку</span>
        </button>

        <button
          onClick={() => router.push('/')}
          className="px-3 h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center gap-2 text-sm"
          title="На главную"
        >
          <span>🏠</span><span className="whitespace-nowrap">На главную</span>
        </button>

        {/* Основные, одинаковой ширины */}
        <button
          onClick={() => id > 1 && router.push(`/lesson/${id - 1}`)}
          disabled={id <= 1}
          className="h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          title="Предыдущий"
        >
          <span>←</span><span className="whitespace-nowrap">Предыдущий</span>
        </button>

        <button
          onClick={() => router.push(`/lesson/${id + 1}`)}
          className="h-11 rounded-xl bg-[var(--brand)] text-black font-semibold text-sm flex items-center justify-center gap-2"
          title="Следующий"
        >
          <span className="whitespace-nowrap">Следующий</span><span>→</span>
        </button>

        {/* Бейдж статуса (не кнопка) */}
        <div className="px-3 h-11 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,green 45%,var(--surface))] text-black font-semibold grid place-items-center text-sm">
          <span className="whitespace-nowrap">✔ Пройдено</span>
        </div>
      </div>

      <div className="pb-24" />
    </main>
  );
}
