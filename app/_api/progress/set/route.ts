import { NextResponse } from 'next/server';

export const runtime = 'edge';

/** Безопасный мок: "сохраняем" прогресс, если нет ENV — просто отвечаем ok */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { lessonId, status } = body || {};
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env as Record<string, string | undefined>;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ ok: true, mock: true });
    }

    // TODO: записать прогресс в БД
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
