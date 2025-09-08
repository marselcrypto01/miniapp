import { NextResponse } from 'next/server';

export const runtime = 'edge';

/** Мгновенный ответ "ok" — без каких-либо проверок и без ретраев. */
export async function POST(_req: Request) {
  try {
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // никогда не ломаем загрузку
  }
}
