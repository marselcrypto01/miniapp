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
        {/* Грузим SDK ДО гидрации, чтобы эффекты видели window.Telegram */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased pb-20`}
        suppressHydrationWarning
      >
        <div className="container mx-auto px-4">{children}</div>

        {/* нижнее меню */}
        <BottomNav />
      </body>
    </html>
  );
}
