'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PresenceClient from '@/components/PresenceClient';

type Progress = { lesson_id: number; status: 'completed' | 'pending' };
type Lesson = { id: number; title: string; subtitle?: string };
type AchievementKey = 'first' | 'risk' | 'finisher' | 'simulator';

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

// ===== Уровни (без перков) =====
type LevelKey = 'novice' | 'bronze' | 'silver' | 'gold';
const LEVELS: Record<LevelKey, { title: string; threshold: number; icon: string }> = {
  novice: { title: 'Новичок', threshold: 0, icon: '🌱' },
  bronze: { title: 'Бронза', threshold: 40, icon: '🥉' },
  silver: { title: 'Серебро', threshold: 80, icon: '🥈' },
  gold: { title: 'Золото', threshold: 120, icon: '🥇' },
};

function computeXP(completedCount: number, ach: Record<AchievementKey, boolean>) {
  let xp = completedCount * 20; // 5 уроков → 100 XP
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

export default function Home() {
  const router = useRouter();

  const [username, setUsername] = useState<string | null>(null);
  const [isTelegram, setIsTelegram] = useState(true);

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

  const lessons: Lesson[] = useMemo(
    () => [
      { id: 1, title: 'Крипта простыми словами' },
      { id: 2, title: 'Арбитраж: как это работает' },
      { id: 3, title: 'Риски, мифы и страхи' },
      { id: 4, title: 'Главные ошибки новичков' },
      { id: 5, title: 'Итог: как двигаться дальше' },
      { id: 6, title: 'Дополнительная полезная информация', subtitle: 'Чек-листы, шпаргалки, ссылки…' },
    ],
    []
  );

  // Telegram / демо-режим
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo') === '1' || process.env.NODE_ENV === 'development';
    const tg = (window as any)?.Telegram?.WebApp;

    if (!tg) {
      if (demo) {
        setIsTelegram(true);
        setUsername('user');
      } else {
        setIsTelegram(false);
      }
      return;
    }

    try {
      tg.expand();
      tg.ready();
      setUsername(tg.initDataUnsafe?.user?.username || null);
      setIsTelegram(true);
    } catch {
      setIsTelegram(demo);
      if (demo) setUsername('user');
    }
  }, []);

  // Цитата дня (учитываем админские в localStorage)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('admin_quotes') || '[]');
      const pool: string[] = Array.isArray(saved) && saved.length ? saved : QUOTES;
      setQuote(pool[Math.floor(Math.random() * pool.length)]);
    } catch {
      setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }
  }, []);

  // Поднять прогресс/ачивки/флаг all_completed из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('progress');
      const ach = localStorage.getItem('achievements');
      const all = localStorage.getItem('all_completed') === 'true';
      if (saved) setProgress(JSON.parse(saved));
      if (ach) setAchievements(JSON.parse(ach));
      setAllCompleted(all);
    } catch {
      // ignore
    }
  }, []);

  // Вспомогательные вычисления
  const isCompleted = (id: number) =>
    progress.find((p) => p.lesson_id === id)?.status === 'completed';

  const coreLessonsCount = 5;
  const completedCount = progress.filter((p) => p.status === 'completed' && p.lesson_id <= 5).length;
  const bar = Math.min(100, Math.round((completedCount / coreLessonsCount) * 100));

  // Авто-ачивки и сохранение
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // «Отметить как пройдено» (демо на главной; основной флоу — на странице урока)
  const complete = (lessonId: number) => {
    setProgress((prev) => {
      const exists = prev.find((p) => p.lesson_id === lessonId);
      return exists
        ? prev.map((p) => (p.lesson_id === lessonId ? { ...p, status: 'completed' } : p))
        : [...prev, { lesson_id: lessonId, status: 'completed' }];
    });
    setPoints((x) => x + 10);
  };

  // Уровень
  const xp = computeXP(completedCount, achievements);
  const { key: levelKey, progressPct } = computeLevel(xp);
  const level = LEVELS[levelKey];

  // Метки ачивок над полосой
  const markers = [
    { key: 'first', at: 20, icon: '💸', title: 'Первый арбитраж (после 1 урока)', achieved: achievements.first },
    { key: 'fast', at: 60, icon: '⚡', title: 'Быстрый старт (3 урока)', achieved: completedCount >= 3 },
    { key: 'risk', at: 60, icon: '🛡️', title: 'Холодная голова (урок 3)', achieved: achievements.risk },
    { key: 'fin', at: 100, icon: '🚀', title: 'Финалист (все уроки)', achieved: achievements.finisher },
    { key: 'sim', at: 100, icon: '📊', title: 'Симуляторщик (калькулятор)', achieved: achievements.simulator },
  ] as const;

  if (!isTelegram) {
    return (
      <main className="flex h-screen items-center justify-center px-4">
        <div className="glass p-6 text-center">
          <h1 className="text-xl font-bold">Открой приложение в Telegram</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-5">
      {/* Presence: отмечаем активность на главной */}
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

      {/* Статус-бар: метки → полоса → подписи */}
      <div className="mt-3">
        <div className="relative h-8 mb-2">
          {markers.map((m) => (
            <span
              key={m.key}
              title={m.title}
              className={`absolute -translate-x-1/2 grid place-items-center w-7 h-7 rounded-full text-[13px] ${m.achieved ? '' : 'opacity-45'}`}
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
                    {ICONS[l.id]}
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
                {/* Всегда ведём на страницу урока. 6-й модуль (материалы) блокируем до прохождения 1–5. */}
                <button
                  className="btn-brand"
                  onClick={() => router.push(`/lesson/${l.id}`)}
                  disabled={lockedExtra}
                  title={lockedExtra ? 'Откроется после прохождения всех уроков' : 'Открыть урок'}
                >
                  {lockedExtra ? 'Закрыто' : 'Смотреть'}
                </button>

                {/* Доп. демо-кнопка «Отметить как пройдено» */}
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
