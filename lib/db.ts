// lib/db.ts
'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* ───────────────────────────── ENV ───────────────────────────── */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TG_AUTH_URL = `${SUPABASE_URL}/functions/v1/tg-auth`; // edge-function

/* ─────────────────────── Кеш auth в браузере ─────────────────── */
type AuthCache = { token: string; clientId: string; role: 'user' | 'admin'; exp: number };
const LS_AUTH_KEY = 'sb_tg_auth_v1';

function loadAuth(): AuthCache | null {
  try {
    const raw = localStorage.getItem(LS_AUTH_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as AuthCache;
    if (!obj?.token || !obj?.clientId || !obj?.exp) return null;
    if (Date.now() > obj.exp * 1000) return null; // истёк
    return obj;
  } catch {
    return null;
  }
}
function saveAuth(a: AuthCache) {
  try { localStorage.setItem(LS_AUTH_KEY, JSON.stringify(a)); } catch {}
}

/* ────────────── Singleton Supabase client с JWT в хедерах ────── */
let supa: SupabaseClient | null = null;
let authState: AuthCache | null = null;

function makeClient(token: string) {
  supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function exchangeInitDataToJwt(): Promise<AuthCache> {
  // читаем initData из Telegram WebApp
  // @ts-ignore
  const wa = (window as any)?.Telegram?.WebApp;
  const initData = wa?.initData;
  if (!initData || !initData.length) {
    throw new Error('Telegram initData not found. Открой через бота.');
  }

  const r = await fetch(TG_AUTH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData }),
  });
  if (!r.ok) {
    const e = await r.text().catch(() => '');
    throw new Error(`tg-auth failed: ${r.status} ${e}`);
  }
  const { token, clientId, role } = await r.json();

  // exp берём из payload токена (база64). fallback: +6h.
  let exp = Math.floor(Date.now() / 1000) + 6 * 60 * 60;
  try {
    const parts = String(token).split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload?.exp) exp = Number(payload.exp);
    }
  } catch {}

  return { token, clientId, role, exp };
}

/** Публичная точка инициализации. Дерни один раз в app/page, Courses и т.д. */
export async function initSupabaseFromTelegram(): Promise<{
  clientId: string; role: 'user' | 'admin';
}> {
  // 1) из кеша
  const cached = loadAuth();
  if (cached) {
    authState = cached;
    makeClient(cached.token);
    return { clientId: cached.clientId, role: cached.role };
  }
  // 2) обмен через edge-function
  const fresh = await exchangeInitDataToJwt();
  authState = fresh;
  saveAuth(fresh);
  makeClient(fresh.token);
  return { clientId: fresh.clientId, role: fresh.role };
}

/** Внутренний геттер клиента — гарантирует, что он проиниц. */
async function getClient(): Promise<SupabaseClient> {
  if (supa) return supa;
  // пробуем подняться из кеша (без запроса к tg-auth)
  const cached = loadAuth();
  if (cached) {
    authState = cached;
    makeClient(cached.token);
    return supa!;
  }
  // иначе просим полноценную инициализацию
  await initSupabaseFromTelegram();
  return supa!;
}

/** Текущий clientId из authState (может пригодиться снаружи) */
export function getCurrentClientId(): string | null {
  return authState?.clientId ?? null;
}
export function getCurrentRole(): 'user' | 'admin' | null {
  return authState?.role ?? null;
}

/* ───────────────────────── LESSONS ───────────────────────────── */
export type DbLesson = {
  id: number;
  title: string | null;
  subtitle?: string | null;
  has_test: boolean | null;
  order_index?: number | null;
};

export async function listLessons(): Promise<DbLesson[]> {
  const sb = await getClient();
  const { data, error } = await sb
    .from('lessons')
    .select('id,title,subtitle,has_test,order_index')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/* ───────────────────────── QUOTES ────────────────────────────── */
export async function getRandomDailyQuote(): Promise<string> {
  const sb = await getClient();
  // сначала RPC (если функция есть)
  try {
    const { data, error } = await sb.rpc('get_random_quote');
    if (!error && data) {
      const t = String(data);
      if (t) return t;
    }
  } catch {}
  // табличный путь
  const { data, error } = await sb.from('daily_quotes').select('text');
  if (error) return 'Успех любит дисциплину.';
  const list = (data ?? []).map((r: any) => String(r.text)).filter(Boolean);
  if (!list.length) return 'Успех любит дисциплину.';
  return list[Math.floor(Math.random() * list.length)];
}

/* ───────────────────────── PROGRESS ──────────────────────────── */
export type DbProgressRow = {
  client_id: string;
  lesson_id: number;
  status: 'completed' | 'pending';
  updated_at?: string;
};

/** Читает прогресс ТОЛЬКО текущего пользователя (RLS) */
export async function getUserProgress(): Promise<DbProgressRow[]> {
  const sb = await getClient();
  const { data, error } = await sb
    .from('lesson_progress')
    .select('client_id,lesson_id,status,updated_at');
  if (error) throw error;
  return (data as DbProgressRow[]) ?? [];
}

/** Полная синхронизация для текущего пользователя под RLS */
export async function saveUserProgress(
  progress: Array<{ lesson_id: number; status: 'completed' | 'pending' }>
): Promise<void> {
  const sb = await getClient();
  const clientId = authState?.clientId;
  if (!clientId) throw new Error('clientId is empty');

  // Чистим только свои строки (RLS пропустит только свои)
  const del = await sb.from('lesson_progress').delete().gte('lesson_id', 1);
  if (del.error) throw del.error;

  if (!progress.length) return;

  const rows: DbProgressRow[] = progress.map((p) => ({
    client_id: clientId,
    lesson_id: p.lesson_id,
    status: p.status,
  }));
  const ins = await sb.from('lesson_progress').insert(rows);
  if (ins.error) throw ins.error;
}

/* ───────────────────────── PRESENCE ──────────────────────────── */
export async function writePresence(input: {
  page: string;
  activity?: string;
  lessonId?: number | null;
  progressPct?: number;
  username?: string | null;
}): Promise<void> {
  try {
    const sb = await getClient();
    const clientId = authState?.clientId ?? null;
    await sb.from('presence_live').upsert({
      client_id: clientId,
      page: input.page,
      activity: input.activity ?? null,
      lesson_id: input.lessonId ?? null,
      progress_pct: input.progressPct ?? null,
      username: input.username ?? null,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('writePresence error', error);
  }
}

/* ───────────────────────── LEADS (заявки) ────────────────────── */
// Если захочешь использовать:
export async function createLead(input: {
  lead_type: 'consult' | 'course';
  message?: string;
}): Promise<void> {
  const sb = await getClient();
  const client_id = authState?.clientId ?? null;
  const username =
    // @ts-ignore
    (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.username || null;

  const { error } = await sb.from('leads').insert({
    client_id,
    username,
    lead_type: input.lead_type,
    message: input.message ?? null,
  });
  if (error) throw error;
}
