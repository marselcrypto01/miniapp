import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Создаёт клиент, при необходимости с кастомным Bearer (наш JWT из tg-auth) */
export function getSb(token?: string): SupabaseClient {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}
