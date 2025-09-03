// lib/db.ts
'use client';

import { createClient } from '@supabase/supabase-js';

// ── ENV (Netlify → Environment variables) ─────────────────────────────────────
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(URL, KEY);

// ── LESSONS ───────────────────────────────────────────────────────────────────
export type DbLesson = {
  id: number;
  title: string | null;
  subtitle?: string | null;
  has_test: boolean | null;
  order_index?: number | null;
};

export async function listLessons(): Promise<DbLesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id,title,subtitle,has_test,order_index')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ── QUOTES ────────────────────────────────────────────────────────────────────
/**
 * 1) Пытаемся получить через RPC `get_random_quote` (если создавал в SQL).
 * 2) Иначе: читаем все цитаты и случайно выбираем на клиенте (без TS-ошибок).
 */
export async function getRandomDailyQuote(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_random_quote');
    if (error) throw error;
    const txt = (data as string) || '';
    if (txt) return txt;
  } catch {
    // игнор — пойдём на табличный путь
  }

  const { data, error } = await supabase.from('daily_quotes').select('text');
  if (error) return 'Учись видеть возможности там, где другие видят шум.';

  const list = (data ?? [])
    .map((r) => String(r.text))
    .filter(Boolean);
  if (!list.length) return 'Учись видеть возможности там, где другие видят шум.';
  const i = Math.floor(Math.random() * list.length);
  return list[i];
}

// ── PROGRESS ──────────────────────────────────────────────────────────────────
export type DbProgressRow = {
  client_id: string;
  lesson_id: number;
  status: 'completed' | 'pending';
  updated_at?: string;
};

export async function getUserProgress(uid: string): Promise<DbProgressRow[]> {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('client_id,lesson_id,status,updated_at')
    .eq('client_id', uid);

  if (error) throw error;
  return (data as DbProgressRow[]) ?? [];
}

/**
 * Полная синхронизация под RLS: удаляем все строки пользователя и вставляем новые.
 */
export async function saveUserProgress(
  uid: string,
  progress: Array<{ lesson_id: number; status: 'completed' | 'pending' }>
): Promise<void> {
  const del = await supabase.from('lesson_progress').delete().eq('client_id', uid);
  if (del.error) throw del.error;

  if (!progress.length) return;

  const rows: DbProgressRow[] = progress.map((p) => ({
    client_id: uid,
    lesson_id: p.lesson_id,
    status: p.status,
  }));

  const ins = await supabase.from('lesson_progress').insert(rows);
  if (ins.error) throw ins.error;
}

// ── PRESENCE ──────────────────────────────────────────────────────────────────
export async function writePresence(input: {
  page: string;
  activity?: string;
  lessonId?: number | null;
  progressPct?: number;
  username?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('presence_live').insert({
    page: input.page,
    activity: input.activity ?? null,
    lesson_id: input.lessonId ?? null,
    progress_pct: input.progressPct ?? null,
    username: input.username ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    // не падаем в UI
    // eslint-disable-next-line no-console
    console.warn('writePresence error', error);
  }
}
