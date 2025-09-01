import { NextResponse } from 'next/server';

export const runtime = 'edge';

/** Безопасный мок: отдаём пустой прогресс, если нет ENV */
export async function POST(req: Request) {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env as Record<string, string | undefined>;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ ok: true, progress: [], mock: true });
    }

    // TODO: получить прогресс из БД
    return NextResponse.json({ ok: true, progress: [] });
  } catch {
    return NextResponse.json({ ok: true, progress: [] }, { status: 200 });
  }
}
