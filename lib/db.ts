// lib/db.ts
'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* ───────────── ENV ───────────── */
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/* ───────────── Клиент для Edge Functions (без кастомного Bearer) ───────────── */
const sbPublic = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ───────────── Кеш авторизации (ваш кастомный JWT для RLS) ───────────── */
type AuthCache = { token: string; clientId: string; role: 'user' | 'admin'; exp: number };
const LS_AUTH_KEY = 'sb_tg_auth_v1';

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

/* ───────────── Клиент под ваш RLS-токен ───────────── */
let rlsClient: SupabaseClient | null = null;
let authState: AuthCache | null = null;

function makeRlsClient(token: string) {
  rlsClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Критично: все запросы к Таблицам/REST будут идти с вашим кастомным JWT
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/* ───────────── Получаем initData из Telegram WebApp ───────────── */
function getTelegramInitData(): string {
  const w = window as any;
  const direct = w?.Telegram?.WebApp?.initData as string | undefined;
  if (direct && direct.length > 0) return direct;

  const m = (window.location.hash || '').match(/tgWebAppData=([^&]+)/);
  if (m?.[1]) return decodeURIComponent(m[1]);

  throw new Error('initData не найдено. Откройте мини-приложение из Telegram.');
}

/* ───────────── Обмен initData -> ваш JWT через Edge Function ───────────── */
async function exchangeInitDataToJwt(): Promise<AuthCache> {
  const initData = getTelegramInitData();

  // ВАЖНО: вызываем через supabase-js → SDK сам добавит Authorization/apikey
  const { data, error } = await sbPublic.functions.invoke('tg-auth', {
    body: { initData },
  });
  if (error) throw error;

  const { token, clientId, role } = data as { token: string; clientId: string; role: 'user'|'admin' };

  // exp из payload токена, fallback: +6h
  let exp = Math.floor(Date.now() / 1000) + 6 * 60 * 60;
  try {
    const payload = JSON.parse(atob(String(token).split('.')[1]));
    if (payload?.exp) exp = Number(payload.exp);
  } catch {}

  return { token, clientId, role, exp };
}

/* ───────────── Публичная инициализация (дергать один раз на странице) ───────────── */
export async function initSupabaseFromTelegram(): Promise<{ clientId: string; role: 'user' | 'admin' }> {
  // 1) пробуем кеш
  const cached = loadAuth();
  if (cached) {
    authState = cached;
    makeRlsClient(cached.token);
    return { clientId: cached.clientId, role: cached.role };
  }

  // 2) берём новый токен через Edge Function
  const fresh = await exchangeInitDataToJwt();
  authState = fresh;
  saveAuth(fresh);
  makeRlsClient(fresh.token);
  return { clientId: fresh.clientId, role: fresh.role };
}

/* ───────────── Внутренний геттер клиента под RLS ───────────── */
async function getClient(): Promise<SupabaseClient> {
  if (rlsClient) return rlsClient;

  const cached = loadAuth();
  if (cached) {
    authState = cached;
    makeRlsClient(cached.token);
    return rlsClient!;
  }

  await initSupabaseFromTelegram();
  return rlsClient!;
}

/* ───────────── Геттеры текущего состояния ───────────── */
export function getCurrentClientId(): string | null { return authState?.clientId ?? null; }
export function getCurrentRole(): 'user' | 'admin' | null { return authState?.role ?? null; }

/* ╔═══════════════════ БЛОКИ ДАННЫХ (таблицы/функции) ═══════════════════╗ */

/* ───── LESSONS ───── */
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
    .order('order_index', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbLesson[];
}

/* ───── QUOTES ───── */
export async function getRandomDailyQuote(): Promise<string> {
  const sb = await getClient();

  // Если есть RPC-функция
  try {
    const { data, error } = await sb.rpc('get_random_quote');
    if (!error && data) {
      const t = String(data);
      if (t) return t;
    }
  } catch {}

  // Фолбэк на таблицу
  const { data } = await sb.from('daily_quotes').select('text');
  const list = (data ?? []).map((r: any) => String(r.text)).filter(Boolean);
  return list.length ? list[Math.floor(Math.random() * list.length)] : 'Успех любит дисциплину.';
}

/* ───── PROGRESS ───── */
export type DbProgressRow = {
  client_id: string;
  lesson_id: number;
  status: 'completed' | 'pending';
  updated_at?: string;
};

export async function getUserProgress(): Promise<DbProgressRow[]> {
  const sb = await getClient();
  const { data, error } = await sb
    .from('lesson_progress')
    .select('client_id,lesson_id,status,updated_at');
  if (error) throw error;
  return (data as DbProgressRow[]) ?? [];
}

/** Полная синхронизация прогресса для текущего пользователя (RLS ограничит только свои строки). */
export async function saveUserProgress(
  progress: Array<{ lesson_id: number; status: 'completed' | 'pending' }>
): Promise<void> {
  const sb = await getClient();
  // Сначала чистим свои записи
  const del = await sb.from('lesson_progress').delete().gte('lesson_id', 1);
  if (del.error) throw del.error;

  if (!progress.length) return;

  const rows: DbProgressRow[] = progress.map((p) => ({
    client_id: authState!.clientId,
    lesson_id: p.lesson_id,
    status: p.status,
  }));
  const ins = await sb.from('lesson_progress').insert(rows);
  if (ins.error) throw ins.error;
}

/* ───── PRESENCE (онлайн-след) ───── */
export async function writePresence(input: {
  page: string;
  activity?: string;
  lessonId?: number | null;
  progressPct?: number;
  username?: string | null;
}): Promise<void> {
  try {
    const sb = await getClient();
    await sb.from('presence_live').upsert({
      client_id: authState?.clientId ?? null,
      page: input.page,
      activity: input.activity ?? null,
      lesson_id: input.lessonId ?? null,
      progress_pct: input.progressPct ?? null,
      username: input.username ?? null,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('writePresence error', e);
  }
}

/* ───── LEADS (заявки) ─────
   Таблица public.leads (пример):
   id uuid default gen_random_uuid(), created_at timestamptz default now(),
   client_id text, username text, lead_type text, message text.
*/
export async function createLead(input: {
  lead_type: 'consult' | 'course';
  message?: string;
}): Promise<void> {
  const sb = await getClient();
  const username =
    (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.username || null;

  const { error } = await sb.from('leads').insert({
    client_id: authState?.clientId ?? null,
    username,
    lead_type: input.lead_type,
    message: input.message ?? null,
  });
  if (error) throw error;
}
