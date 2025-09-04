'use client';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import BottomNav from '../components/BottomNav';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mini App',
  description: 'Telegram Mini App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Автопереход в /admin: только для @marselv1 и только по ссылке с startapp=admin
  useEffect(() => {
    let cancelled = false;

    const tryRedirect = async () => {
      try {
        // подстрахуемся на момент, когда WebApp ещё не инициализировался
        for (let i = 0; i < 15; i++) {
          // @ts-ignore
          const wa = (window as any)?.Telegram?.WebApp;
          const params = new URLSearchParams(window.location.search);
          const startappParam = params.get('startapp');

          if (wa || startappParam) {
            const username: string | undefined = wa?.initDataUnsafe?.user?.username;
            const startParam: string | undefined = wa?.initDataUnsafe?.start_param;

            const isAdminUser = username?.toLowerCase?.() === 'marselv1';
            const askedAdmin =
              (startParam && startParam.toLowerCase() === 'admin') ||
              (startappParam && startappParam.toLowerCase() === 'admin');

            if (!cancelled && isAdminUser && askedAdmin && pathname !== '/admin') {
              router.replace('/admin');
            }
            return;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
      } catch {
        /* no-op */
      }
    };

    void tryRedirect();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return (
    // Telegram WebView может менять инлайновые стили у <html>; suppressHydrationWarning убирает mismatch
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Подключаем Telegram WebApp SDK ДО гидрации, чтобы эффекты видели window.Telegram */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased pb-20`}
        // небольшой отступ снизу под мини-бар с учётом safe area
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 80px)' }}
        suppressHydrationWarning
      >
        {/* ВАЖНО: не оборачиваем в общий контейнер — страницы сами используют свой WRAP (max-w: var(--content-max)) */}
        {children}

        {/* Нижний мини-бар (сам центрируется и использует ту же max-width через var(--content-max)) */}
        <BottomNav />
      </body>
    </html>
  );
}
