// lib/supabase.ts
'use client';

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Публичный клиент без самодельных заголовков — единообразно с остальным кодом. */
export function sb() {
  return createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${KEY}`,
        apikey: KEY,
      },
    },
  });
}

/** Локальный UUID — можно оставить, если где-то используешь вне RLS. */
export function getClientId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('client_id');
  if (!id) {
    id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('client_id', id);
  }
  return id;
}
