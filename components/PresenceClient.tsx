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

/** ===== Компонент heartbeats в Supabase (расширенный) ===== */
export default function PresenceClient({ page, activity, lessonId, progressPct }: PresenceProps) {
  const timer = useRef<number | null>(null);
  const uid = useMemo(getUid, []);
  const username = useMemo(getTgUsername, []);

  useEffect(() => {
    let cancelled = false;

    // Даем понять глобальному AppHeartbeat, что «владелец» — этот компонент
    const w = window as any;
    w.__presenceOwner = 'PresenceClient';
    // и актуальный контекст на всякий случай
    w.__presencePage = page;

    const start = async () => {
      try {
        // ждём JWT, чтобы связать client_id
        await initSupabaseFromTelegram().catch(() => {});

        const beat = async () => {
          if (cancelled) return;
          try {
            await writePresence({
              page,
              activity,
              lessonId: lessonId ?? null,
              progressPct: typeof progressPct === 'number' ? progressPct : undefined,
              username: username ?? null,
            });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('presence write failed', e);
          }
        };

        // первый пульс
        await beat();

        // далее — каждые 15 сек
        timer.current = window.setInterval(() => {
          void beat();
        }, 15000);

        // пульс при возврате во вкладку
        const onVisible = () => {
          if (document.visibilityState === 'visible') void beat();
        };
        document.addEventListener('visibilitychange', onVisible);

        // финальный best-effort
        const onUnload = () => { void beat(); };
        window.addEventListener('beforeunload', onUnload);

        return () => {
          document.removeEventListener('visibilitychange', onVisible);
          window.removeEventListener('beforeunload', onUnload);
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('presence init failed', e);
      }
    };

    const cleanupPromise = start();

    return () => {
      cancelled = true;
      if (timer.current) window.clearInterval(timer.current);
      // освобождаем «владение» — вдруг на другой странице только AppHeartbeat
      const ww = window as any;
      if (ww.__presenceOwner === 'PresenceClient') {
        ww.__presenceOwner = undefined;
      }
      void cleanupPromise;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activity, lessonId, progressPct, uid, username]);

  return null;
}
