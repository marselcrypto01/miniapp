// lib/tgAuth.ts
import { supabase } from './supabaseClient';

type TgAuthResponse = {
  token: string;
  clientId: string;
  role: 'user' | 'admin';
  start_param?: string;
};

const STORAGE_TOKEN = 'cm_token';
const STORAGE_CLIENT = 'cm_clientId';
const STORAGE_ROLE = 'cm_role';

/** Достаём initData из Telegram WebApp. Бросаем ошибку, если не нашли. */
function getTelegramInitData(): string {
  const w = window as any;
  const direct = w?.Telegram?.WebApp?.initData as string | undefined;
  if (direct && direct.length > 0) return direct;

  const hash = window.location.hash || '';
  const m = hash.match(/tgWebAppData=([^&]+)/);
  if (m?.[1]) return decodeURIComponent(m[1]);

  throw new Error('initData не найдено. Откройте мини-приложение из Telegram.');
}

/** Вызов Edge Function `tg-auth` через supabase-js (SDK сам добавит Authorization/apikey). */
export async function callTgAuth(): Promise<TgAuthResponse> {
  const initData = getTelegramInitData();
  const { data, error } = await supabase.functions.invoke('tg-auth', {
    body: { initData },
  });
  if (error) throw error;

  const res = data as TgAuthResponse;

  // сохраняем токен для RLS-запросов
  localStorage.setItem(STORAGE_TOKEN,  res.token);
  localStorage.setItem(STORAGE_CLIENT, res.clientId);
  localStorage.setItem(STORAGE_ROLE,   res.role);

  return res;
}

/** Геттер вашего RLS-токена (из Edge Function). */
export function getRlsToken(): string | null {
  try { return localStorage.getItem(STORAGE_TOKEN); } catch { return null; }
}

/** Универсальный fetch к REST c вашим RLS-токеном. */
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
