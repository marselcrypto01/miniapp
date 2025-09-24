'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window { ym?: (...args: any[]) => void }
}

const YM_ID = Number(process.env.NEXT_PUBLIC_YM_ID || '104259406');

export default function YandexMetrikaHit() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!window.ym) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    const title = document?.title || undefined;

    try {
      window.ym(YM_ID, 'hit', url, { title, referer: document?.referrer || undefined });
    } catch {}
  }, [pathname, searchParams]);

  return null;
}
