// app/lesson/[id]/page.tsx
'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import PresenceClient from '@/components/PresenceClient';
import TestComponent from '@/components/TestComponent';
import { initSupabaseFromTelegram, saveUserProgress, getLessonMaterials, type DbLessonMaterial } from '@/lib/db';

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

/* === user-scoped localStorage namespace — как на главной === */
function getTgIdSync(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wa = (window as any)?.Telegram?.WebApp;
    const id = wa?.initDataUnsafe?.user?.id;
    return (id ?? null)?.toString?.() ?? null;
  } catch {
    return null;
  }
}
function ns(key: string): string {
  const id = getTgIdSync();
  return id ? `${key}:tg_${id}` : `${key}:anon`;
}

export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id || 1);

  const [tab, setTab] = React.useState<Tab>('desc');
  const [done, setDone] = React.useState<boolean>(false);
  const [progress, setProgress] = React.useState<Progress[]>([]);
  const [authReady, setAuthReady] = React.useState(false);
  const [materials, setMaterials] = React.useState<DbLessonMaterial[] | null>(null);
  const [loadingMaterials, setLoadingMaterials] = React.useState(false);

  const title = `Урок ${id}. ${TITLES[id] ?? 'Видео-урок'}`;

  // Готовим tg-auth один раз, чтобы saveUserProgress имел client_id
  React.useEffect(() => {
    let off = false;
    (async () => {
      try {
        await initSupabaseFromTelegram();
      } catch {
        // ничего — урок всё равно откроется, просто синк в БД может отложиться
      } finally {
        if (!off) setAuthReady(true);
      }
    })();
    return () => {
      off = true;
    };
  }, []);

  // Загружаем локальный (user-scoped) прогресс и статус текущего урока
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(ns('progress'));
      const arr: Progress[] = raw ? JSON.parse(raw) : [];
      setProgress(Array.isArray(arr) ? arr : []);
      const st = arr.find((p) => p.lesson_id === id)?.status === 'completed';
      setDone(!!st);
    } catch {
      setProgress([]);
      setDone(false);
    }
  }, [id]);

  // Загружаем «Полезное» из Supabase
  React.useEffect(() => {
    let off = false;
    (async () => {
      setLoadingMaterials(true);
      try {
        const data = await getLessonMaterials(id);
        if (!off) setMaterials(data);
      } catch {
        if (!off) setMaterials([]);
      } finally {
        if (!off) setLoadingMaterials(false);
      }
    })();
    return () => { off = true; };
  }, [id]);

  // Обновить локальный и серверный прогресс
  const persistProgress = async (arr: Progress[]) => {
    try {
      localStorage.setItem(ns('progress'), JSON.stringify(arr));
    } catch {}
    // Пытаемся сохранить в БД (если tg-auth готов). Ошибки — тихо.
    try {
      if (authReady) {
        await saveUserProgress(
          arr.map((x) => ({ lesson_id: Number(x.lesson_id), status: x.status }))
        );
      }
    } catch {}
  };

  const toggleDone = async () => {
    try {
      let arr = [...progress];
      const idx = arr.findIndex((p) => p.lesson_id === id);
      const status: 'completed' | 'pending' = done ? 'pending' : 'completed';
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], status };
      } else {
        arr.push({ lesson_id: id, status });
      }
      setProgress(arr);
      setDone(!done);
      await persistProgress(arr);
    } catch {}
  };

  const canGoPrev = id > 1;
  const canGoNext = id < CORE_LESSONS_COUNT; // <- не даём уйти на 6-й

  // Для Presence — примерно посчитаем общий прогресс по CORE_LESSONS_COUNT
  const completedCount = React.useMemo(
    () => progress.filter((p) => p.status === 'completed' && p.lesson_id <= CORE_LESSONS_COUNT).length,
    [progress]
  );
  const coursePct = Math.min(100, Math.round((completedCount / CORE_LESSONS_COUNT) * 100));

  return (
    <main className={`${WRAP} py-4`}>
      {/* Телеметрия (необязательно, но помогает админке видеть урок) */}
      <PresenceClient page="lesson" activity={`Урок ${id}`} lessonId={id} progressPct={coursePct} />

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
        <TestComponent 
          lessonId={id} 
          onTestComplete={(result) => {
            console.log('Test completed:', result);
            // Можно добавить дополнительную логику при завершении теста
          }}
        />
      )}
      {tab === 'goodies' && (
        <section className="glass p-4 rounded-2xl w-full">
          {/* Заголовок */}
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[15px] font-semibold">📎 Полезное к уроку</div>
            {loadingMaterials ? (
              <div className="text-xs text-[var(--muted)]">Загрузка…</div>
            ) : null}
          </div>

          {/* Список материалов */}
          {(!materials || materials.length === 0) && !loadingMaterials ? (
            <div className="text-sm text-[var(--muted)]">Пока пусто. Загляните позже.</div>
          ) : (
            <div className="grid gap-2">
              {(materials ?? []).map((m) => (
                <div key={m.id} className="rounded-xl border border-[var(--border)] p-3">
                  {m.kind === 'link' && (
                    <a href={m.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 group">
                      <div className="mt-[2px]">🔗</div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold group-hover:underline break-words">{m.title}</div>
                        <div className="text-xs text-[var(--muted)] break-words">{m.url}</div>
                      </div>
                    </a>
                  )}
                  {m.kind === 'image' && (
                    <div className="flex items-start gap-3">
                      <div className="mt-[2px]">🖼️</div>
                      <div className="min-w-0 w-full">
                        <div className="text-sm font-semibold mb-2 break-words">{m.title}</div>
                        <img src={m.url} alt={m.title} className="w-full rounded-lg border border-[var(--border)]" />
                      </div>
                    </div>
                  )}
                  {m.kind === 'text' && (
                    <div className="flex items-start gap-3">
                      <div className="mt-[2px]">📝</div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold mb-1 break-words">{m.title}</div>
                        <div className="text-sm text-[var(--fg)] whitespace-pre-wrap break-words">{m.url}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
