import { NextResponse } from 'next/server';

export const runtime = 'edge';

/** Безопасный мок: если нет env для бэкенда — просто говорим "ok" */
export async function POST(req: Request) {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env as Record<string, string | undefined>;

    // ⚠️ нет окружения — возвращаем заглушку, НИЧЕГО НЕ ИНИЦИАЛИЗИРУЕМ
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ ok: true, mock: true });
    }

    // TODO: здесь будет реальная верификация через Supabase/сервер
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'verify_failed' }, { status: 200 });
  }
}
