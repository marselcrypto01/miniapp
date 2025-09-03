'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PresenceClient from '@/components/PresenceClient';
import {
  listLessons,
  getRandomDailyQuote,
  getUserProgress,
  saveUserProgress,
} from '@/lib/db';

/* ====================== локальные типы ====================== */
type Progress = { lesson_id: number; status: 'completed' | 'pending' };
type Lesson = { id: number; title: string; subtitle?: string | null };
type AchievementKey = 'first' | 'risk' | 'finisher' | 'simulator';
type Env = 'loading' | 'telegram' | 'browser';

/* ====================== иконки уроков ====================== */
const ICONS: Record<number, string> = {
  1: '🧠',
  2: '🎯',
  3: '🛡️',
  4: '⚠️',
  5: '🧭',
  6: '📚',
};

/* ===== запасные цитаты на случай офлайна БД ===== */
const QUOTES = [
  'Учись видеть возможности там, где другие видят шум.',
  'Успех любит дисциплину.',
  'Лучший риск — тот, который просчитан.',
  'Дорогу осилит идущий. Шаг за шагом.',
  'Малые действия каждый день сильнее больших рывков раз в месяц.',
];

/* ===== Уровни (без перков) ===== */
type LevelKey = 'novice' | 'bronze' | 'silver' | 'gold';
const LEVELS: Record<LevelKey, { title: string; threshold: number; icon: string }> = {
  novice: { title: 'Новичок', threshold: 0, icon: '🌱' },
  bronze: { title: 'Бронза', threshold: 40, icon: '🥉' },
  silver: { title: 'Серебро', threshold: 80, icon: '🥈' },
  gold: { title: 'Золото', threshold: 120, icon: '🥇' },
};
function computeXP(completedCount: number, ach: Record<AchievementKey, boolean>) {
  let xp = completedCount * 20;
  if (ach.first) xp += 5;
  if (ach.risk) xp += 5;
  if (ach.simulator) xp += 5;
  if (ach.finisher) xp += 10;
  return xp;
}
function computeLevel(xp: number): { key: LevelKey; nextAt: number | null; progressPct: number } {
  const order: LevelKey[] = ['novice', 'bronze', 'silver', 'gold'];
  let current: LevelKey = 'novice';
  for (const k of order) if (xp >= LEVELS[k].threshold) current = k;
  const idx = order.indexOf(current);
  const next = order[idx + 1];
  if (!next) return { key: current, nextAt: null, progressPct: 100 };
  const from = LEVELS[current].threshold;
  const to = LEVELS[next].threshold;
  const pct = Math.max(0, Math.min(100, Math.round(((xp - from) / (to - from)) * 100)));
  return { key: current, nextAt: to, progressPct: pct };
}

/* ===== uid, общий с PresenceClient ===== */
const UID_KEY = 'presence_uid';
function getClientUid(): string {
  let uid = '';
  try {
    uid = localStorage.getItem(UID_KEY) || '';
    if (!uid) {
      uid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(UID_KEY, uid);
    }
  } catch {}
  return uid || 'anonymous';
}

