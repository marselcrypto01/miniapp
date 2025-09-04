// app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import BottomNav from '../components/BottomNav';
import BottomNavGuard from '@/components/BottomNavGuard';

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
              function getStartFlag() {
                // search: ?startapp=admin или ?tgWebAppStartParam=admin
                var sp  = new URLSearchParams(location.search);
                var a1  = (sp.get('startapp') || '').toLowerCase();
                var a2  = (sp.get('tgWebAppStartParam') || '').toLowerCase();

                // иногда Телега кладёт в hash: #tgWebAppStartParam=admin
                var hash = location.hash || '';
                var h = '';
                if (hash.startsWith('#')) {
                  try { h = new URLSearchParams(hash.slice(1)).get('tgWebAppStartParam') || ''; } catch (e) {}
                }

                return (a1 === 'admin') || (a2 === 'admin') || (h && h.toLowerCase() === 'admin');
              }

              var tries = 0;
              function tick() {
                try {
                  var wa = window.Telegram && window.Telegram.WebApp;
                  if (wa && typeof wa.ready === 'function') { try { wa.ready(); } catch(e){} }

                  var username   = wa && wa.initDataUnsafe && wa.initDataUnsafe.user && wa.initDataUnsafe.user.username;
                  var startParam = wa && wa.initDataUnsafe && (wa.initDataUnsafe.start_param || wa.initDataUnsafe.startapp);
                  var startOk    = getStartFlag() || (typeof startParam === 'string' && startParam.toLowerCase() === 'admin');
                  var isAdmin    = username && username.toLowerCase && username.toLowerCase() === 'marselv1';

                  if (isAdmin && startOk && location.pathname !== '/admin') {
                    location.replace('/admin');
                    return;
                  }
                } catch (e) {}

                if (++tries < 80) setTimeout(tick, 100); // до ~8с ждём initData
              }
              tick();
            } catch (e) {}
          })();
        `}</Script>

      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 80px)' }}
        suppressHydrationWarning
      >
        {children}
        <BottomNavGuard /> {/* вместо BottomNav */}
      </body>
    </html>
  );
}
