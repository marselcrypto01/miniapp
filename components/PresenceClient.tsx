'use client';

import { useEffect, useRef } from 'react';

/** ===== Типы (то, что нужно админке) ===== */
export type PresenceSession = {
  uid: string;
  username?: string | null;
  page: string;            // 'home' | 'lesson' | 'admin' | ...
  activity?: string | null;
  lessonId?: number;
  progressPct?: number;
  isOnline: boolean;
  updatedAt: number;       // ms
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
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Сгенерировать/получить uid браузера */
function getUid(): string {
  let uid = localStorage.getItem(UID_KEY);
  if (!uid) {
    uid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem(UID_KEY, uid); } catch {}
  }
  return uid;
}

/** Прочитать все сессии (используется в админке) */
export function readPresenceStore(): PresenceSession[] {
  if (typeof window === 'undefined') return [];
  const arr = safeParse<PresenceSession[]>(localStorage.getItem(STORE_KEY), []);
  // лёгкая чистка мусора (оставим последние записи по uid)
  const byUid = new Map<string, PresenceSession>();
  for (const s of Array.isArray(arr) ? arr : []) {
    const prev = byUid.get(s.uid);
    if (!prev || (s.updatedAt ?? 0) > (prev.updatedAt ?? 0)) byUid.set(s.uid, s);
  }
  return [...byUid.values()];
}

/** Записать/обновить свою сессию */
function upsertSession(partial: Partial<PresenceSession>) {
  const uid = getUid();
  const list = safeParse<PresenceSession[]>(localStorage.getItem(STORE_KEY), []);
  const meIdx = list.findIndex((x) => x.uid === uid);
  const username =
    (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.username ?? null;

  const next: PresenceSession = {
    uid,
    username,
    page: partial.page ?? (list[meIdx]?.page ?? 'unknown'),
    activity: partial.activity ?? list[meIdx]?.activity ?? null,
    lessonId: partial.lessonId ?? list[meIdx]?.lessonId,
    progressPct: partial.progressPct ?? list[meIdx]?.progressPct,
    isOnline: partial.isOnline ?? true,
    updatedAt: Date.now(),
  };

  if (meIdx >= 0) list[meIdx] = next;
  else list.push(next);

  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch {}
}

/** Клиентский компонент, который «пингует» админке наше состояние */
export default function PresenceClient({
  page,
  activity,
  lessonId,
  progressPct,
}: PresenceProps) {
  const timer = useRef<number | null>(null);

  useEffect(() => {
    // первая запись
    upsertSession({ page, activity, lessonId, progressPct, isOnline: true });

    // пинги раз в 15 сек
    timer.current = window.setInterval(() => {
      upsertSession({ page, activity, lessonId, progressPct, isOnline: true });
    }, 15000);

    // при размонтировании/уходе — отметим оффлайн
    const handleUnload = () => {
      upsertSession({ page, activity, lessonId, progressPct, isOnline: false });
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (timer.current) window.clearInterval(timer.current);
      window.removeEventListener('beforeunload', handleUnload);
      upsertSession({ page, activity, lessonId, progressPct, isOnline: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activity, lessonId, progressPct]);

  return null;
}
