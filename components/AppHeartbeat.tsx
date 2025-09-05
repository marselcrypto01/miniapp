'use client';

import { useEffect } from 'react';
import { writePresence } from '@/lib/db';
import { usePathname } from 'next/navigation';

/**
 * Пишет "я здесь" в public.presence_live:
 * - при заходе/смене страницы
 * - каждые 30 секунд (heartbeat)
 */
export default function AppHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    // одна запись при заходе/смене роутера
    writePresence({ page: pathname }).catch(() => {});

    // heartbeat каждые 30 сек
    const t = setInterval(() => {
      writePresence({ page: pathname }).catch(() => {});
    }, 30_000);

    return () => clearInterval(t);
  }, [pathname]);

  return null;
}
