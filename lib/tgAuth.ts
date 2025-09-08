// lib/tgAuth.ts
'use client';

import { supabase } from './supabaseClient';

type TgAuthResponse = {
  token: string;
  clientId: string;
  role: 'user' | 'admin';
  start_param?: string;
};

const STORAGE_TOKEN  = 'cm_token';
const STORAGE_CLIENT = 'cm_clientId';
const STORAGE_ROLE   = 'cm_role';

/* ───────── helpers ───────── */

/** Мгновенная попытка вытащить initData из WebApp/URL-хэша (без проверок окружения). */
function readInitDataNow(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const direct = w?.Telegram?.WebApp?.initData as string | undefined;
    if (direct && direct.length > 0) return direct;

    const hash = window.location.hash || '';
    const m = hash.match(/tgWebAppData=([^&]+)/);
    if (m?.[1]) return decodeURIComponent(m[1]);
  } catch {}
  return null;
}

/** Простой генератор id */
function uuid(): string {
  // @ts-ignore
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ───────── публичные функции ───────── */

/**
 * Авторизация без жёсткой проверки Telegram.
 * - Если есть initData → вызываем edge function `tg-auth` и сохраняем реальный RLS токен.
 * - Если initData нет или invoke упал → создаём/используем гостевой локальный токен (работает в браузере).
 */
export async function callTgAuth(): Promise<TgAuthResponse> {
  // 1) Пытаемся сделать реальную авторизацию через Telegram initData
  const initData = readInitDataNow();
  if (initData) {
    try {
      const { data, error } = await supabase.functions.invoke('tg-auth', { body: { initData } });
      if (error) throw error;

      const res = data as TgAuthResponse;

      try {
        localStorage.setItem(STORAGE_TOKEN,  res.token);
        localStorage.setItem(STORAGE_CLIENT, res.clientId);
        localStorage.setItem(STORAGE_ROLE,   res.role);
      } catch {}

      return res;
    } catch {
      // упало — пойдём в гостя
    }
  }

  // 2) Гостевой режим (вне Telegram, либо invoke не удался)
  let token    = null;
  let clientId = null;
  let role: 'user' | 'admin' = 'user';

  try {
    token    = localStorage.getItem(STORAGE_TOKEN);
    clientId = localStorage.getItem(STORAGE_CLIENT);
    role     = (localStorage.getItem(STORAGE_ROLE) as 'user' | 'admin' | null) ?? 'user';
  } catch {}

  if (!clientId) {
    clientId = 'guest-' + uuid();
    try { localStorage.setItem(STORAGE_CLIENT, clientId); } catch {}
  }
  if (!token) {
    token = 'guest-' + uuid();
    try { localStorage.setItem(STORAGE_TOKEN, token); } catch {}
  }
  try { localStorage.setItem(STORAGE_ROLE, role ?? 'user'); } catch {}

  return { token: token!, clientId: clientId!, role };
}

/** Геттер RLS-токена из localStorage (может быть гостевым). */
export function getRlsToken(): string | null {
  try { return localStorage.getItem(STORAGE_TOKEN); } catch { return null; }
}

/**
 * Универсальный REST-запрос к Supabase.
 * - Если есть реальный RLS-токен → добавляем Authorization.
 * - Если токена нет (гость) → работаем только с anon key (публичные таблицы).
 * Никаких ошибок «сначала вызовите tg-auth» больше нет.
 */
export async function restFetch(path: string, init?: RequestInit) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const rls  = getRlsToken();

  const url = `${base}/rest/v1/${path}`;
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('apikey', anon);
  if (rls) headers.set('Authorization', `Bearer ${rls}`);

  const res  = await fetch(url, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(json)}`);
  return json;
}
