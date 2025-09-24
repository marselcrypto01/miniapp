// app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import BottomNavGuard from '@/components/BottomNavGuard';
import AppHeartbeat from '@/components/AppHeartbeat';
import Script from 'next/script'; // ← НУЖНО
import YandexMetrikaHit from '@/components/YandexMetrikaHit'; // ← ВАЖНО

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
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}

        {/* Telegram SDK — грузим только в Telegram WebView */}
        <Script id="tg-sdk-loader" strategy="afterInteractive">
          {`
            (function () {
              try {
                var isTelegram = !!(window.Telegram && window.Telegram.WebApp);
                var sp  = new URLSearchParams(location.search);
                var a1  = (sp.get('tgWebAppStartParam') || sp.get('startapp') || '').toLowerCase();
                var hash = location.hash || '';
                var a2 = '';
                if (hash.startsWith('#')) {
                  try { a2 = new URLSearchParams(hash.slice(1)).get('tgWebAppStartParam') || ''; } catch(e){}
                }
                var looksLikeTelegram = isTelegram || a1 || a2;
                if (!looksLikeTelegram) return;

                var s = document.createElement('script');
                s.src = 'https://telegram.org/js/telegram-web-app.js';
                s.async = true;
                document.head.appendChild(s);
              } catch (e) {}
            })();
          `}
        </Script>

        {/* Fallback Telegram ready */}
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
                setTimeout(safeStart, 5000);
              })();
            `,
          }}
        />

        {/* Автопереход в /admin для marselv1 */}
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
                    if (++tries < 80) setTimeout(tick, 100);
                  }
                  tick();
                } catch (e) {}
              })();
            `,
          }}
        />

        {/* Cache-bust для Telegram */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var isTG = !!(window.Telegram && window.Telegram.WebApp) || /Telegram/i.test(navigator.userAgent || '');
                  if (!isTG) return;
                  var KEY = 'tg_cache_bust_done';
                  if (sessionStorage.getItem(KEY) === '1') return;
                  var url = new URL(location.href);
                  if (!url.searchParams.has('v')) {
                    url.searchParams.set('v', Date.now().toString(36));
                    sessionStorage.setItem(KEY, '1');
                    location.replace(url.toString());
                  }
                } catch (e) {}
              })();
            `,
          }}
        />

        {/* ✅ Яндекс.Метрика (SPA) */}
        <Script id="ym-loader" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document,'script','https://mc.yandex.ru/metrika/tag.js','ym');

            ym(104259406, 'init', {
              ssr:true,
              webvisor:true,
              clickmap:true,
              ecommerce:"dataLayer",
              accurateTrackBounce:true,
              trackLinks:true,
              trackHash:true
            });
          `}
        </Script>

        {/* Helper для целей */}
        <Script id="ym-goal-helper" strategy="afterInteractive">
          {`
            window.ymGoal = function(goal, params){
              try { window.ym && ym(104259406, 'reachGoal', goal, params||{}); } catch(e){}
            }
          `}
        </Script>

        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/104259406" style={{position:'absolute',left:'-9999px'}} alt="" />
          </div>
        </noscript>
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} ...`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 80px)' }} // ← не stlye
        suppressHydrationWarning
      >
        <AppHeartbeat />
        
        <YandexMetrikaHit />

        {children}

        <BottomNavGuard />
      </body>
    </html>
  );
}
