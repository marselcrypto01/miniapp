'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';

const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';

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
      {/* Заголовок */}
      <header className="mb-3 w-full">
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

      {/* Табы */}
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
                className={`min-h-11 h-auto py-2 w-full flex items-center justify-center gap-1.5
                  text-sm ${active ? 'bg-[var(--brand)] text-black' : 'bg-[var(--surface)] text-[var(--fg)]'}
                  ${i !== 0 ? 'border-l border-[var(--border)]' : ''}`}
                aria-pressed={active}
              >
                <span>{t.icon}</span>
                <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">{t.label}</span>
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

      {/* Нижняя навигация (адаптивная grid) */}
      <div
        className="mt-4 w-full grid gap-2"
        style={{ gridTemplateColumns: '1fr auto' }}
      >
        {/* На главную + Пройдено (1-я строка) */}
        <button
          onClick={() => router.push('/')}
          className="px-3 h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)]
                     flex items-center justify-center gap-2 text-sm w-full"
          title="На главную"
        >
          <span>🏠</span>
          <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">На главную</span>
        </button>

        <div className="px-3 h-11 rounded-xl border border-[var(--border)]
                        bg-[color-mix(in_oklab,green_45%,var(--surface))] text-black font-semibold
                        grid place-items-center text-sm whitespace-nowrap">
          ✔ Пройдено
        </div>

        {/* Предыдущий / Следующий — во всю ширину (2-я строка) */}
        <button
          onClick={() => id > 1 && router.push(`/lesson/${id - 1}`)}
          disabled={id <= 1}
          className="col-span-2 h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)]
                     font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          title="Предыдущий"
        >
          <span>←</span>
          <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">Предыдущий</span>
        </button>

        <button
          onClick={() => router.push(`/lesson/${id + 1}`)}
          className="col-span-2 h-11 rounded-xl bg-[var(--brand)] text-black font-semibold text-sm
                     flex items-center justify-center gap-2"
          title="Следующий"
        >
          <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">Следующий</span>
          <span>→</span>
        </button>
      </div>

      <div className="pb-24" />
    </main>
  );
}
