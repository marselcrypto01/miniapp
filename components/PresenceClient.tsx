'use client';

import { useEffect, useMemo } from 'react';

export type PresencePage = 'home' | 'lesson' | 'admin';

export type PresenceProps = {
  page: PresencePage;
  activity?: string;
  lessonId?: number;
  progressPct?: number;
};

export type PresenceSession = {
  uid: string;                // уникальный id вкладки/пользователя
  username?: string;          // тг-ник, если есть
  page: PresencePage;         // 'home' | 'lesson' | 'admin'
  activity?: string;          // произв. описание
  lessonId?: number;          // для уроков
  progressPct?: number;       // % прогресса (для главной)
  isOnline: boolean;          // онлайн/оффлайн
  updatedAt: number;          // ms timestamp
};

// внутреннее хранилище (в localStorage объект: { [uid]: PresenceSession })
type PresenceStore = Record<string, PresenceSession>;

const STORE_KEY = 'presence_store_v1';
const UID_KEY   = 'presence_uid_v1';

// ---------- helpers ----------
function getOrCreateUid(): string {
  try {
    let uid = sessionStorage.getItem(UID_KEY);
    if (!uid) {
      uid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(UID_KEY, uid);
    }
    return uid;
  } catch {
    // если sessionStorage недоступен
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function writePresence(entry: PresenceSession) {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const store: PresenceStore = raw ? JSON.parse(raw) : {};
    store[entry.uid] = entry;
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {}
}

export function readPresenceStore(): PresenceSession[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const store: PresenceStore = JSON.parse(raw);
    return Object.values(store).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

// ---------- компонент ----------
export default function PresenceClient({
  page,
  activity,
  lessonId,
  progressPct,
}: PresenceProps) {
  const uid = useMemo(() => getOrCreateUid(), []);
  const username: string | undefined = (globalThis as any)?.Telegram?.WebApp
    ?.initDataUnsafe?.user?.username;

  useEffect(() => {
    // первичная запись
    const entry: PresenceSession = {
      uid,
      username,
      page,
      activity,
      lessonId,
      progressPct,
      isOnline: true,
      updatedAt: Date.now(),
    };
    writePresence(entry);

    // каждые 4 сек обновляем "живость"
    const t = setInterval(() => {
      writePresence({
        ...entry,
        activity,
        lessonId,
        progressPct,
        isOnline: true,
        updatedAt: Date.now(),
      });
    }, 4000);

    const onUnload = () => {
      writePresence({
        ...entry,
        activity,
        lessonId,
        progressPct,
        isOnline: false,
        updatedAt: Date.now(),
      });
    };

    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(t);
      onUnload();
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [uid, username, page, activity, lessonId, progressPct]);

  return null;
}
