// app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import BottomNavGuard from '@/components/BottomNavGuard';
import AppHeartbeat from '@/components/AppHeartbeat';
import Script from 'next/script'; // ← ЭТО НУЖНО

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mini App',
  description: 'Telegram Mini App',
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseOrigin = (() => {
  try {
    const u = new URL(supabaseUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
})();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Telegram WebView может добавлять style на <html>.
    // suppressHydrationWarning устраняет mismatch при гидрации.
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* DNS/TCP прогоны заранее — ускоряет мобильную сеть */}
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
        <link rel="preconnect" href="https://telegram.org" crossOrigin="" />
        <link rel="dns-prefetch" href="https://telegram.org" />

        {/* SDK Telegram — грузим ТОЛЬКО внутри Telegram WebView */}
        <Script id="tg-sdk-loader" strategy="afterInteractive">
          {`
            (function () {
              try {
                var isTelegram = !!(window.Telegram && window.Telegram.WebApp);
                // запасной признак: запуск из t.me/ или есть tgWebAppStartParam в URL/хэше
                var sp  = new URLSearchParams(location.search);
                var a1  = (sp.get('tgWebAppStartParam') || sp.get('startapp') || '').toLowerCase();
                var hash = location.hash || '';
                var a2 = '';
                if (hash.startsWith('#')) { try { a2 = new URLSearchParams(hash.slice(1)).get('tgWebAppStartParam') || ''; } catch(e){} }
                var looksLikeTelegram = isTelegram || a1 || a2;

                if (!looksLikeTelegram) return; // вне Telegram — не грузим SDK

                var s = document.createElement('script');
                s.src = 'https://telegram.org/js/telegram-web-app.js';
                s.async = true;
                s.onerror = function(){ /* молча игнорируем */ };
                document.head.appendChild(s);
              } catch (e) {}
            })();
          `}
        </Script>



        {/* ✅ Fallback: мягкая инициализация, если SDK долго грузится */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var started = false;
                function safeStart(){
                  if (started) return;
                  started = true;
                  try {
                    var wa = window.Telegram && window.Telegram.WebApp;
                    if (wa && typeof wa.ready === 'function') wa.ready();
                  } catch(e){}
                }
                // если SDK не инициализировался за 5 секунд — не стопорим UI
                setTimeout(safeStart, 5000);
              })();
            `,
          }}
        />

        {/* ✅ Мягкий автопереход в /admin (только для @marselv1 и если startapp=admin) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  function getStartFlag() {
                    var sp  = new URLSearchParams(location.search);
                    var a1  = (sp.get('startapp') || '').toLowerCase();
                    var a2  = (sp.get('tgWebAppStartParam') || '').toLowerCase();

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

                    if (++tries < 80) setTimeout(tick, 100); // ждём initData до ~8с
                  }
                  tick();
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 80px)' }}
        suppressHydrationWarning
      >
        {/* Хартбит: пишет presence_live при заходе и каждые 30с */}
        <AppHeartbeat />

        {children}

        {/* Нижняя навигация с запретом на неразрешённых страницах */}
        <BottomNavGuard />
      </body>
    </html>
  );
}