/* ====================== КОМПОНЕНТ ====================== */
export default function Home() {
  const router = useRouter();

  const [username, setUsername] = useState<string | null>(null);
  const [env, setEnv] = useState<Env>('loading'); // телега/браузер/ожидание

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [points, setPoints] = useState<number>(610);
  const [quote, setQuote] = useState<string>('');

  const [achievements, setAchievements] = useState<Record<AchievementKey, boolean>>({
    first: false,
    risk: false,
    finisher: false,
    simulator: false,
  });
  const [allCompleted, setAllCompleted] = useState(false);

  // ВАЖНО: флаг, что исходный прогресс ЗАГРУЖЕН (чтобы не перетирать нулями)
  const [progressLoaded, setProgressLoaded] = useState(false);

  /* ===== Telegram / демо-режим: корректная детекция SDK + initData ===== */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo') === '1' || process.env.NODE_ENV === 'development';

    let cancelled = false;

    const detect = async () => {
      // ждём появления SDK: до 10 попыток по 100мс
      for (let i = 0; i < 10; i++) {
        const wa = (window as any)?.Telegram?.WebApp;
        if (wa) {
          try {
            wa.ready();
            wa.expand?.();
            const hasInit = typeof wa.initData === 'string' && wa.initData.length > 0;
            if (!cancelled) {
              if (hasInit || demo) {
                setEnv('telegram');
                setUsername(wa.initDataUnsafe?.user?.username || (demo ? 'user' : null));
              } else {
                setEnv('browser');
              }
            }
            return;
          } catch {
            // пробуем ещё
          }
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      // SDK не появился
      if (!cancelled) {
        if (demo) {
          setEnv('telegram');
          setUsername('user');
        } else {
          setEnv('browser');
        }
      }
    };

    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ===== Уроки: БД → кэш → хардкод ===== */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listLessons();
        if (cancelled) return;

        const mapped: Lesson[] = rows
          .sort(
            (
              a: { order_index?: number | null; id: number },
              b: { order_index?: number | null; id: number }
            ) => (a.order_index ?? a.id) - (b.order_index ?? b.id)
          )
          .map((r) => ({ id: r.id, title: r.title ?? '', subtitle: r.subtitle ?? undefined }));

        setLessons(mapped);
        try {
          localStorage.setItem('lessons_cache', JSON.stringify(mapped));
        } catch {}
      } catch {
        const raw = localStorage.getItem('lessons_cache');
        if (raw) {
          try {
            setLessons(JSON.parse(raw) as Lesson[]);
          } catch {}
        } else {
          setLessons([
            { id: 1, title: 'Крипта простыми словами' },
            { id: 2, title: 'Арбитраж: как это работает' },
            { id: 3, title: 'Риски, мифы и страхи' },
            { id: 4, title: 'Главные ошибки новичков' },
            { id: 5, title: 'Итог: как двигаться дальше' },
            { id: 6, title: 'Дополнительная полезная информация', subtitle: 'Чек-листы, шпаргалки, ссылки…' },
          ]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ===== Цитата дня: БД → admin_quotes → запасной список ===== */
  useEffect(() => {
    (async () => {
      try {
        const q = await getRandomDailyQuote();
        if (q) {
          setQuote(q);
          return;
        }
      } catch {}
      try {
        const saved = JSON.parse(localStorage.getItem('admin_quotes') || '[]');
        const pool: string[] = Array.isArray(saved) && saved.length ? saved : QUOTES;
        setQuote(pool[Math.floor(Math.random() * pool.length)]);
      } catch {
        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
      }
    })();
  }, []);

  // обновляем список из LS при возвращении во вкладку
  useEffect(() => {
    const refresh = () => {
      try {
        const raw = localStorage.getItem('progress');
        if (raw) setProgress(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener('focus', refresh);
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  /* ===== Прогресс: БД → LS ===== */
  useEffect(() => {
    const uid = getClientUid();
    (async () => {
      try {
        const rows = await getUserProgress(uid);
        if (rows?.length) {
          const arr: Progress[] = rows.map((r) => ({
            lesson_id: Number(r.lesson_id),
            status: r.status === 'completed' ? 'completed' : 'pending',
          }));
          setProgress(arr);
          try {
            localStorage.setItem('progress', JSON.stringify(arr));
          } catch {}
        } else {
          const raw = localStorage.getItem('progress');
          if (raw) setProgress(JSON.parse(raw) as Progress[]);
        }
      } catch {
        const raw = localStorage.getItem('progress');
        if (raw) setProgress(JSON.parse(raw) as Progress[]);
      }

      // ачивки/флаг
      try {
        const ach = localStorage.getItem('achievements');
        const all = localStorage.getItem('all_completed') === 'true';
        if (ach) setAchievements(JSON.parse(ach));
        setAllCompleted(all);
      } catch {}

      // помечаем, что прогресс загружен
      setProgressLoaded(true);
    })();
  }, []);

  /* ===== Вычисления ===== */
  const isCompleted = (id: number) =>
    progress.find((p) => p.lesson_id === id)?.status === 'completed';

  const coreLessonsCount = 5;
  const completedCount = progress.filter((p) => p.status === 'completed' && p.lesson_id <= 5).length;
  const bar = Math.min(100, Math.round((completedCount / coreLessonsCount) * 100));

  /* ===== Сохранение прогресса (LS + мягкая синхронизация в БД) ===== */
  useEffect(() => {
    if (!progressLoaded) return;

    const next = { ...achievements };
    if (isCompleted(1)) next.first = true;
    if (isCompleted(3)) next.risk = true;
    if (completedCount === coreLessonsCount) next.finisher = true;

    setAchievements(next);
    try {
      localStorage.setItem('achievements', JSON.stringify(next));
    } catch {}

    const finished = completedCount === coreLessonsCount;
    setAllCompleted(finished);
    try {
      localStorage.setItem('all_completed', finished ? 'true' : 'false');
    } catch {}

    try {
      localStorage.setItem('progress', JSON.stringify(progress));
    } catch {}

    (async () => {
      try {
        await saveUserProgress(getClientUid(), progress);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, progressLoaded]);

  /* ===== «Отметить как пройдено» (демо на главной) ===== */
  const complete = (lessonId: number) => {
    setProgress((prev) => {
      const exists = prev.find((p) => p.lesson_id === lessonId);
      return exists
        ? prev.map((p) => (p.lesson_id === lessonId ? { ...p, status: 'completed' } : p))
        : [...prev, { lesson_id: lessonId, status: 'completed' }];
    });
    setPoints((x) => x + 10);
  };

  /* ===== Уровень ===== */
  const xp = computeXP(completedCount, achievements);
  const { key: levelKey, progressPct } = computeLevel(xp);
  const level = LEVELS[levelKey];

  /* ===== Метки ачивок ===== */
  const markers = [
    { key: 'first', at: 20, icon: '💸', title: 'Первый арбитраж (после 1 урока)', achieved: achievements.first },
    { key: 'fast',  at: 60, icon: '⚡', title: 'Быстрый старт (3 урока)', achieved: completedCount >= 3 },
    { key: 'risk',  at: 60, icon: '🛡️', title: 'Холодная голова (урок 3)', achieved: achievements.risk },
    { key: 'fin',   at: 100, icon: '🚀', title: 'Финалист (все уроки)', achieved: achievements.finisher },
    { key: 'sim',   at: 100, icon: '📊', title: 'Симуляторщик (калькулятор)', achieved: achievements.simulator },
  ] as const;

  /* ===== Гейт: что показывать ===== */
  if (env === 'loading') {
    return null; // не мигаем плашкой
  }

  if (env === 'browser') {
    return (
      <main className="flex h-screen items-center justify-center px-4">
        <div className="glass p-6 text-center">
          <h1 className="text-xl font-bold">Открой приложение в Telegram</h1>
        </div>
      </main>
    );
  }

  // env === 'telegram'
  return (
    <main className="mx-auto max-w-xl px-4 py-5">
      {/* Presence: активность на главной */}
      <PresenceClient page="home" activity="Главная" progressPct={bar} />

      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Мини-курс по арбитражу
            <br />
            криптовалюты
          </h1>
          <div className="mt-2 h-[3px] w-24 rounded bg-[var(--brand)]" />
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="chip">
            <span>🏆</span>
            <span className="text-sm font-semibold">{points} очк.</span>
          </div>
          <div className="chip" title="Уровень по опыту">
            <span>{level.icon}</span>
            <span className="text-sm font-semibold">{level.title}</span>
          </div>
          <div className="w-28 h-1 rounded bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden">
            <div className="h-full bg-[var(--brand)]" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Приветствие + цитата */}
      <p className="text-sm text-[var(--muted)]">Привет, @{username || 'user'}!</p>
      <p className="mt-1 mb-2 text-sm italic text-[var(--muted)]">💡 {quote}</p>

      {/* Статус-бар */}
      <div className="mt-3">
        <div className="relative h-8 mb-2">
          {markers.map((m) => (
            <span
              key={m.key}
              title={m.title}
              className={`absolute -translate-x-1/2 grid place-items-center w-7 h-7 rounded-full text-[13px] ${
                m.achieved ? '' : 'opacity-45'
              }`}
              style={{
                left: `${m.at}%`,
                top: 0,
                background: 'color-mix(in oklab, var(--brand-200) 30%, transparent)',
                border: '1px solid color-mix(in oklab, var(--brand) 50%, var(--border))',
                boxShadow: 'var(--shadow)',
              }}
            >
              {m.icon}
            </span>
          ))}
        </div>

        <div className="progress">
          <div className="progress__bar" style={{ width: `${bar}%` }} />
        </div>

        <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--muted)]">
          <span>Пройдено: {completedCount}/{coreLessonsCount}</span>
          <span>Осталось: {Math.max(0, coreLessonsCount - completedCount)}</span>
        </div>
      </div>

      {/* Уроки */}
      <h2 className="mt-6 text-2xl font-bold">Уроки</h2>
      <div className="mt-3 space-y-3">
        {lessons.map((l) => {
          const done = isCompleted(l.id);
          const lockedExtra = l.id === 6 && !allCompleted;

          return (
            <div key={l.id} className="glass rounded-[18px] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded bg-[var(--brand-200)] border border-[var(--brand)] text-xl">
                    {ICONS[l.id] ?? '📘'}
                  </div>
                  <div>
                    <div className="text-[17px] font-semibold">{l.title}</div>
                    {l.subtitle && <div className="text-sm text-[var(--muted)]">{l.subtitle}</div>}
                  </div>
                </div>

                <div className="hidden text-sm text-[var(--muted)] sm:block">
                  {done ? '✅ Пройден' : lockedExtra ? '🔒 Закрыто' : '⏳ Не пройден'}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  className="btn-brand"
                  onClick={() => router.push(`/lesson/${l.id}`)}
                  disabled={lockedExtra}
                  title={lockedExtra ? 'Откроется после прохождения всех уроков' : 'Открыть урок'}
                >
                  {lockedExtra ? 'Закрыто' : 'Смотреть'}
                </button>

                {!done && l.id !== 6 && (
                  <button className="btn" onClick={() => complete(l.id)}>
                    Отметить как пройдено
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <h2 className="mt-6 text-2xl font-bold">FAQ</h2>
      <div className="mt-3 space-y-2">
        {[
          { q: 'А что если карту заблокируют?', a: 'Есть методы подготовки карт и распределения лимитов. Это часть арбитража — учимся обходить риски.' },
          { q: 'Сколько можно зарабатывать?', a: 'В среднем ученики начинают с +70k в месяц, но всё зависит от времени и капитала.' },
          { q: 'А если я ничего не понимаю в крипте?', a: 'Курс построен для новичков: от простого к сложному. Разберётся любой.' },
          { q: 'Почему арбитраж лучше трейдинга?', a: 'Тут меньше рисков и нет зависимости от графиков. Зарабатываешь на разнице курсов.' },
        ].map((f, i) => (
          <details key={i} className="glass rounded-[14px] p-3">
            <summary className="cursor-pointer font-semibold">{f.q}</summary>
            <p className="mt-2 text-sm text-[var(--muted)]">{f.a}</p>
          </details>
        ))}
      </div>

      <p className="mt-6 pb-24 text-center text-xs text-[var(--muted)]">@your_bot</p>
    </main>
  );
}
