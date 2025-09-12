// app/HomeClient.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PresenceClient from '@/components/PresenceClient';
import {
  listLessons,
  getRandomDailyQuote,
  getUserProgress,
  saveUserProgress,
  initSupabaseFromTelegram,
} from '@/lib/db';
import { waitForTelegramUser, getDisplayName, readTelegramUserNow } from '@/lib/telegram';

type Progress = { lesson_id: number; status: 'completed' | 'pending' };
type Lesson   = { id: number; title: string; subtitle?: string | null };
type AchievementKey = 'first' | 'unlock' | 'fear' | 'errors' | 'arbitrager';
type Env = 'loading' | 'telegram' | 'browser';

const CORE_LESSONS_COUNT = 5;
const POINTS_PER_LESSON = 100;

/** ширина = мини-бару через переменную */
const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';

const ICONS: Record<number, string> = { 1: '🧠', 2: '🎯', 3: '🛡️', 4: '⚠️', 5: '🧭', 6: '📚' };

const QUOTES = [
  'Учись видеть возможности там, где другие видят шум.',
  'Успех любит дисциплину.',
  'Лучший риск — тот, который просчитан.',
  'Дорогу осилит идущий. Шаг за шагом.',
  'Малые действия каждый день сильнее больших рывков раз в месяц.',
];

/* уровни */
type LevelKey = 'novice' | 'megagood' | 'almostpro' | 'arbitrager' | 'cryptoboss';
const LEVELS: Record<LevelKey, { title: string; threshold: number; icon: string }> = {
  novice:      { title: 'Новичок',      threshold: 0,   icon: '🌱' },
  megagood:    { title: 'Мегахорош',    threshold: 40,  icon: '💪' },
  almostpro:   { title: 'ПочтиПрофи',   threshold: 80,  icon: '⚡' },
  arbitrager:  { title: 'Арбитражник',  threshold: 120, icon: '🎯' },
  cryptoboss:  { title: 'Крипто-босс',  threshold: 160, icon: '👑' },
};

function computeXP(completedCount: number, ach: Record<AchievementKey, boolean>) {
  let xp = completedCount * 20;
  if (ach.first) xp += 5;
  if (ach.unlock) xp += 5;
  if (ach.fear) xp += 5;
  if (ach.errors) xp += 10;
  if (ach.arbitrager) xp += 25;
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
  const to   = LEVELS[next].threshold;
  const pct  = Math.max(0, Math.min(100, Math.round(((xp - from) / (to - from)) * 100)));
  return { key: current, nextAt: to, progressPct: pct };
}

/* ───── NEW: user-scoped localStorage ───── */
function getTgIdSync(): string | null {
  try {
    const wa = (window as any)?.Telegram?.WebApp;
    const id = wa?.initDataUnsafe?.user?.id;
    return (id ?? null)?.toString?.() ?? null;
  } catch { return null; }
}
function ns(key: string): string {
  const id = getTgIdSync();
  return id ? `${key}:tg_${id}` : `${key}:anon`;
}

