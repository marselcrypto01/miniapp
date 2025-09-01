'use client';

import { useEffect, useMemo, useState } from 'react';

type Progress = { lesson_id: number; status: 'completed' | 'pending' };
type AchievementKey = 'first' | 'risk' | 'finisher' | 'simulator';

type LevelKey = 'novice' | 'bronze' | 'silver' | 'gold';
const LEVELS: Record<LevelKey, { title: string; threshold: number }> = {
  novice: { title: 'Новичок', threshold: 0 },
  bronze: { title: 'Бронза', threshold: 40 },
  silver: { title: 'Серебро', threshold: 80 },
  gold:   { title: 'Золото', threshold: 120 },
};

function computeXP(completedCount: number, ach: Record<AchievementKey, boolean>) {
  let xp = completedCount * 20;
  if (ach.first) xp += 5;
  if (ach.risk) xp += 5;
  if (ach.simulator) xp += 5;
  if (ach.finisher) xp += 10;
  return xp;
}
function computeLevelKey(xp: number): LevelKey {
  if (xp >= LEVELS.gold.threshold) return 'gold';
  if (xp >= LEVELS.silver.threshold) return 'silver';
  if (xp >= LEVELS.bronze.threshold) return 'bronze';
  return 'novice';
}

export default function ConsultPage() {
  const [username, setUsername] = useState<string>('user');
  const [progress, setProgress] = useState<Progress[]>([]);
  const [ach, setAch] = useState<Record<AchievementKey, boolean>>({
    first: false, risk: false, finisher: false, simulator: false,
  });

  // форма
  const [name, setName] = useState('');
  const [tgNick, setTgNick] = useState('');
  const [phone, setPhone] = useState('');
  const [time, setTime] = useState('');

  // поднимем состояние из localStorage
  useEffect(() => {
    try {
      const p = localStorage.getItem('progress');
      const a = localStorage.getItem('achievements');
      if (p) setProgress(JSON.parse(p));
      if (a) setAch(JSON.parse(a));
      const u = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.username || 'user';
      setUsername(u || 'user');
    } catch {}
  }, []);

  const completedCount = useMemo(
    () => progress.filter(p => p.status === 'completed' && p.lesson_id <= 5).length,
    [progress]
  );
  const xp = computeXP(completedCount, ach);
  const levelKey = computeLevelKey(xp);
  const isGold = levelKey === 'gold';

  const handleSubmit = () => {
    const payload = {
      name: name || username,
      tg: tgNick || '@' + username,
      phone,
      time,
      level: levelKey,
    };
    const data = encodeURIComponent(JSON.stringify(payload));
    // ЗАМЕНИ your_bot на реальный username бота
    const url = `https://t.me/your_bot?start=consult_${data}`;
    window.open(url, '_blank');
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Запись на консультацию</h1>
      <div className="mt-2 h-[3px] w-24 rounded bg-[var(--brand)]" />

      <div className="glass mt-4 rounded-[18px] p-4">
        <div className="text-sm text-[var(--muted)]">
          Ваш уровень: <b>{LEVELS[levelKey].title}</b> {isGold ? '🥇' : ''}
        </div>

        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span>Имя</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none"
              placeholder="Ваше имя"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Telegram @username</span>
            <input
              value={tgNick}
              onChange={e => setTgNick(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none"
              placeholder="@username"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Телефон (необязательно)</span>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none"
              placeholder="+7…"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Желаемое время консультации (необязательно)</span>
            <input
              value={time}
              onChange={e => setTime(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none"
              placeholder="Например, пн-пт после 18:00"
            />
          </label>
        </div>

        <div className="mt-4">
          <button
            className="btn-brand"
            onClick={handleSubmit}
            disabled={!isGold}
            style={!isGold ? { opacity: .6, cursor: 'not-allowed' } : undefined}
            title={isGold ? 'Бесплатная консультация доступна' : 'Доступно с уровня Золото'}
          >
            {isGold ? 'Записаться бесплатно' : 'Доступно с уровня «Золото»'}
          </button>
          {!isGold && (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Чтобы открыть бесплатную консультацию — завершите курс и выполните квесты (ачивки).
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 pb-24 text-center text-xs text-[var(--muted)]">@your_bot</p>
    </main>
  );
}
