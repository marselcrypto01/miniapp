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

/* ───────── helpers: чтение initData и детекция Telegram ───────── */

/** Мгновенно пробуем вытащить initData из WebApp/URL-хэша. */
function readInitDataNow(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const direct = w?.Telegram?.WebApp?.initData as string | undefined;
    if (direct && direct.length > 0) return direct;

    const hash = window.location.hash || '';
    const m = hash.match(/tgWebAppData=([^&]+)/);
    if (m?.[1]) return decodeURIComponent(m[1]);

    return null;
  } catch {
    return null;
  }
}

/** Похоже ли, что нас запустили внутри Telegram WebView. */
function looksLikeTelegram(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w?.Telegram?.WebApp) return true;

    const sp   = new URLSearchParams(location.search);
    const hash = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    if (sp.get('tgWebAppData') || hash.get('tgWebAppData')) return true;
    if (sp.get('tgWebAppStartParam') || hash.get('tgWebAppStartParam')) return true;

    const ua = navigator?.userAgent?.toLowerCase?.() || '';
    if (ua.includes('telegram')) return true;
  } catch {}
  return false;
}

/** Ждём initData коротко (по 100мс), максимум ~1.8 c. UI при этом НЕ блокируется. */
async function waitForTelegramInitData(timeoutMs = 1800): Promise<string> {
  // сначала — моментальная попытка
  const immediate = readInitDataNow();
  if (immediate) return immediate;

  // если это вообще не похоже на Telegram — не ждём вовсе
  if (!looksLikeTelegram()) {
    throw new Error('Not a Telegram WebApp environment');
  }

  // короткий цикл ожидания (для медленной сети/поздней инициализации)
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = readInitDataNow();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error('initData не найдено. Откройте мини-приложение из Telegram.');
}

/* ───────── публичные функции ───────── */

/**
 * Быстрый вызов Edge Function `tg-auth`.
 * - если НЕ Telegram — бросает понятную ошибку;
 * - если Telegram, но initData не успел прийти ~1.8 c — также бросает ошибку;
 * - при успехе кладёт токен/клиента/роль в localStorage.
 */
export async function callTgAuth(): Promise<TgAuthResponse> {
  const initData = await waitForTelegramInitData(); // быстрый таймаут, UI не блокируется
  const { data, error } = await supabase.functions.invoke('tg-auth', {
    body: { initData },
  });
  if (error) throw error;

  const res = data as TgAuthResponse;

  // сохраняем токен для RLS-запросов
  try {
    localStorage.setItem(STORAGE_TOKEN,  res.token);
    localStorage.setItem(STORAGE_CLIENT, res.clientId);
    localStorage.setItem(STORAGE_ROLE,   res.role);
  } catch {}

  return res;
}

/** Геттер RLS-токена из localStorage. */
export function getRlsToken(): string | null {
  try { return localStorage.getItem(STORAGE_TOKEN); } catch { return null; }
}

/** Универсальный REST-запрос к Supabase с вашим RLS-токеном. */
export async function restFetch(path: string, init?: RequestInit) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const rls  = getRlsToken();
  if (!rls) throw new Error('Нет RLS-токена. Сначала вызовите tg-auth.');

  const url = `${base}/rest/v1/${path}`;
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('apikey', anon);
  headers.set('Authorization', `Bearer ${rls}`);

  const res  = await fetch(url, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(json)}`);
  return json;
}
