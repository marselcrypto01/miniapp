// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const q = url.searchParams;

    // Поддерживаем редирект на админку по старт-параметру,
    // это не связано с Telegram и не мешает браузерному запуску.
    const start = (q.get('startapp') || q.get('tgWebAppStartParam') || '').toLowerCase();
    if (start === 'admin' && url.pathname !== '/admin') {
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  } catch {}

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/(.*)'],
};
