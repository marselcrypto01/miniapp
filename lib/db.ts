// lib/db.ts
'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* ───────────── ENV ───────────── */
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/* ───────── Публичный клиент (invoke + публичные чтения) ───────── */
const sbPublic = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON}`,
      apikey: SUPABASE_ANON,
    },
  },
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
    if (Date.now() > a.exp * 1000) return null; // истёк
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
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/* ───────────── Telegram helpers ───────────── */
function getTgUsername(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.username ?? null;
  } catch { return null; }
}

/** Читаем initData из SDK или из хэша tgWebAppData (если есть) */
function readInitDataOnce(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;

  const direct = w?.Telegram?.WebApp?.initData as string | undefined;
  if (direct && direct.length > 0) return direct;

  const hash = window.location.hash || '';
  const m = hash.match(/tgWebAppData=([^&]+)/);
  if (m?.[1]) return decodeURIComponent(m[1]);

  return null;
}

/** Мягкая эвристика: похоже ли окружение на Telegram */
function looksLikeTelegram(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w?.Telegram?.WebApp) return true;

    const sp   = new URLSearchParams(location.search);
    const hashStr = (location.hash || '').replace(/^#/, '');
    const hash = new URLSearchParams(hashStr);

    if (sp.get('tgWebAppData') || hash.get('tgWebAppData')) return true;
    if (sp.get('tgWebAppStartParam') || hash.get('tgWebAppStartParam')) return true;

    const ua = navigator?.userAgent?.toLowerCase?.() || '';
    if (ua.includes('telegram')) return true;
  } catch {}
  return false;
}

/**
 * Надёжно ждём initData до timeoutMs.
 * ВАЖНО: не делаем ранний "вне Telegram" — SDK часто появляется с задержкой.
 */
async function waitForInitData(timeoutMs = 6000): Promise<string> {
  // Быстрый путь
  const immediate = readInitDataOnce();
  if (immediate) return immediate;

  const start = Date.now();
  let sawWA = false;

  while (Date.now() - start < timeoutMs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w?.Telegram?.WebApp) sawWA = true;

    const init = readInitDataOnce();
    if (init) return init;

    await new Promise((r) => setTimeout(r, 100));
  }

  // По итогам ожидания: если даже намёков на Telegram нет — говорим, что не WebApp;
  // если намёки были, но initData так и не пришёл — просим запустить из бота.
  if (!sawWA && !looksLikeTelegram()) {
    throw new Error('Not a Telegram WebApp environment');
  }
  throw new Error('initData не найдено. Откройте мини-приложение из Telegram.');
}

/* ───────────── Обмен initData → JWT через Edge Function tg-auth ───────────── */
async function exchangeInitDataToJwt(initData: string): Promise<AuthCache> {
  const { data, error } = await sbPublic.functions.invoke('tg-auth', {
    body: { initData },
  });
  if (error) throw error;

  const { token, clientId, role } = data as { token: string; clientId: string; role: 'user' | 'admin' };

  // exp из payload токена; fallback: +6h
  let exp = Math.floor(Date.now() / 1000) + 6 * 60 * 60;
  try {
    const payload = JSON.parse(atob(String(token).split('.')[1]));
    if (payload?.exp) exp = Number(payload.exp);
  } catch {}

  return { token, clientId, role, exp };
}

/* ───────────── Инициализация RLS (ждём initData) ───────────── */
export async function initSupabaseFromTelegram(): Promise<{ clientId: string; role: 'user' | 'admin' }> {
  const cached = loadAuth();
  if (cached) {
    authState = cached;
    makeRlsClient(cached.token);
    return { clientId: cached.clientId, role: cached.role };
  }

  const initData = await waitForInitData();
  const fresh = await exchangeInitDataToJwt(initData);
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

/* ───────────── Геттеры состояния ───────────── */
export function getCurrentClientId(): string | null { return authState?.clientId ?? null; }
export function getCurrentRole(): 'user' | 'admin' | null { return authState?.role ?? null; }

/* ╔═══════════════════ ДАЛЬШЕ — РАБОТА С ДАННЫМИ ═══════════════════╗ */

/* LESSONS (публично читаемые) */
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

/* QUOTES (также публично читаемые) */
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

/* PROGRESS (требует RLS-JWT) */
export type DbProgressRow = {
  client_id: string;
  lesson_id: number;
  status: 'completed' | 'pending';
  username?: string | null;
  updated_at?: string;
};

export async function getUserProgress(): Promise<DbProgressRow[]> {
  const sb = await getClient();
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
  if (!authState?.clientId) throw new Error('No client id');

  const username = getTgUsername();

  // Upsert по PK (client_id, lesson_id)
  const rows: DbProgressRow[] = progress.map((p) => ({
    client_id: authState!.clientId,
    lesson_id: p.lesson_id,
    status: p.status,
    username: username ?? null,
  }));

  const { error } = await sb
    .from('lesson_progress')
    .upsert(rows, { onConflict: 'client_id,lesson_id' });

  if (error) throw error;
}

/* PRESENCE (RLS выключен у таблицы; ждём client_id для корректной привязки) */
export async function writePresence(input: {
  page: string;
  activity?: string;
  lessonId?: number | null;
  progressPct?: number;
  username?: string | null;
}): Promise<void> {
  try {
    const sb = await getClient(); // дожидаемся JWT → есть client_id
    await sb.from('presence_live').insert({
      client_id: authState?.clientId ?? null,
      page: input.page,
      activity: input.activity ?? null,
      lesson_id: input.lessonId ?? null,
      progress_pct: typeof input.progressPct === 'number' ? input.progressPct : null,
      username: input.username ?? null,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    // необязательная метрика — не ломаем UX
    // eslint-disable-next-line no-console
    console.warn('writePresence error', e);
  }
}

/* LEADS через submit-lead (service_role на сервере) */
export async function createLead(input: {
  lead_type: 'consult' | 'course';
  name?: string;
  handle?: string;
  phone?: string;
  comment?: string;
  message?: string;
}): Promise<void> {
  // Пытаемся взять initData из SDK или из tgWebAppData в хэше
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initData = (window as any)?.Telegram?.WebApp?.initData || readInitDataOnce();
  if (!initData) throw new Error('Откройте мини-приложение из Telegram');

  const { error } = await sbPublic.functions.invoke('submit-lead', {
    body: {
      initData,
      ...input,
    },
  });
  if (error) throw error;
}
