'use client';

import { useEffect } from 'react';
import { writePresence } from '@/lib/db';
import { usePathname } from 'next/navigation';

/**
 * Глобальный «лайт»-хартбит.
 * - стартует один раз на всё приложение (синглтон);
 * - если на странице подключён PresenceClient, он перехватывает владельца, и AppHeartbeat ничего не делает;
 * - пишет page при заходе/смене роутера и раз в 30 сек.
 */
export default function AppHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    const w = window as any;

    // Если владение уже у PresenceClient — выходим (он пишет чаще и с большим контекстом).
    if (w.__presenceOwner === 'PresenceClient') {
      return;
    }

    // Синглтон таймера
    if (!w.__presenceTimer) {
      const beat = () => {
        // best-effort: только страница
        writePresence({ page: w.__presencePage ?? pathname }).catch(() => {});
      };

      // первый пульс
      beat();

      // интервал 30 c
      w.__presenceTimer = setInterval(beat, 30_000);

      // пульс при возврате во вкладку
      const onVisible = () => {
        if (document.visibilityState === 'visible') beat();
      };
      document.addEventListener('visibilitychange', onVisible);

      // финальный best-effort
      const onUnload = () => { try { beat(); } catch {} };
      window.addEventListener('beforeunload', onUnload);

      // сохраняем очистку на window, чтобы не плодить слушателей
      w.__presenceCleanup = () => {
        if (w.__presenceTimer) clearInterval(w.__presenceTimer);
        w.__presenceTimer = null;
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('beforeunload', onUnload);
      };
    }

    // обновляем текущую страницу для пульса
    (window as any).__presencePage = pathname;

    return () => {
      // Ничего не чистим — это глобальный синглтон (чистится только при полной перегрузке
      // или если PresenceClient возьмёт владение и выполнит cleanup сам).
    };
  }, [pathname]);

  return null;
}
