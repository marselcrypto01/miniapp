import { NextResponse } from 'next/server';

export const runtime = 'edge';

/** Безопасный мок: всегда "ok", бэкенд/Telegram не требуются. */
export async function POST(_req: Request) {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env as Record<string, string | undefined>;

    // Если env нет — просто подтверждаем мок-режим.
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ ok: true, mock: true });
    }

    // Даже при наличии env — возвращаем ok (проверок нет).
    return NextResponse.json({ ok: true });
  } catch {
    // Возвращаем 200, чтобы фронт никогда не падал из-за этой точки.
    return NextResponse.json({ ok: false, error: 'verify_failed' }, { status: 200 });
  }
}
