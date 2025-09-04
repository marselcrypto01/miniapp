// app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import BottomNav from '../components/BottomNav';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mini App',
  description: 'Telegram Mini App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Telegram WebView может добавлять style на <html>.
    // suppressHydrationWarning устраняет mismatch при гидрации.
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Грузим SDK ДО гидрации, чтобы любые эффекты/скрипты могли читать window.Telegram */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Мягкий автопереход в /admin: только при старте по ?startapp=admin и только для @marselv1 */}
        <Script id="admin-redirect" strategy="afterInteractive">{`
          (function () {
            try {
              var params = new URLSearchParams(location.search);
              var askedAdminParam = params.get('startapp');
              var tries = 0;

              function go() {
                try {
                  var wa = window.Telegram && window.Telegram.WebApp;
                  if (wa && typeof wa.ready === 'function') {
                    try { wa.ready(); } catch (e) {}
                  }

                  var username = wa && wa.initDataUnsafe && wa.initDataUnsafe.user && wa.initDataUnsafe.user.username;
                  var startParam = wa && wa.initDataUnsafe && wa.initDataUnsafe.start_param;

                  var isAdminUser = username && username.toLowerCase && username.toLowerCase() === 'marselv1';
                  var askedAdmin = (askedAdminParam && askedAdminParam.toLowerCase() === 'admin') ||
                                  (startParam && startParam.toLowerCase() === 'admin');

                  if (isAdminUser && askedAdmin && location.pathname !== '/admin') {
                    location.replace('/admin');
                    return;
                  }
                } catch (e) {}
                // пробуем подольше: до ~6 секунд
                if (++tries < 60) setTimeout(go, 100);
              }
              go();
            } catch (e) {}
          })();
        `}</Script>

      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased`}
        // Отступ под мини-бар + safe area
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 80px)' }}
        suppressHydrationWarning
      >
        {/* ВАЖНО: не оборачиваем в общий контейнер — страницы сами используют свой WRAP (max-w: var(--content-max)) */}
        {children}

        {/* нижнее меню */}
        <BottomNav />
      </body>
    </html>
  );
}
