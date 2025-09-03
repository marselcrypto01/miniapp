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

/* ====================== константы очков/уроков ====================== */
const CORE_LESSONS_COUNT = 5;
const POINTS_PER_LESSON = 100;

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
  // XP для бейджа уровня (очки на экране считаем отдельно: 100 за урок).
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
  const [env, setEnv] = useState<Env>('loading');

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [quote, setQuote] = useState<string>('');

  const [achievements, setAchievements] = useState<Record<AchievementKey, boolean>>({
    first: false,
    risk: false,
    finisher: false,
    simulator: false,
  });
  const [allCompleted, setAllCompleted] = useState(false);

  const [progressLoaded, setProgressLoaded] = useState(false);

  /* ===== Telegram / демо-режим ===== */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo') === '1' || process.env.NODE_ENV === 'development';

    let cancelled = false;
    const detect = async () => {
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
          } catch {}
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      if (!cancelled) setEnv(demo ? 'telegram' : 'browser');
      if (demo) setUsername('user');
    };
    detect();
    return () => { cancelled = true; };
  }, []);

  /* ===== Уроки: БД → кэш → дефолты ===== */
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
        try { localStorage.setItem('lessons_cache', JSON.stringify(mapped)); } catch {}
      } catch {
        const raw = localStorage.getItem('lessons_cache');
        if (raw) {
          try { setLessons(JSON.parse(raw) as Lesson[]); } catch {}
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
    return () => { cancelled = true; };
  }, []);

  /* ===== Цитата дня ===== */
  useEffect(() => {
    (async () => {
      try {
        const q = await getRandomDailyQuote();
        if (q) { setQuote(q); return; }
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
          try { localStorage.setItem('progress', JSON.stringify(arr)); } catch {}
        } else {
          const raw = localStorage.getItem('progress');
          if (raw) setProgress(JSON.parse(raw) as Progress[]);
        }
      } catch {
        const raw = localStorage.getItem('progress');
        if (raw) setProgress(JSON.parse(raw) as Progress[]);
      }

      try {
        const ach = localStorage.getItem('achievements');
        const all = localStorage.getItem('all_completed') === 'true';
        if (ach) setAchievements(JSON.parse(ach));
        setAllCompleted(all);
      } catch {}

      setProgressLoaded(true);
    })();
  }, []);

  /* ===== Вычисления ===== */
  const isCompleted = (id: number) =>
    progress.find((p) => p.lesson_id === id)?.status === 'completed';

  const completedCount = progress.filter(
    (p) => p.status === 'completed' && p.lesson_id <= CORE_LESSONS_COUNT
  ).length;

  const bar = Math.min(100, Math.round((completedCount / CORE_LESSONS_COUNT) * 100));
  const points = completedCount * POINTS_PER_LESSON;

  /* ===== Сохранение прогресса ===== */
  useEffect(() => {
    if (!progressLoaded) return;

    const next = { ...achievements };
    if (isCompleted(1)) next.first = true;
    if (isCompleted(3)) next.risk = true;
    if (completedCount === CORE_LESSONS_COUNT) next.finisher = true;

    setAchievements(next);
    try { localStorage.setItem('achievements', JSON.stringify(next)); } catch {}

    const finished = completedCount === CORE_LESSONS_COUNT;
    setAllCompleted(finished);
    try { localStorage.setItem('all_completed', finished ? 'true' : 'false'); } catch {}

    try { localStorage.setItem('progress', JSON.stringify(progress)); } catch {}

    (async () => {
      try { await saveUserProgress(getClientUid(), progress); } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, progressLoaded, completedCount]);

  /* ===== Отметка прохождения (внутри уроков — позже; на главной не показываем) ===== */
  const complete = (lessonId: number) => {
    setProgress((prev) => {
      const exists = prev.find((p) => p.lesson_id === lessonId);
      return exists
        ? prev.map((p) => (p.lesson_id === lessonId ? { ...p, status: 'completed' } : p))
        : [...prev, { lesson_id: lessonId, status: 'completed' }];
    });
  };

  /* ===== Уровень (для бейджа) ===== */
  const xp = computeXP(completedCount, achievements);
  const { key: levelKey, progressPct } = computeLevel(xp);
  const level = LEVELS[levelKey];

  /* ===== Гейт ===== */
  if (env === 'loading') return null;

  if (env === 'browser') {
    return (
      <main className="flex h-screen items-center justify-center px-4">
        <div className="glass p-6 text-center">
          <h1 className="text-xl font-semibold leading-tight">Открой приложение в Telegram</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Ссылка с ботом откроет мини-приложение сразу.</p>
        </div>
      </main>
    );
  }

  // вспомогательная функция для «кругового прогресса»
  const ProgressRing = ({ size = 36, value }: { size?: number; value: number }) => {
    const clamped = Math.max(0, Math.min(100, value));
    const style: React.CSSProperties = {
      width: size,
      height: size,
      borderRadius: '9999px',
      background: `conic-gradient(var(--brand) ${clamped}%, transparent 0)`,
      padding: 2,
    };
    return (
      <div style={style}>
        <div
          className="grid place-items-center rounded-full"
          style={{
            width: '100%',
            height: '100%',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
          }}
        >
          <span className="text-base">🏅</span>
        </div>
      </div>
    );
  };

  // красивые чекпоинты (5 сегментов)
  const checkpoints = new Array(CORE_LESSONS_COUNT).fill(0).map((_, i) => (i + 1) * (100 / CORE_LESSONS_COUNT));
  const filledWidth = `${bar}%`;

  return (
    <main className="mx-auto w-full max-w-md sm:max-w-lg md:max-w-xl px-3 sm:px-4 py-4 sm:py-5">
      {/* Presence */}
      <PresenceClient page="home" activity="Главная" progressPct={bar} />

      {/* ======= ШАПКА ======= */}
      <header className="mb-5">
        {/* 1) Заголовок */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1]">
          Курс по заработку на крипте
        </h1>
        <div className="mt-2 h-[3px] w-24 rounded bg-[var(--brand)]" />

        {/* 2) Привет */}
        <p className="mt-3 text-[13px] sm:text-sm text-[var(--muted)]">
          Привет, @{username || 'user'}!
        </p>

        {/* 3) Цитата — настоящий блокquote */}
        <blockquote
          className="mt-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-2) 85%,transparent)] p-3 text-[13px] sm:text-sm italic text-[var(--muted)]"
          style={{
            boxShadow: 'var(--shadow)',
            borderLeftWidth: '4px',
            borderLeftColor: 'var(--brand)',
          }}
        >
          <span className="mr-1">“</span>{quote}<span className="ml-1">”</span>
        </blockquote>

        {/* 4) Очки + медаль + круговой прогресс вокруг медали */}
        <div className="mt-4 flex items-center gap-3">
          <div className="chip px-3 py-2">
            <span>🏆</span>
            <span className="text-sm font-semibold">{points} очк.</span>
          </div>
          <div className="chip px-3 py-2" title="Уровень по опыту">
            <span>{level.icon}</span>
            <span className="text-sm font-semibold">{level.title}</span>
          </div>

          {/* справа — «обводка» как прогресс по курсу */}
          <div className="ml-auto">
            <ProgressRing value={bar} />
          </div>
        </div>
      </header>

      {/* ======= 5) Новый статус-бар с сегментами ======= */}
      <section className="mt-2">
        <div className="relative h-3 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-[var(--brand)]"
            style={{ width: filledWidth, boxShadow: 'inset 0 0 10px rgba(0,0,0,.15)' }}
          />
          {/* чекпоинты */}
          {checkpoints.map((p, i) => (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-[var(--border)]"
              style={{
                left: `calc(${p}% - 5px)`,
                background: p <= bar ? 'var(--brand)' : 'var(--surface-1)',
              }}
              title={`Урок ${i + 1}`}
            />
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--muted)]">
          <span>Пройдено: {completedCount}/{CORE_LESSONS_COUNT}</span>
          <span>Осталось: {Math.max(0, CORE_LESSONS_COUNT - completedCount)}</span>
        </div>
      </section>

      {/* ======= 6) Уроки (только кнопка «Смотреть») ======= */}
      <h2 className="mt-6 text-xl sm:text-2xl font-bold">Уроки</h2>
      <div className="mt-3 space-y-3">
        {lessons.map((l) => {
          const lockedExtra = l.id === 6 && !allCompleted;

          return (
            <div key={l.id} className="glass rounded-[18px] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded bg-[var(--brand-200)] border border-[var(--brand)] text-xl">
                    {ICONS[l.id] ?? '📘'}
                  </div>
                  <div>
                    <div className="text-[16px] sm:text-[17px] font-semibold leading-tight">
                      {l.title}
                    </div>
                    {l.subtitle && (
                      <div className="text-[12.5px] sm:text-sm text-[var(--muted)] leading-snug">
                        {l.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  className="btn-brand whitespace-nowrap"
                  onClick={() => router.push(`/lesson/${l.id}`)}
                  disabled={lockedExtra}
                  title={lockedExtra ? 'Откроется после прохождения всех уроков' : 'Открыть урок'}
                >
                  {lockedExtra ? 'Закрыто' : 'Смотреть'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <h2 className="mt-6 text-xl sm:text-2xl font-bold">FAQ</h2>
      <div className="mt-3 space-y-2">
        {[
          { q: 'А что если карту заблокируют?', a: 'Есть методы подготовки карт и распределения лимитов. Это часть арбитража — учимся обходить риски.' },
          { q: 'Сколько можно зарабатывать?', a: 'В среднем ученики начинают с +70k в месяц, но всё зависит от времени и капитала.' },
          { q: 'А если я ничего не понимаю в крипте?', a: 'Курс построен для новичков: от простого к сложному. Разберётся любой.' },
          { q: 'Почему арбитраж лучше трейдинга?', a: 'Тут меньше рисков и нет зависимости от графиков. Зарабатываешь на разнице курсов.' },
        ].map((f, i) => (
          <details key={i} className="glass rounded-[14px] p-3">
            <summary className="cursor-pointer font-semibold text-[15px] leading-tight">{f.q}</summary>
            <p className="mt-2 text-[13px] sm:text-sm text-[var(--muted)] leading-snug">{f.a}</p>
          </details>
        ))}
      </div>

      <p className="mt-6 pb-24 text-center text-xs text-[var(--muted)]">@your_bot</p>
    </main>
  );
}
