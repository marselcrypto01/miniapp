// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Единственный клиент для вызова Edge Functions (SDK сам подставит anon) */
export const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
