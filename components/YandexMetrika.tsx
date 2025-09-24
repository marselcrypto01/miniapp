'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    ym?: (...args: any[]) => void;
  }
}

export default function YandexMetrikaHit() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!window.ym) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    const title = document?.title || undefined;

    try {
      // Отправка просмотра страницы (SPA)
      window.ym(
        Number(process.env.NEXT_PUBLIC_YM_ID),
        'hit',
        url,
        { title, referer: document?.referrer || undefined }
      );
    } catch (_) {}
  }, [pathname, searchParams]);

  return null;
}
