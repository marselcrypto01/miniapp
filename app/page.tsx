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

/* ====================== типы/константы ====================== */
type Progress = { lesson_id: number; status: 'completed' | 'pending' };
type Lesson = { id: number; title: string; subtitle?: string | null };
type AchievementKey = 'first' | 'risk' | 'finisher' | 'simulator';
type Env = 'loading' | 'telegram' | 'browser';

const CORE_LESSONS_COUNT = 5;
const POINTS_PER_LESSON = 100;

const ICONS: Record<number, string> = {
  1: '🧠',
  2: '🎯',
  3: '🛡️',
  4: '⚠️',
  5: '🧭',
  6: '📚',
};

const QUOTES = [
  'Учись видеть возможности там, где другие видят шум.',
  'Успех любит дисциплину.',
  'Лучший риск — тот, который просчитан.',
  'Дорогу осилит идущий. Шаг за шагом.',
  'Малые действия каждый день сильнее больших рывков раз в месяц.',
];

/* ===== уровни (новая шкала) ===== */
type LevelKey = 'novice' | 'megagood' | 'almostpro' | 'arbitrager' | 'cryptoboss';
const LEVELS: Record<LevelKey, { title: string; threshold: number; icon: string }> = {
  novice:     { title: 'Новичок',       threshold: 0,   icon: '🌱' },
  megagood:   { title: 'Мегахорош',     threshold: 40,  icon: '💪' },
  almostpro:  { title: 'ПочтиПрофи',    threshold: 80,  icon: '⚡' },
  arbitrager: { title: 'Арбитражник',   threshold: 120, icon: '🎯' },
  cryptoboss: { title: 'Крипто-босс',   threshold: 160, icon: '👑' },
};
function computeXP(completedCount: number, ach: Record<AchievementKey, boolean>) {
  // XP остаётся «мягкой» метрикой: 20 за урок + ачивки.
  let xp = completedCount * 20;
  if (ach.first) xp += 5;
  if (ach.risk) xp += 5;
  if (ach.simulator) xp += 5;
  if (ach.finisher) xp += 25; // финалисту побольше
  return xp;
}
function computeLevel(xp: number): { key: LevelKey; nextAt: number | null; progressPct: number } {
  const order: LevelKey[] = ['novice', 'megagood', 'almostpro', 'arbitrager', 'cryptoboss'];
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

/* uid общий */
const UID_KEY = 'presence_uid';
function getClientUid(): string {
  try {
    const from = localStorage.getItem(UID_KEY);
    if (from) return from;
    const gen = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(UID_KEY, gen);
    return gen;
  } catch {
    return 'anonymous';
  }
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
        await new Promise(r => setTimeout(r, 100));
      }
      if (!cancelled) setEnv(demo ? 'telegram' : 'browser');
      if (demo) setUsername('user');
    };

    void detect();
    return () => { cancelled = true; };
  }, []);

  /* ===== Уроки ===== */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listLessons();
        if (cancelled) return;
        const mapped: Lesson[] = rows
          .sort((a: any, b: any) => (a.order_index ?? a.id) - (b.order_index ?? b.id))
          .map((r: any) => ({ id: r.id, title: r.title ?? '', subtitle: r.subtitle ?? undefined }));

        // Перезапишем названия 1–5 уроков по ТЗ (если они есть)
        const byId = new Map(mapped.map(m => [m.id, m]));
        const override = (id: number, title: string) => {
          const item = byId.get(id);
          if (item) item.title = title;
        };
        override(1, 'Крипта без сложных слов: что это и зачем тебе');
        override(2, 'Арбитраж: простой способ зарабатывать на обмене крипты');
        override(3, 'Риски и страхи: как не потерять деньги на старте');
        override(4, '5 ошибок новичков, которые убивают заработок');
        override(5, 'Финал: твой первый шаг в мир крипты');

        const final = mapped.map(m => byId.get(m.id) || m);
        setLessons(final);
        try { localStorage.setItem('lessons_cache', JSON.stringify(final)); } catch {}
      } catch {
        // Фоллбек с нужными названиями
        setLessons([
          { id: 1, title: 'Крипта без сложных слов: что это и зачем тебе' },
          { id: 2, title: 'Арбитраж: простой способ зарабатывать на обмене крипты' },
          { id: 3, title: 'Риски и страхи: как не потерять деньги на старте' },
          { id: 4, title: '5 ошибок новичков, которые убивают заработок' },
          { id: 5, title: 'Финал: твой первый шаг в мир крипты' },
          { id: 6, title: 'Дополнительные материалы', subtitle: 'Секретный чек-лист банков и бирж' },
        ]);
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

  /* ===== Обновлять прогресс при возврате во вкладку ===== */
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
          const arr: Progress[] = rows.map((r: any) => ({
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

  const coursePct = Math.min(100, Math.round((completedCount / CORE_LESSONS_COUNT) * 100));
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

    (async () => { try { await saveUserProgress(getClientUid(), progress); } catch {} })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, progressLoaded, completedCount]);

  /* ===== Уровень ===== */
  const xp = computeXP(completedCount, achievements);
  const { key: levelKey, progressPct } = computeLevel(xp);
  const level = LEVELS[levelKey];

  /* ===== Ачивки ===== */
  const achList = [
    { key: 'first' as const,    icon: '💸', label: 'Первый' },
    { key: 'risk' as const,     icon: '🛡️', label: 'Риск' },
    { key: 'finisher' as const, icon: '🚀', label: 'Финал' },
    { key: 'simulator' as const,icon: '📊', label: 'Симулятор' },
  ];

  /* ===== Компонент: чип с динамической обводкой (медаль) ===== */
  const ChipRing: React.FC<{ pct: number; children: React.ReactNode; className?: string }> = ({
    pct, children, className,
  }) => {
    const clamped = Math.max(0, Math.min(100, pct));
    return (
      <div
        className={`rounded-full p-[2px] w-full ${className || ''}`}
        style={{ background: `conic-gradient(var(--brand) ${clamped}%, transparent 0)` }}
      >
        <div className="chip px-4 py-2 rounded-full w-full justify-center">
          {children}
        </div>
      </div>
    );
  };

  /* ===== Гейт по окружению ===== */
  if (env === 'loading') return null;

  if (env === 'browser') {
    return (
      <main className="flex h-screen items-center justify-center px-4 overflow-x-hidden">
        <div className="glass p-6 text-center">
          <h1 className="text-xl font-semibold leading-tight">Открой приложение в Telegram</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Ссылка с ботом откроет мини-приложение сразу.</p>
        </div>
      </main>
    );
  }

  /* НЕ-хуки */
  const checkpoints = Array.from({ length: CORE_LESSONS_COUNT }, (_, i) => (i + 1) * (100 / CORE_LESSONS_COUNT));
  const coreLessons  = lessons.filter((l) => l.id <= CORE_LESSONS_COUNT);
  const bonusLessons = lessons.filter((l) => l.id >  CORE_LESSONS_COUNT);

  /* ===== Разметка ===== */
  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-4 overflow-x-hidden">
      <PresenceClient page="home" activity="Главная" progressPct={coursePct} />

      {/* ======= ШАПКА ======= */}
      <header className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-[1.1]">
          Курс по заработку на крипте
        </h1>
        <div className="mt-2 h-[3px] w-24 rounded bg-[var(--brand)]" />

        <p className="mt-3 text-[13px] sm:text-sm text-[var(--muted)]">
          Привет, @{username || 'user'}!
        </p>

        <blockquote
          className="mt-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-2) 85%,transparent)] p-3 text-[13px] sm:text-sm italic text-[var(--muted)]"
          style={{ boxShadow: 'var(--shadow)', borderLeftWidth: '4px', borderLeftColor: 'var(--brand)' }}
        >
          <span className="mr-1">“</span>{quote}<span className="ml-1">”</span>
        </blockquote>

        {/* очки + уровень — РАСТЯНУТЫЕ на ширину контейнера */}
        <div className="mt-4 grid grid-cols-2 gap-2 w-full">
          <div className="w-full">
            <div className="chip px-4 py-2 w-full justify-center">
              <span>🏆</span>
              <span className="text-sm font-semibold">{points} очк.</span>
            </div>
          </div>
          <ChipRing pct={progressPct}>
            <span>{level.icon}</span>
            <span className="text-sm font-semibold">{level.title}</span>
          </ChipRing>
        </div>

        {/* статус-бар */}
        <div className="mt-3">
          <div className="relative h-2 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-[var(--brand)]" style={{ width: `${coursePct}%` }} />
            {checkpoints.map((p, i) => (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-[var(--border)]"
                style={{ left: `calc(${p}% - 4px)` }}
                title={`Урок ${i + 1}`}
              />
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--muted)]">
            <span>Пройдено: {completedCount}/{CORE_LESSONS_COUNT}</span>
            <span>Осталось: {Math.max(0, CORE_LESSONS_COUNT - completedCount)}</span>
          </div>
        </div>

        {/* ачивки — переносятся, ровные поля */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {achList.map(a => {
            const active = achievements[a.key];
            return (
              <div
                key={a.key}
                className={`px-2 py-1 rounded-full border text-[12px] flex items-center gap-1 ${active ? '' : 'opacity-45'}`}
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
                title={a.label}
              >
                <span>{a.icon}</span>
                <span className="font-medium">{a.label}</span>
              </div>
            );
          })}
        </div>
      </header>

      {/* ===== Уроки — мобильные карточки, без «разъезжания» ===== */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Уроки</h2>

        <div className="space-y-3">
          {coreLessons.map((l, idx) => {
            const done = isCompleted(l.id);
            return (
              <div
                key={l.id}
                className="
                  grid gap-3 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]
                  shadow-[0_1px_12px_rgba(0,0,0,.12)]
                  grid-cols-[48px_1fr] sm:grid-cols-[56px_1fr_auto]
                "
              >
                {/* иконка */}
                <div className="h-12 w-12 grid place-items-center rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xl">
                  {ICONS[l.id] ?? '📘'}
                </div>

                {/* текст */}
                <div className="min-w-0">
                  <div className="text-[17px] sm:text-[18px] font-semibold leading-tight break-words">
                    Урок {idx + 1}. {l.title}
                  </div>
                  <div className="text-[13px] text-[var(--muted)] mt-1">
                    {({1:7,2:9,3:8,4:6,5:10}[l.id as 1|2|3|4|5] ?? 6)} мин • Статус: {done ? 'пройден' : 'не начат'}
                  </div>
                </div>

                {/* кнопка */}
                <div className="col-span-2 sm:col-span-1 sm:self-center">
                  <button
                    className="w-full sm:w-auto px-4 h-10 rounded-xl bg-[var(--brand)] text-black font-semibold active:translate-y-[1px]"
                    onClick={() => router.push(`/lesson/${l.id}`)}
                  >
                    Смотреть
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ===== Бонус (откроется после прохождения курса) ===== */}
        <h3 className="text-lg font-semibold mt-6">Бонус</h3>
        <p className="text-[12px] text-[var(--muted)] -mt-1 mb-3">
          Бонус откроется только после прохождения курса (секретный чек-лист банков, бирж)
        </p>

        <div className="
          grid gap-3 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]
          grid-cols-[48px_1fr] sm:grid-cols-[56px_1fr_auto]
        ">
          <div className="h-12 w-12 grid place-items-center rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xl">
            📚
          </div>
          <div>
            <div className="text-[17px] font-semibold leading-tight">Дополнительные материалы</div>
            <div className="text-[12px] text-[var(--muted)] mt-1">Секретный чек-лист банков и бирж</div>
          </div>
          <div className="col-span-2 sm:col-span-1 sm:self-center">
            <button
              className="w-full sm:w-auto px-4 h-10 rounded-xl bg-[var(--brand)] text-black font-semibold active:translate-y-[1px]"
              onClick={() => allCompleted && router.push('/lesson/6')}
              disabled={!allCompleted}
              title={allCompleted ? 'Открыть бонус' : 'Откроется после прохождения всех уроков'}
            >
              {allCompleted ? 'Открыть' : 'Откроется после курса'}
            </button>
          </div>
        </div>
      </section>

      {/* ===== FAQ (расширенный) ===== */}
      <h2 className="mt-6 text-xl sm:text-2xl font-bold">FAQ</h2>
      <div className="mt-3 space-y-2">
        {[
          { q: 'А если у меня всего 10–20 тысяч — это вообще имеет смысл?', a: 'Да. Начать можно с небольших сумм, главное — дисциплина и скорость оборота. В уроках есть пример, как масштабировать.' },
          { q: 'Не поздно ли заходить в крипту в 2025 году?', a: 'Нет. Спреды и дефицит ликвидности появляются каждый день. Мы зарабатываем на разнице курсов, а не на «угадай тренд».' },
          { q: 'Правда, что можно уйти в минус и потерять все деньги?', a: 'Если нарушать базовые правила — да. В курсе есть чек-лист рисков и типовых ошибок, чтобы этого избежать.' },
          { q: 'Сколько реально можно заработать в месяц новичку?', a: 'У учеников обычно получается от +30–80к в первый месяц при занятости 1–2 часа в день. Всё зависит от темпа и капитала.' },
          { q: 'Что если банк начнёт задавать вопросы?', a: 'Есть готовые скрипты общения и распределение лимитов по картам. Это часть процесса — делаем всё «в белую».' },
          { q: 'Я работаю/учуcь. Сколько времени нужно тратить на арбитраж?', a: 'Достаточно 30–90 минут в день. С опытом многие процессы автоматизируются.' },
          { q: 'А вдруг я не разберусь? Это не слишком сложно?', a: 'Курс построен «с нуля»: короткие уроки, простые термины, чек-листы. Понять сможет любой.' },
          { q: 'Чем арбитраж лучше инвестиций в монеты или трейдинга?', a: 'Здесь меньше волатильности и зависимостей от графиков — доход строится на разнице курсов при обмене.' },
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
