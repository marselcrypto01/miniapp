import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST() {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env as Record<string, string | undefined>;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      // локальная среда / нет env — возвращаем пусто
      return NextResponse.json({ ok: true, progress: [], mock: true });
    }
    // TODO: реальная выборка прогресса (если когда-то понадобится)
    return NextResponse.json({ ok: true, progress: [] });
  } catch (e) {
    return NextResponse.json({ ok: true, progress: [] });
  }
}
