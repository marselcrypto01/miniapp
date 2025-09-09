'use client';

import { useEffect, useMemo, useRef } from 'react';
import { initSupabaseFromTelegram, writePresence } from '@/lib/db';
import { readTelegramUserNow } from '@/lib/telegram';

export type PresenceProps = {
  page: string;
  activity?: string;
  lessonId?: number;
  progressPct?: number;
};

const UID_KEY = 'presence_uid';
function getUid(): string {
  try {
    let uid = localStorage.getItem(UID_KEY) || '';
    if (!uid) {
      uid =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(UID_KEY, uid);
    }
    return uid;
  } catch {
    return 'anonymous';
  }
}

export default function PresenceClient({ page, activity, lessonId, progressPct }: PresenceProps) {
  const timer = useRef<number | null>(null);
  const uid = useMemo(getUid, []);

  useEffect(() => {
    let cancelled = false;

    // Запускаем инициализацию в фоне — НЕ ждём.
    initSupabaseFromTelegram().catch(() => {});

    const beat = async () => {
      if (cancelled) return;
      try {
        const u = readTelegramUserNow();
        const handle = u?.username ? String(u.username) : null; // без '@'
        await writePresence({
          page,
          activity,
          lessonId: lessonId ?? null,
          progressPct: typeof progressPct === 'number' ? progressPct : undefined,
          username: handle,
        });
      } catch {}
    };

    // первый пульс сразу
    void beat();

    // далее — каждые 20 сек (не агрессивно)
    timer.current = window.setInterval(() => { void beat(); }, 20000);

    const onVisible = () => { if (document.visibilityState === 'visible') void beat(); };
    document.addEventListener('visibilitychange', onVisible);
    const onUnload = () => { void beat(); };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      cancelled = true;
      if (timer.current) window.clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [page, activity, lessonId, progressPct, uid]);

  return null;
}
