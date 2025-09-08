// lib/db.ts
'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { callTgAuth } from './tgAuth'; // наш быстрый "гостевой" auth

/* ───────────── ENV ───────────── */
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/* ───────── Публичный клиент ───────── */
const sbPublic = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { apikey: SUPABASE_ANON } },
});

/* ───────────── Кеш JWT (для RLS-операций) ───────────── */
type AuthCache = { token: string; clientId: string; role: 'user' | 'admin'; exp: number };
const LS_AUTH_KEY = 'sb_tg_auth_v2';

function loadAuth(): AuthCache | null {
  try {
    const raw = localStorage.getItem(LS_AUTH_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as AuthCache;
    if (!a?.token || !a?.clientId || !a?.exp) return null;
    if (Date.now() > a.exp * 1000) return null;
    return a;
  } catch { return null; }
}
function saveAuth(a: AuthCache) {
  try { localStorage.setItem(LS_AUTH_KEY, JSON.stringify(a)); } catch {}
}
export function clearAuthCache() {
  try { localStorage.removeItem(LS_AUTH_KEY); } catch {}
}

/* ───────────── Клиент под ваш RLS-токен ───────────── */
let rlsClient: SupabaseClient | null = null;
let authState: AuthCache | null = null;

function makeRlsClient(token: string) {
  rlsClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON } },
  });
}

/* ───────────── МГНОВЕННАЯ инициализация ─────────────
   Никаких ожиданий Telegram: создаём "гостевой" токен и работаем. */
export async function initSupabaseFromTelegram(): Promise<{ clientId: string; role: 'user' | 'admin' }> {
  const cached = loadAuth();
  if (cached) {
    authState = cached;
    makeRlsClient(cached.token);
    return { clientId: cached.clientId, role: cached.role };
  }

  const guest = await callTgAuth(); // моментальный локальный токен
  // guest-token без exp — ставим +24ч
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  authState = { token: guest.token, clientId: guest.clientId, role: guest.role, exp };
  saveAuth(authState);
  makeRlsClient(authState.token);
  return { clientId: authState.clientId, role: authState.role };
}

/* ───────────── Внутренний геттер клиента ───────────── */
async function getClient(): Promise<SupabaseClient | null> {
  if (rlsClient) return rlsClient;
  const cached = loadAuth();
  if (cached) {
    authState = cached;
    makeRlsClient(cached.token);
    return rlsClient!;
  }
  // не блокируем: инициализируем гостя в фоне
  initSupabaseFromTelegram().catch(() => {});
  return null; // пока нет — вернёмся позже
}

/* ───────────── Геттеры состояния ───────────── */
export function getCurrentClientId(): string | null { return authState?.clientId ?? null; }
export function getCurrentRole(): 'user' | 'admin' | null { return authState?.role ?? null; }

/* ╔═══════════════════ ДАЛЬШЕ — ДАННЫЕ ═══════════════════╗ */
export type DbLesson = {
  id: number;
  title: string | null;
  subtitle?: string | null;
  has_test: boolean | null;
  order_index?: number | null;
};

export async function listLessons(): Promise<DbLesson[]> {
  const { data, error } = await sbPublic
    .from('lessons')
    .select('id,title,subtitle,has_test,order_index')
    .order('order_index', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbLesson[];
}

/* QUOTES */
export async function getRandomDailyQuote(): Promise<string> {
  try {
    const { data, error } = await sbPublic.rpc('get_random_quote');
    if (!error && data) {
      const t = String(data);
      if (t) return t;
    }
  } catch {}
  const { data } = await sbPublic.from('daily_quotes').select('text');
  const list = (data ?? []).map((r: any) => String(r.text)).filter(Boolean);
  return list.length ? list[Math.floor(Math.random() * list.length)] : 'Успех любит дисциплину.';
}

/* PROGRESS (если нет RLS — no-op; UI берёт из localStorage) */
export type DbProgressRow = {
  client_id: string;
  lesson_id: number;
  status: 'completed' | 'pending';
  username?: string | null;
  updated_at?: string;
};

export async function getUserProgress(): Promise<DbProgressRow[]> {
  const sb = await getClient();
  if (!sb) return []; // нет клиента — грузим из LS на стороне страницы
  const { data, error } = await sb
    .from('lesson_progress')
    .select('client_id,lesson_id,status,username,updated_at')
    .order('lesson_id', { ascending: true });
  if (error) throw error;
  return (data as DbProgressRow[]) ?? [];
}

export async function saveUserProgress(
  progress: Array<{ lesson_id: number; status: 'completed' | 'pending' }>
): Promise<void> {
  const sb = await getClient();
  if (!sb || !authState?.clientId) return; // пока нет RLS — просто выходим
  const rows: DbProgressRow[] = progress.map((p) => ({
    client_id: authState!.clientId,
    lesson_id: p.lesson_id,
    status: p.status,
    username: null,
  }));
  const { error } = await sb.from('lesson_progress').upsert(rows, { onConflict: 'client_id,lesson_id' });
  if (error) throw error;
}

/* PRESENCE — пишем через публичный клиент (RLS off), ошибки глотаем */
export async function writePresence(input: {
  page: string;
  activity?: string;
  lessonId?: number | null;
  progressPct?: number;
  username?: string | null;
}): Promise<void> {
  try {
    await sbPublic.from('presence_live').insert({
      client_id: authState?.clientId ?? null,
      page: input.page,
      activity: input.activity ?? null,
      lesson_id: input.lessonId ?? null,
      progress_pct: typeof input.progressPct === 'number' ? input.progressPct : null,
      username: input.username ?? null,
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

/* LEADS — больше не требуем initData (чтобы не тормозить мобилу) */
export async function createLead(input: {
  lead_type: 'consult' | 'course';
  name?: string;
  handle?: string;
  phone?: string;
  comment?: string;
  message?: string;
}): Promise<void> {
  try {
    await sbPublic.functions.invoke('submit-lead', { body: { ...input } });
  } catch (e) {
    console.warn('createLead failed', e);
  }
}
