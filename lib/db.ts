// lib/db.ts
'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { callTgAuth } from './tgAuth'; // наш быстрый гостевой fallback

/* ───────────── ENV ───────────── */
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/* ───────── Публичный клиент (без RLS, только public чтение/edge rpc) ───────── */
const sbPublic = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { apikey: SUPABASE_ANON } },
});

/* ───────────── Кеш JWT (для RLS-операций) ───────────── */
type AuthCache = { token: string; clientId: string; role: 'user' | 'admin'; exp: number };
const LS_AUTH_KEY = 'sb_tg_auth_v2';

function isJwtLike(token: string | null | undefined): boolean {
  return !!token && token.split('.').length === 3;
}

function loadAuth(): AuthCache | null {
  try {
    const raw = localStorage.getItem(LS_AUTH_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as AuthCache;
    if (!a?.token || !a?.clientId || !a?.exp) return null;
    if (!isJwtLike(a.token)) return null; // игнорируем старые «гостевые» токены
    if (Date.now() > a.exp * 1000) return null;
    return a;
  } catch { return null; }
}
function saveAuth(a: AuthCache) { try { localStorage.setItem(LS_AUTH_KEY, JSON.stringify(a)); } catch {} }
export function clearAuthCache() { try { localStorage.removeItem(LS_AUTH_KEY); } catch {} }

/* ───────────── Клиент под ваш RLS-токен ───────────── */
let rlsClient: SupabaseClient | null = null;
let authState: AuthCache | null = null;

function makeRlsClient(token: string) {
  rlsClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON } },
  });
}

/* ───────── Telegram helpers (без ожиданий, быстро) ───────── */
function tryGetInitData(): string | null {
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

async function waitForInitData(timeoutMs = 8000): Promise<string | null> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const init = tryGetInitData();
    if (init && init.length > 0) return init;
    await new Promise((r) => setTimeout(r, 100));
  }
  return tryGetInitData();
}

export function getTgDisplayName(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!u) return null;
    return (u.first_name || u.username || u.last_name || '').toString() || null;
  } catch { return null; }
}

/* ───────── Обмен initData → JWT через Edge Function tg-auth ───────── */
async function exchangeInitDataToJwt(initData: string): Promise<AuthCache> {
  const { data, error } = await sbPublic.functions.invoke('tg-auth', { body: { initData } });
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

/* ───────── Инициализация: Telegram → RLS | иначе Гость (быстро, неблокирующе) ───────── */
export async function initSupabaseFromTelegram(): Promise<{ clientId: string; role: 'user' | 'admin' }> {
  const cached = loadAuth();
  if (cached) {
    authState = cached;
    makeRlsClient(cached.token);
    return { clientId: cached.clientId, role: cached.role };
  }

  // 1) Если есть initData — делаем настоящий tg-auth (персонализация)
  const initData = await waitForInitData(4000);
  if (initData) {
    try {
      const real = await exchangeInitDataToJwt(initData);
      authState = real;
      saveAuth(real);
      makeRlsClient(real.token);
      return { clientId: real.clientId, role: real.role };
    } catch {
      // если вдруг упало — спокойно уходим в гостя
    }
  }

  // 2) Гостевой fallback (быстро и без ожиданий)
  const guest = await callTgAuth();
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  authState = { token: guest.token, clientId: guest.clientId, role: guest.role, exp };
  saveAuth(authState);
  makeRlsClient(authState.token);
  return { clientId: authState.clientId, role: authState.role };
}

/** Гарантирует реальный JWT от Telegram. Если сейчас гость — пытается обменять initData синхронно. */
async function ensureRealJwtAuth(): Promise<void> {
  if (authState && isJwtLike(authState.token)) return;
  // чистим некорректный кэш
  clearAuthCache();
  const initData = await waitForInitData(8000);
  if (!initData) throw new Error('telegram_not_initialized');
  const real = await exchangeInitDataToJwt(initData);
  authState = real;
  saveAuth(real);
  makeRlsClient(real.token);
}

/* ───────── Геттер клиента (не блокирует) ───────── */
async function getClient(): Promise<SupabaseClient | null> {
  if (rlsClient) return rlsClient;
  const cached = loadAuth();
  if (cached) {
    authState = cached;
    makeRlsClient(cached.token);
    return rlsClient!;
  }
  // не блокируем: инициируем в фоне
  initSupabaseFromTelegram().catch(() => {});
  return null;
}

/* ───────── Геттеры состояния ───────── */
export function getCurrentClientId(): string | null { return authState?.clientId ?? null; }
export function getCurrentRole(): 'user' | 'admin' | null { return authState?.role ?? null; }

/* ╔═══════════════════ ПОЛЕЗНЫЕ ХЕЛПЕРЫ ДЛЯ ГОСТЕЙ ═══════════════════╗ */

// генератор guest-id
function genId() {
  try {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return 'guest-' + crypto.randomUUID();
  } catch {}
  return 'guest-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// получить/создать стабильный client_id в localStorage
function getClientIdLocal(): string {
  const KEY = 'cm_clientId';
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = genId();
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return genId();
  }
}

// попробовать вытащить @username из Telegram SDK (если внутри WebApp)
function getUsernameFromTg(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wa: any = (window as any)?.Telegram?.WebApp;
    const u = wa?.initDataUnsafe?.user?.username;
    return u ? `@${String(u).replace(/^@+/, '')}` : null;
  } catch {
    return null;
  }
}

