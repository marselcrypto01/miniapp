import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import BottomNav from "../components/BottomNav";
export const runtime = 'edge';


const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mini App",
  description: "Telegram Mini App",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased pb-20`}
      >
        <div className="container mx-auto px-4">{children}</div>

        {/* нижнее меню */}
        <BottomNav />

        {/* Telegram WebApp SDK */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
