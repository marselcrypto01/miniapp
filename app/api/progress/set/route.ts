import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { lessonId, status } = body || {};
    if (typeof lessonId !== 'number' || !['completed', 'pending'].includes(status)) {
      return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 });
    }

    const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env as Record<string, string | undefined>;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ ok: true, mock: true });
    }

    // TODO: запись прогресса (если потребуется отдельный API-маршрут)
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
