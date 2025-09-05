// lib/supabaseClient.ts
'use client';

import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Публичный клиент. Если где-то будете звать Edge Functions — хедер уже есть. */
export const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    },
  },
});
