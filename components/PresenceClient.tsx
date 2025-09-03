'use client';

import { useEffect, useRef } from 'react';
import { writePresence } from '@/lib/db';

/** ===== Типы (то, что нужно админке) ===== */
export type PresenceSession = {
  uid: string;
  username?: string | null;
  page: string;                 // 'home' | 'lesson' | 'admin' | ...
  activity?: string | null;
  lessonId?: number | null;
  progressPct?: number;
  isOnline: boolean;
  updatedAt: number;            // ms
};

export type PresenceProps = {
  page: string;
  activity?: string;
  lessonId?: number;
  progressPct?: number;
};

/** ===== Ключи в localStorage ===== */
const STORE_KEY = 'presence_store';
const UID_KEY = 'presence_uid';

/** Безопасное чтение из LS */
function safeParse<T>(raw: string | null, fallback: T): T {
  try { return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

/** Сгенерировать/получить uid браузера (общий с Home/lesson) */
function getUid(): string {
  let uid = '';
  try {
    uid = localStorage.getItem(UID_KEY) || '';
    if (!uid) {
      uid =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(UID_KEY, uid);
    }
  } catch {}
  return uid || 'anonymous';
}

/** Username из Telegram WebApp (если есть) */
function getTgUsername(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.username ?? null;
  } catch { return null; }
}

/** ==== ПУБЛИЧНЫЙ util: прочитать последнее состояние всех сессий из LS ==== */
export function readPresenceStore(): PresenceSession[] {
  if (typeof window === 'undefined') return [];
  const arr = safeParse<PresenceSession[]>(localStorage.getItem(STORE_KEY), []);
  const byUid = new Map<string, PresenceSession>();
  for (const s of Array.isArray(arr) ? arr : []) {
    const prev = byUid.get(s.uid);
    if (!prev || (s.updatedAt ?? 0) > (prev.updatedAt ?? 0)) byUid.set(s.uid, s);
  }
  return [...byUid.values()];
}

/** Локальная запись в LS + пинг в Supabase */
async function upsertSession(partial: Partial<PresenceSession>) {
  const uid = getUid();
  const list = safeParse<PresenceSession[]>(localStorage.getItem(STORE_KEY), []);
  const meIdx = list.findIndex((x) => x.uid === uid);
  const username = getTgUsername();

  const next: PresenceSession = {
    uid,
    username,
    page: partial.page ?? (list[meIdx]?.page ?? 'unknown'),
    activity: partial.activity ?? list[meIdx]?.activity ?? null,
    lessonId: partial.lessonId ?? list[meIdx]?.lessonId ?? null,
    progressPct: partial.progressPct ?? list[meIdx]?.progressPct,
    isOnline: partial.isOnline ?? true,
    updatedAt: Date.now(),
  };

  if (meIdx >= 0) list[meIdx] = next;
  else list.push(next);

  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch {}

  // ПИНГ в Supabase (fire-and-forget)
  try {
    await writePresence({
      page: next.page,
      activity: next.activity ?? undefined,
      lessonId: next.lessonId ?? null,
      progressPct: next.progressPct ?? undefined,
      username: next.username ?? null,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('presence: supabase write error', e);
  }
}

/** Клиентский компонент, который «пингует» состояние */
export default function PresenceClient({ page, activity, lessonId, progressPct }: PresenceProps) {
  const timer = useRef<number | null>(null);

  useEffect(() => {
    // первая запись
    void upsertSession({ page, activity, lessonId, progressPct, isOnline: true });

    // пинги раз в 15 сек
    timer.current = window.setInterval(() => {
      void upsertSession({ page, activity, lessonId, progressPct, isOnline: true });
    }, 15000);

    // при возврате во вкладку — тоже пинганём
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void upsertSession({ page, activity, lessonId, progressPct, isOnline: true });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // при уходе — offline
    const handleUnload = () => {
      void upsertSession({ page, activity, lessonId, progressPct, isOnline: false });
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (timer.current) window.clearInterval(timer.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      void upsertSession({ page, activity, lessonId, progressPct, isOnline: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activity, lessonId, progressPct]);

  return null;
}
