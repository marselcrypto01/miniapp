'use client';

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Локальный UUID пользователя. Хранится в localStorage. */
export function getClientId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('client_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('client_id', id);
  }
  return id;
}

/** Каждый вызов создаёт клиент с актуальным x-client-id (для RLS). */
export function sb() {
  const id = typeof window !== 'undefined' ? getClientId() : '';
  return createClient(URL, KEY, {
    global: { headers: { 'x-client-id': id } },
  });
}
