'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { saveUserProgress } from '@/lib/db';

const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';
const CORE_LESSONS_COUNT = 5; // <= ограничение «Следующий» не идёт дальше 5

type Tab = 'desc' | 'test' | 'goodies';
type Progress = { lesson_id: number; status: 'completed' | 'pending' };

const TITLES: Record<number, string> = {
  1: 'Крипта без сложных слов',
  2: 'Арбитраж: простой способ зарабатывать',
  3: 'Риски и страхи: как не потерять на старте',
  4: '5 ошибок новичков, которые убивают заработок',
  5: 'Финал: твой первый шаг в мир крипты',
};

const UID_KEY = 'presence_uid';
function getClientUid(): string {
  try {
    const from = localStorage.getItem(UID_KEY);
    if (from) return from;
    const gen = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(UID_KEY, gen);
    return gen;
  } catch { return 'anonymous'; }
}

export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id || 1);

  const [tab, setTab] = React.useState<Tab>('desc');
  const [done, setDone] = React.useState<boolean>(false);

  const title = `Урок ${id}. ${TITLES[id] ?? 'Видео-урок'}`;

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('progress');
      if (!raw) return;
      const arr = JSON.parse(raw) as Progress[];
      const st = arr.find(p => p.lesson_id === id)?.status === 'completed';
      setDone(!!st);
    } catch {}
  }, [id]);

  const toggleDone = async () => {
    try {
      const raw = localStorage.getItem('progress');
      let arr: Progress[] = raw ? JSON.parse(raw) : [];
      const idx = arr.findIndex(p => p.lesson_id === id);
      const status: 'completed' | 'pending' = done ? 'pending' : 'completed';
      if (idx >= 0) arr[idx].status = status; else arr.push({ lesson_id: id, status });
      localStorage.setItem('progress', JSON.stringify(arr));
      setDone(!done);
      try { await saveUserProgress(getClientUid(), arr); } catch {}
    } catch {}
  };

  const canGoPrev = id > 1;
  const canGoNext = id < CORE_LESSONS_COUNT; // <- не даём уйти на 6-й

  return (
    <main className={`${WRAP} py-4`}>
      <header className="mb-3 w-full">
        <h1 className="text-2xl font-extrabold tracking-tight leading-[1.1]">{title}</h1>
        <div className="mt-2 h-[3px] w-24 rounded bg-[var(--brand)]" />
      </header>

      <section className="glass p-4 rounded-2xl mb-3 w-full">
        <div className="text-[15px] font-semibold mb-3">🎬 Видео-урок #{id}</div>
        <div className="h-44 rounded-xl border border-[var(--border)] grid place-items-center text-[var(--muted)] w-full">
          Плеер (placeholder)
        </div>
      </section>

      {/* Табы: Описание / Тест / Полезное */}
      <div className="w-full mb-3">
        <div className="grid grid-cols-3 rounded-xl overflow-hidden border border-[var(--border)]">
          {[
            { key: 'desc' as const, label: 'Описание', icon: '📝' },
            { key: 'test' as const, label: 'Тест', icon: '✅' },
            { key: 'goodies' as const, label: 'Полезное', icon: '📎' },
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

      {/* Контент табов (пример) */}
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
      {tab === 'goodies' && (
        <section className="glass p-4 rounded-2xl w-full text-sm text-[var(--muted)]">
          Подборка полезных материалов и ссылок по теме урока.
        </section>
      )}

      {/* Нижняя навигация: 4 одинаковые кнопки; «Следующий» заблокирован на 5-м */}
      <div className="mt-4 w-full grid grid-cols-2 min-[420px]:grid-cols-4 gap-2">
        <button
          onClick={() => canGoPrev && router.push(`/lesson/${id - 1}`)}
          disabled={!canGoPrev}
          className="h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)]
                     font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 w-full"
          title="Предыдущий"
        >
          <span>←</span>
          <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">Предыдущий</span>
        </button>

        <button
          onClick={() => canGoNext && router.push(`/lesson/${id + 1}`)}
          disabled={!canGoNext}
          className="h-11 rounded-xl font-semibold text-sm w-full flex items-center justify-center gap-2
                     disabled:opacity-50
                     bg-[var(--brand)] text-black"
          title="Следующий"
        >
          <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">Следующий</span>
          <span>→</span>
        </button>

        <button
          onClick={() => router.push('/')}
          className="h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)]
                     flex items-center justify-center gap-2 text-sm w-full"
          title="На главную"
        >
          <span>🏠</span>
          <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">На главную</span>
        </button>

        <button
          onClick={toggleDone}
          className={`h-11 rounded-xl font-semibold text-sm w-full flex items-center justify-center gap-2 border
            ${done
              ? 'bg-[color-mix(in_oklab,green_45%,var(--surface))] text-black border-[var(--border)]'
              : 'bg-[var(--surface)] text-[var(--fg)] border-[var(--border)]'}`}
          title="Отметить как пройдено"
        >
          <span>{done ? '✅' : '☑️'}</span>
          <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">Пройдено</span>
        </button>
      </div>

      <div className="pb-24" />
    </main>
  );
}
