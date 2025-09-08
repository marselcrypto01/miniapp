// lib/tgAuth.ts
'use client';

/** Ответ "авторизации" в локальном (гостевом) режиме */
type TgAuthResponse = {
  token: string;               // фиктивный гостевой токен
  clientId: string;            // локальный анонимный id
  role: 'user' | 'admin';
  start_param?: string;
};

const STORAGE_TOKEN  = 'cm_token';
const STORAGE_CLIENT = 'cm_clientId';
const STORAGE_ROLE   = 'cm_role';

/** Простой генератор id */
function uuid(): string {
  // @ts-ignore
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Всегда "успешная" авторизация без Telegram и бэкенда.
 * Создаёт (или читает) локальные токены и возвращает их.
 */
export async function callTgAuth(): Promise<TgAuthResponse> {
  let token    = null;
  let clientId = null;
  let role     = null;

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

  return {
    token: token!,
    clientId: clientId!,
    role: (role ?? 'user') as 'user' | 'admin',
  };
}

/** Геттер RLS-токена из localStorage (может быть гостевым) */
export function getRlsToken(): string | null {
  try { return localStorage.getItem(STORAGE_TOKEN); } catch { return null; }
}

/**
 * Универсальный REST-запрос к Supabase.
 * Если реального RLS-токена нет — работаем только с anon key (fallback),
 * чтобы приложение не падало при браузерном запуске.
 */
export async function restFetch(path: string, init?: RequestInit) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const rls  = getRlsToken(); // может быть "guest-*"

  const url = `${base}/rest/v1/${path}`;
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('apikey', anon);

  // Если где-то появится реальный RLS (из прод-авторизации) — используем его.
  if (rls) headers.set('Authorization', `Bearer ${rls}`);

  const res  = await fetch(url, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(json)}`);
  return json;
}