export default function HomeClient() {
  const router = useRouter();

  const [firstName, setFirstName] = useState<string>('');
  const [env, setEnv] = useState<Env>('loading');

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [quote, setQuote] = useState<string>('');

  const [achievements, setAchievements] = useState<Record<AchievementKey, boolean>>({
    first: false, unlock: false, fear: false, errors: false, arbitrager: false
  });
  const [allCompleted, setAllCompleted] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [learningNow, setLearningNow] = useState<number>(() => {
    const min = 50, max = 253;
    const seed = Date.now();
    const x = Math.abs(Math.sin(seed)) * (max - min) + min;
    return Math.floor(x);
  });

  // ✅ добавил флаг готовности auth, чтобы сначала получить JWT, а потом читать прогресс
  const [authReady, setAuthReady] = useState(false);

  /* Инициализируем Supabase (tg-auth) и страховочный редирект в /admin */
  useEffect(() => {
    let stop = false;

    (async () => {
      try {
        await initSupabaseFromTelegram();
      } catch (e) {
        console.warn('auth init failed', e);
      } finally {
        if (!stop) setAuthReady(true);
      }
    })();

    function wantAdmin() {
      const sp = new URLSearchParams(window.location.search);
      const s1 = (sp.get('startapp') || '').toLowerCase();
      const s2 = (sp.get('tgWebAppStartParam') || '').toLowerCase();
      let s3 = '';
      if (location.hash.startsWith('#')) {
        try { s3 = new URLSearchParams(location.hash.slice(1)).get('tgWebAppStartParam') || ''; } catch {}
      }
      return s1 === 'admin' || s2 === 'admin' || s3.toLowerCase() === 'admin';
    }

    (async () => {
      for (let i = 0; i < 80 && !stop; i++) {
        try {
          // @ts-ignore
          const wa = (window as any)?.Telegram?.WebApp;
          const username  = wa?.initDataUnsafe?.user?.username?.toLowerCase?.();
          const startParm = (wa?.initDataUnsafe?.start_param || wa?.initDataUnsafe?.startapp)?.toLowerCase?.();
          const asked     = wantAdmin() || startParm === 'admin';
          if (username === 'marselv1' && asked) {
            window.location.replace('/admin');
            return;
          }
        } catch {}
        await new Promise(r => setTimeout(r, 100));
      }
    })();

    return () => { stop = true; };
  }, []);

  /* вычисления */
  const isCompleted = (id: number) => progress.find(p => p.lesson_id === id)?.status === 'completed';
  const completedCount = useMemo(
    () => progress.filter(p => p.status === 'completed' && p.lesson_id <= CORE_LESSONS_COUNT).length,
    [progress]
  );
  const coursePct = Math.min(100, Math.round((completedCount / CORE_LESSONS_COUNT) * 100));
  const points    = completedCount * POINTS_PER_LESSON;

  const xp = computeXP(completedCount, achievements);
  const { key: levelKey, progressPct } = computeLevel(xp);
  const level = LEVELS[levelKey];

  const checkpoints = useMemo(
    () => Array.from({ length: CORE_LESSONS_COUNT }, (_, i) => (i + 1) * (100 / CORE_LESSONS_COUNT)),
    []
  );
  const coreLessons  = useMemo(() => lessons.filter(l => l.id <= CORE_LESSONS_COUNT), [lessons]);

  /* TG (имя) — сначала пробуем мгновенно, затем ждём до 5 сек */
  useEffect(() => {
    // сначала поднимем сохранённое имя из user-scoped localStorage
    try {
      const savedName = localStorage.getItem(ns('display_name'));
      if (savedName) setFirstName(savedName);
    } catch {}

    let cancelled = false;
    const detect = async () => {
      let u = readTelegramUserNow();
      if (!u) u = await waitForTelegramUser(5000);
      if (cancelled) return;
      const wa = (window as any)?.Telegram?.WebApp;
      try { wa?.ready?.(); wa?.expand?.(); } catch {}
      if (u) {
        setEnv('telegram');
        const dn = getDisplayName(u) || '';
        setFirstName(dn);
        try {
          localStorage.setItem(ns('display_name'), dn);
          if (u.username) localStorage.setItem(ns('username'), String(u.username));
        } catch {}
      } else {
        setEnv('browser');
      }
    };
    void detect();
    return () => { cancelled = true; };
  }, []);

  // Динамический «Сейчас учатся N человек» — обновлять при каждом заходе/возврате
  useEffect(() => {
    const update = () => {
      const min = 50, max = 253;
      const seed = Date.now();
      const x = Math.abs(Math.sin(seed)) * (max - min) + min;
      setLearningNow(Math.floor(x));
    };
    update();
    window.addEventListener('focus', update);
    const onVis = () => document.visibilityState === 'visible' && update();
    document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  /* уроки */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listLessons();
        if (cancelled) return;
        const mapped: Lesson[] = rows
          .sort((a: any, b: any) => (a.order_index ?? a.id) - (b.order_index ?? b.id))
          .map((r: any) => ({ id: r.id, title: r.title ?? '', subtitle: r.subtitle ?? undefined }));
        const names: Record<number, string> = {
          1: 'Крипта без сложных слов: что это и зачем тебе',
          2: 'Арбитраж: простой способ зарабатывать на обмене крипты',
          3: 'Риски и страхи: как не потерять деньги на старте',
          4: '5 ошибок новичков, которые убивают заработок',
          5: 'Финал: твой первый шаг в мир крипты',
        };
        const patched = mapped.map(m => names[m.id] ? { ...m, title: names[m.id] } : m);
        setLessons(patched);
        try { localStorage.setItem('lessons_cache', JSON.stringify(patched)); } catch {}
      } catch {
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

  /* цитата */
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

  /* прогресс (ждём authReady → сначала из БД (RLS), иначе — из user-scoped LS) */
  useEffect(() => {
    if (!authReady) return;
    (async () => {
      try {
        const rows = await getUserProgress();
        if (rows?.length) {
          const arr: Progress[] = rows.map((r: any) => ({
            lesson_id: Number(r.lesson_id),
            status: r.status === 'completed' ? 'completed' : 'pending',
          }));
          setProgress(arr);
          try { localStorage.setItem(ns('progress'), JSON.stringify(arr)); } catch {}
        } else {
          const raw = localStorage.getItem(ns('progress'));
          if (raw) setProgress(JSON.parse(raw) as Progress[]);
        }
      } catch {
        const raw = localStorage.getItem(ns('progress'));
        if (raw) setProgress(JSON.parse(raw) as Progress[]);
      }

      try {
        const ach = localStorage.getItem(ns('achievements'));
        const all = localStorage.getItem(ns('all_completed')) === 'true';
        if (ach) setAchievements(JSON.parse(ach));
        setAllCompleted(all);
      } catch {}

      setProgressLoaded(true);
    })();
  }, [authReady]);

  /* авто-обновление при возврате */
  useEffect(() => {
    const refresh = () => {
      try {
        const raw = localStorage.getItem(ns('progress'));
        if (raw) setProgress(JSON.parse(raw));
      } catch {}
      try {
        const nm = localStorage.getItem(ns('display_name'));
        if (nm) setFirstName(nm || '');
      } catch {}
    };
    window.addEventListener('focus', refresh);
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  /* сохраняем и считаем ачивки + очки (в user-scoped LS) */
  useEffect(() => {
    if (!progressLoaded) return;
    const next = { ...achievements };
    const _isCompleted = (id: number) => progress.find(p => p.lesson_id === id)?.status === 'completed';
    if (_isCompleted(1)) next.first = true;
    if (_isCompleted(2)) next.unlock = true;
    if (_isCompleted(3)) next.fear = true;
    if (_isCompleted(4)) next.errors = true;
    const finishedCount = progress.filter(p => p.status === 'completed' && p.lesson_id <= CORE_LESSONS_COUNT).length;
    if (finishedCount === CORE_LESSONS_COUNT) next.arbitrager = true;

    setAchievements(next);
    try { localStorage.setItem(ns('achievements'), JSON.stringify(next)); } catch {}

    const finished = finishedCount === CORE_LESSONS_COUNT;
    setAllCompleted(finished);
    try { localStorage.setItem(ns('all_completed'), finished ? 'true' : 'false'); } catch {}

    try { localStorage.setItem(ns('progress'), JSON.stringify(progress)); } catch {}
    (async () => { try { await saveUserProgress(progress); } catch {} })();

    // сохраняем очки (кап 500)
    const pts = Math.min(500, finishedCount * POINTS_PER_LESSON);
    try { localStorage.setItem(ns('points'), String(pts)); } catch {}
  }, [progress, progressLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  /* компактная «рамка» уровня */
  const ChipRing: React.FC<{ pct: number; children: React.ReactNode }> = ({ pct, children }) => {
    const clamped = Math.max(0, Math.min(100, pct));
    return (
      <div
        className="rounded-full p-[1px] w-full"
        style={{
          border: '1px solid transparent',
          background: `
            linear-gradient(var(--surface), var(--surface)) padding-box,
            linear-gradient(to top, var(--brand) ${clamped}%, rgba(255,255,255,0.08) 0) border-box
          `,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'color-mix(in oklab, var(--surface) 85%, transparent)' }}
        >
          {children}
        </div>
      </div>
    );
  };

  return (
    <main className={`${WRAP} py-4`}>
      <PresenceClient page="home" activity="Главная" progressPct={coursePct} />

      {/* Шапка */}
      <header className="mb-5 w-full">
        <h1 className="text-2xl font-extrabold tracking-tight leading-[1.1]">Курс по заработку на крипте</h1>
        <div className="mt-2 h-[3px] w-24 rounded bg-[var(--brand)]" />

        <p className="mt-3 text-[13px] text-[var(--muted)]">Привет{firstName ? `, ${firstName}` : ''}!</p>
        <div className="mt-2 chip px-3 py-1.5 w-fit">
          <span>👥</span>
          <span className="text-xs">Сейчас учатся {learningNow} человек</span>
        </div>

        <blockquote
          className="mt-2 rounded-xl border border-[var(--border)] p-3 text-[13px] italic text-[var(--muted)] w-full"
          style={{ boxShadow: 'var(--shadow)', borderLeftWidth: '4px', borderLeftColor: 'var(--brand)', background: 'color-mix(in oklab, var(--surface-2) 85%, transparent)' }}
        >
          <span className="mr-1">“</span>{quote}<span className="ml-1">”</span>
        </blockquote>

        {/* очки + уровень */}
        <div className="mt-3 grid grid-cols-2 gap-2 w-full">
          <div className="w-full">
            <div className="chip px-3 py-1.5 w-full justify-center text-xs">
              <span>🏆</span><span className="font-semibold">{Math.min(500, points)} очк.</span>
            </div>
          </div>
          <ChipRing pct={progressPct}>
            <span className="text-sm">{level.icon}</span>
            <span className="text-xs font-semibold">{level.title}</span>
          </ChipRing>
        </div>

        {/* прогресс-бар */}
        <div className="mt-2 w-full">
          <div className="relative h-2 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden w-full">
            <div className="absolute inset-y-0 left-0 bg-[var(--brand)]" style={{ width: `${coursePct}%` }} />
            {checkpoints.map((p, i) => (
              <div key={i} className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-[var(--border)]" style={{ left: `calc(${p}% - 4px)` }} />
            ))}
          </div>
          {/* вернул прежний мелкий шрифт (11px) */}
          <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--muted)]">
            <span>Пройдено: {Math.min(completedCount, CORE_LESSONS_COUNT)}/{CORE_LESSONS_COUNT}</span>
            <span>Осталось: {Math.max(0, CORE_LESSONS_COUNT - completedCount)}</span>
          </div>
        </div>

        {/* Ачивки */}
        <div className="mt-3 grid grid-cols-2 gap-2 w-full">
          {[
            { key: 'first' as const, icon: '👣', label: 'Первый шаг' },
            { key: 'unlock' as const, icon: '🔓', label: 'Разблокировал знания' },
            { key: 'fear' as const, icon: '🛡️', label: 'Победил страхи' },
            { key: 'errors' as const, icon: '✅', label: 'Ошибки повержены' },
            { key: 'arbitrager' as const, icon: '🎯', label: 'Арбитражник' },
          ].map(a => {
            const active = achievements[a.key];
            return (
              <div key={a.key} className="w-full">
                <div
                  className={`w-full px-3 rounded-full border flex items-center justify-center gap-1 h-9 ${active ? '' : 'opacity-55'}`}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
                >
                  <span className="text-sm shrink-0">{a.icon}</span>
                  <span
                    className="font-medium text-center leading-[1.1] break-words overflow-hidden
                               [font-size:clamp(12px,3.1vw,14px)]"
                    style={{ display:'-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient:'vertical' }}
                  >
                    {a.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* Уроки */}
      <section className="w-full">
        <h2 className="text-xl font-bold mb-2">Уроки</h2>
        <div className="space-y-3 w-full">
          {coreLessons.map((l, idx) => {
            const done = isCompleted(l.id);
            const mins = ({1:7,2:9,3:8,4:6,5:10} as Record<number, number>)[l.id] ?? 6;
            return (
              <div key={l.id} className="w-full p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_1px_12px_rgba(0,0,0,.12)]">
                <div className="grid grid-cols-[48px_1fr] gap-3 w-full">
                  <div className="h-12 w-12 grid place-items-center rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xl">{ICONS[l.id] ?? '📘'}</div>
                  <div className="min-w-0 w-full">
                    <div className="text-[17px] font-semibold leading-tight break-words">Урок {idx + 1}. {l.title}</div>
                    <div className="text-[13px] text-[var(--muted)] mt-1">{mins} мин • Статус: {done ? 'пройден' : 'не начат'}</div>
                    <button
                      className="mt-3 w-full px-4 h-10 rounded-xl bg-[var(--brand)] text-black font-semibold active:translate-y-[1px]"
                      onClick={() => router.push(`/lesson/${l.id}`)}
                    >
                      Смотреть
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Бонус */}
        <h3 className="text-lg font-semibold mt-6">Бонус</h3>
        <p className="text-[12px] text-[var(--muted)] -mt-1 mb-3">Бонус откроется только после прохождения курса (секретный чек-лист банков, бирж)</p>

        <div className="w-full p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="grid grid-cols-[48px_1fr] gap-3 w-full">
            <div className="h-12 w-12 grid place-items-center rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xl">📚</div>
            <div className="w-full">
              <div className="text-[17px] font-semibold leading-tight">Дополнительные материалы</div>
              <div className="text-[12px] text-[var(--muted)] mt-1">Секретный чек-лист банков и бирж</div>
              <button
                className="mt-3 w-full px-4 h-10 rounded-xl bg-[var(--brand)] text-black font-semibold active:translate-y-[1px]"
                onClick={() => (allCompleted || points >= 500) && router.push('/lesson/6')}
                disabled={!(allCompleted || points >= 500)}
                title={(allCompleted || points >= 500) ? 'Открыть бонус' : 'Откроется после прохождения всех уроков или 500 очков'}
              >
                {(allCompleted || points >= 500) ? 'Открыть' : 'Откроется после курса/500 очков'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — вернул полностью */}
      <section className="w-full mt-6">
        <h2 className="text-xl font-bold mb-3">📌 FAQ</h2>

        <div className="space-y-2">
          {[
            [
              '1. А если у меня всего 10–20 тысяч — это вообще имеет смысл?',
              '👉 Да. Даже с минимальной суммой можно увидеть результат. Рекомендую начинать от 20 тысяч рублей — это комфортный старт, при котором уже будет ощутимый доход. Главное — понять механику, а дальше всё масштабируется.',
            ],
            [
              '2. Не поздно ли заходить в крипту в 2025 году?',
              '👉 Нет. Крипторынок продолжает расти, миллионы людей подключаются каждый год. Арбитраж работает, пока есть разница курсов и люди меняют валюту — а это всегда.',
            ],
            [
              '3. Правда, что можно уйти в минус и потерять все деньги?',
              '👉 Уйти в минус невозможно. Все сделки проходят через официальные биржи с эскроу: вы покупаете дешевле и продаёте дороже. Риск только в банальной невнимательности — например, ошибиться в номере карты при переводе. Поэтому при аккуратности рисков нет.',
            ],
            [
              '4. Сколько реально можно заработать в месяц новичку?',
              '👉 Новички обычно делают 50–80 тыс. рублей при капитале 50–100 тыс. рублей. Доходность в арбитраже может быть от 7% к капиталу в день, если правильно подходить. Всё зависит от дисциплины и вовлечённости.',
            ],
            [
              '5. Что если банк начнёт задавать вопросы?',
              '👉 Для этого есть готовые сценарии ответов и лимиты по суммам. Банки не запрещают арбитраж, главное — не гнать миллионы через одну карту. Соблюдая простые правила, проблем не будет.',
            ],
            [
              '6. Я работаю/учусь. Сколько времени нужно тратить на арбитраж?',
              '👉 Достаточно 1–2 часов в день. Этого хватает, чтобы делать сделки и зарабатывать. Арбитраж легко совмещать с работой или учёбой.',
            ],
            [
              '7. А вдруг я не разберусь? Это не слишком сложно?',
              '👉 Всё подаётся пошагово. Есть калькулятор, чек-листы и инструкции. Даже полный новичок быстро включается: сначала немного непривычно, но потом процесс становится простым и понятным.',
            ],
            [
              '8. Чем арбитраж лучше инвестиций в монеты или трейдинга?',
              '👉 В трейдинге и инвестициях доход зависит от угадываний и долгосрочных колебаний. В арбитраже доход системный: купил дешевле — продал дороже. Ты зарабатываешь сразу, а не ждёшь месяцами.',
            ],
            [
              '9. Нужно ли показывать доход налоговой или бояться блокировок?',
              '👉 Налогового регулирования для P2P-арбитража нет. Мы ничем противозаконным не занимаемся. На старте суммы небольшие, банки к ним не придираются.',
            ],
            [
              '10. А если у меня нет подходящей карты/банка?',
              '👉 Есть подборка лучших банков и платёжных систем — ты получишь её в бонусных материалах после прохождения курса.',
            ],
            [
              '11. А если курс закроют или крипту запретят?',
              '👉 Запретить обмен полностью невозможно. Даже если один банк ужесточит правила, есть десятки других вариантов и международные платформы.',
            ],
            [
              '12. Нужно ли сидеть за компьютером весь день?',
              '👉 Нет. Все сделки удобно делать с телефона — буквально несколько кликов, и сделка завершена.',
            ],
          ].map(([q, a], i) => (
            <details key={i} className="glass rounded-2xl p-3 w-full">
              <summary className="cursor-pointer font-semibold">{q}</summary>
              <p className="mt-2 text-sm text-[var(--muted)]">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-6 pb-24 text-center text-xs text-[var(--muted)]">@your_bot</p>
    </main>
  );
}


