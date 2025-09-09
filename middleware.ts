// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  try {
    const url = req.nextUrl
    const q = url.searchParams

    // Telegram ставит либо ?startapp=..., либо ?tgWebAppStartParam=...
    const start =
      (q.get('startapp') || q.get('tgWebAppStartParam') || '').toLowerCase()

    if (start === 'admin' && url.pathname !== '/admin') {
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  } catch {}

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api/health|_next/static|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