/* ╔═══════════════════ ДАННЫЕ ═══════════════════╗ */

export type DbLesson = { id: number; title: string | null; subtitle?: string | null; has_test: boolean | null; order_index?: number | null; };
export async function listLessons(): Promise<DbLesson[]> {
  const { data, error } = await sbPublic
    .from('lessons')
    .select('id,title,subtitle,has_test,order_index')
    .order('order_index', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbLesson[];
}

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

export type DbProgressRow = { client_id: string; lesson_id: number; status: 'completed' | 'pending'; username?: string | null; updated_at?: string; };

export async function getUserProgress(): Promise<DbProgressRow[]> {
  const sb = await getClient();
  if (!sb) return []; // пока нет клиента — страница возьмёт из LS
  const { data, error } = await sb
    .from('lesson_progress')
    .select('client_id,lesson_id,status,username,updated_at')
    .order('lesson_id', { ascending: true });
  if (error) throw error;
  return (data as DbProgressRow[]) ?? [];
}

export async function saveUserProgress(progress: Array<{ lesson_id: number; status: 'completed' | 'pending' }>): Promise<void> {
  const sb = await getClient();
  if (!sb || !authState?.clientId) return; // не блокируем UX
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u: any = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
  const username = u?.username ?? null;

  const rows: DbProgressRow[] = progress.map((p) => ({
    client_id: authState!.clientId,
    lesson_id: p.lesson_id,
    status: p.status,
    username: username,
  }));
  const { error } = await sb.from('lesson_progress').upsert(rows, { onConflict: 'client_id,lesson_id' });
  if (error) throw error;
}

export async function writePresence(input: { page: string; activity?: string; lessonId?: number | null; progressPct?: number; username?: string | null; }): Promise<void> {
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

/* ╔═══════════════════ LEADS (с серверным fallback) ═══════════════════╗ */
/**
 * Универсальная отправка заявки: работает и внутри Telegram (есть JWT),
 * и на обычном сайте (без Telegram) — через серверный API-роут.
 */
export async function createLead(input: {
  lead_type: 'consult' | 'course';
  name?: string;
  handle?: string;
  phone?: string;
  comment?: string;
  message?: string;
}): Promise<void> {
  // Пытаемся использовать реальный RLS-токен (если мы в Telegram)
  // и только если это быстро доступно; в противном случае — API fallback.
  let canUseRls = false;
  try {
    // если уже есть валидный jwt в кеше — ок
    if (authState && isJwtLike(authState.token)) {
      canUseRls = true;
    } else {
      // возможно, мы в WebApp — попробуем мгновенно обменять initData
      const init = tryGetInitData();
      if (init) {
        const real = await exchangeInitDataToJwt(init);
        authState = real;
        saveAuth(real);
        makeRlsClient(real.token);
        canUseRls = true;
      }
    }
  } catch { canUseRls = false; }

  if (canUseRls) {
    // RLS-вставка как раньше (сработают политики и username из TG)
    const sb = await getClient();
    if (!sb || !authState?.clientId) throw new Error('auth_not_ready');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u: any = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
    const username = u?.username ?? null; // без '@'

    const row = {
      client_id: authState.clientId,
      username,
      lead_type: input.lead_type,
      message: input.message ?? null,
      name: input.name ?? null,
      handle: input.handle ?? null,
      phone: input.phone ?? null,
      comment: input.comment ?? null,
    };

    const { error } = await sb.from('leads').insert(row);
    if (error) throw error;

    try { await sb.from('user_events').insert({ client_id: authState.clientId, username, event: 'lead_submit' }); } catch {}
    return;
  }

  // Fallback: обычный сайт (без Telegram) — отправляем на наш серверный роут
  const client_id = getClientIdLocal();
  const username = getUsernameFromTg() || null;

  const res = await fetch('/api/leads/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      client_id,
      username,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `lead_submit_failed_${res.status}`);
  }
}

/* ╔═══════════════════ ПОЛЕЗНЫЕ МАТЕРИАЛЫ ═══════════════════╗ */
export type DbLessonMaterial = {
  id: string;
  lesson_id: number;
  title: string;
  url: string; // для kind='text' используем как content
  kind: 'link' | 'text' | 'image';
  position: number;
  description?: string | null;
  created_at?: string;
};

/** Публичное чтение материалов по уроку (RLS: select allow all) */
export async function getLessonMaterials(lessonId: number): Promise<DbLessonMaterial[]> {
  const { data, error } = await sbPublic
    .from('lesson_materials')
    .select('id,lesson_id,title,url,kind,position,description,created_at')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbLessonMaterial[];
}

/** Админ: создать/обновить материал. Требует admin app_role */
export async function adminUpsertMaterial(input: {
  id?: string;
  lesson_id: number;
  title: string;
  url: string;
  kind: 'link' | 'text' | 'image';
  position?: number;
  description?: string | null;
}): Promise<DbLessonMaterial> {
  await ensureRealJwtAuth();
  const sb = await getClient();
  if (!sb || !authState?.clientId || !isJwtLike(authState.token)) throw new Error('auth_not_ready');

  const row = {
    id: input.id ?? undefined,
    lesson_id: input.lesson_id,
    title: input.title,
    url: input.url,
    kind: input.kind,
    position: typeof input.position === 'number' ? input.position : 0,
    description: input.description ?? null,
  } as any;

  const { data, error } = await sb
    .from('lesson_materials')
    .upsert(row)
    .select('id,lesson_id,title,url,kind,position,description,created_at')
    .single();
  if (error) throw error;
  return data as DbLessonMaterial;
}

/** Админ: удалить материал */
export async function adminDeleteMaterial(id: string): Promise<void> {
  await ensureRealJwtAuth();
  const sb = await getClient();
  if (!sb || !authState?.clientId || !isJwtLike(authState.token)) throw new Error('auth_not_ready');
  const { error } = await sb.from('lesson_materials').delete().eq('id', id);
  if (error) throw error;
}

/** Админ: массовое обновление позиций (reorder) */
export async function adminReorderMaterials(updates: Array<{ id: string; position: number }>): Promise<void> {
  if (!updates.length) return;
  await ensureRealJwtAuth();
  const sb = await getClient();
  if (!sb || !authState?.clientId || !isJwtLike(authState.token)) throw new Error('auth_not_ready');
  const { error } = await sb.from('lesson_materials').upsert(updates as any);
  if (error) throw error;
}

/* ╔═══════════════════ ТЕСТЫ / АНАЛИТИКА ═══════════════════╗ */
export async function recordTestPass(input: {
  lesson_id: number;
  correct_answers: number;
  total_questions: number;
  percentage: number;
}): Promise<void> {
  console.log('🎯 recordTestPass called with:', input);
  
  // Сначала пробуем RLS для авторизованных пользователей
  try {
    console.log('🔄 Checking if user is authenticated...');
    
    // Проверяем, есть ли уже готовый клиент
    let sb = await getClient();
    if (!sb) {
      console.log('📝 No client yet, trying to initialize...');
      try {
        await ensureRealJwtAuth();
        sb = await getClient();
      } catch (authError) {
        console.log('⚠️ Auth failed, will use RPC fallback:', authError);
        throw authError;
      }
    }
    
    if (sb && authState?.clientId && isJwtLike(authState.token)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u: any = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
      const username = u?.username ?? null;
      
      console.log('📝 Using RLS with:', { clientId: authState.clientId, username });
      
      const { error } = await sb.from('user_events').insert({
        client_id: authState.clientId,
        username,
        event: 'test_pass',
        lesson_id: input.lesson_id,
        meta: {
          correct_answers: input.correct_answers,
          total_questions: input.total_questions,
          percentage: input.percentage,
        },
      });
      
      if (error) {
        console.error('❌ RLS error:', error);
        throw error; // Переходим к fallback
      } else {
        console.log('✅ RLS success');
        return; // Успешно записали через RLS
      }
    } else {
      console.log('⚠️ No valid auth state, using RPC fallback');
      throw new Error('No valid auth state');
    }
  } catch (e) {
    console.log('⚠️ RLS failed, trying RPC fallback:', e);
  }

  // Fallback: используем RPC функцию для неавторизованных пользователей
  try {
    const client_id = getClientIdLocal();
    const username = getUsernameFromTg();
    
    console.log('📝 Using RPC fallback with:', { client_id, username });
    
    const { data, error } = await sbPublic.rpc('record_test_pass', {
      p_client_id: client_id,
      p_lesson_id: input.lesson_id,
      p_correct_answers: input.correct_answers,
      p_total_questions: input.total_questions,
      p_percentage: input.percentage,
      p_username: username,
    });
    
    if (error) {
      console.error('❌ RPC error:', error);
      
      // Если RPC не работает, пробуем прямой insert через публичный клиент
      console.log('🔄 Trying direct insert as last resort...');
      const { error: insertError } = await sbPublic.from('user_events').insert({
        client_id,
        username,
        event: 'test_pass',
        lesson_id: input.lesson_id,
        meta: {
          correct_answers: input.correct_answers,
          total_questions: input.total_questions,
          percentage: input.percentage,
        },
      });
      
      if (insertError) {
        console.error('❌ Direct insert error:', insertError);
      } else {
        console.log('✅ Direct insert success');
      }
    } else {
      console.log('✅ RPC success:', data);
    }
  } catch (e) {
    console.error('❌ RPC exception:', e);
  }
}
