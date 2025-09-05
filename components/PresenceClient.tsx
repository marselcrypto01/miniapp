'use client';

import { useEffect, useMemo, useRef } from 'react';
import { initSupabaseFromTelegram, writePresence } from '@/lib/db';

/** ===== Типы (оставляем для совместимости) ===== */
export type PresenceSession = {
  uid: string;
  username?: string | null;
  page: string;
  activity?: string | null;
  lessonId?: number | null;
  progressPct?: number | null;
  isOnline: boolean;
  updatedAt: number; // ms
};

export type PresenceProps = {
  page: string;
  activity?: string;
  lessonId?: number;
  progressPct?: number;
};

/** ===== Вспомогалки ===== */
const UID_KEY = 'presence_uid';

/** Стабильный uid вкладки/устройства (для аналитики; в БД не обязателен) */
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

/** Username из Telegram WebApp (если есть) */
function getTgUsername(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.username ?? null;
  } catch {
    return null;
  }
}

/** ===== Компонент heartbeats в Supabase ===== */
export default function PresenceClient({ page, activity, lessonId, progressPct }: PresenceProps) {
  const timer = useRef<number | null>(null);
  const uid = useMemo(getUid, []);
  const username = useMemo(getTgUsername, []);

  useEffect(() => {
    let cancelled = false;

    // гарантируем, что есть jwt (app_role) перед первой записью
    initSupabaseFromTelegram().catch(() => {});

    const beat = async (online: boolean) => {
      if (cancelled) return;
      try {
        await writePresence({
          page,
          activity,
          lessonId: lessonId ?? null,
          progressPct: typeof progressPct === 'number' ? progressPct : undefined,
          username: username ?? null,
          // isOnline флаг в БД не требуется — онлайн считаем по updated_at;
          // но если у вас в edge-функции он обрабатывается, можно передать в meta.
        });
      } catch (e) {
        // тихо падаем — это вспомогательная телеметрия
        // eslint-disable-next-line no-console
        console.warn('presence write failed', e);
      }
    };

    // первый пульс сразу
    void beat(true);

    // далее — каждые 15 сек
    timer.current = window.setInterval(() => {
      void beat(true);
    }, 15000);

    // при возвращении во вкладку — тоже пульс
    const onVisible = () => {
      if (document.visibilityState === 'visible') void beat(true);
    };
    document.addEventListener('visibilitychange', onVisible);

    // при закрытии/перезагрузке — финальный пульс
    const onUnload = () => {
      void beat(false);
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      cancelled = true;
      if (timer.current) window.clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('beforeunload', onUnload);
      void beat(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activity, lessonId, progressPct, uid, username]);

  return null;
}
