// next.config.ts
import type { NextConfig } from 'next';

const csp = [
  // базовое
  "default-src 'self'",

  // кто может встраивать ваш сайт (оставил как у вас)
  "frame-ancestors *",

  // во что вы сами встраиваетесь (плееры/вебвью)
  "frame-src 'self' https://vkvideo.ru https://vk.com https://*.vk.com https://*.vk.me https://t.me https://*.t.me https://telegram.org https://*.telegram.org",

  // СКРИПТЫ: добавлены Метрика и Telegram
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mc.yandex.ru https://telegram.org https://*.telegram.org",

  // СЕТЕВЫЕ ЗАПРОСЫ: у вас и так '*', но добавил mc.yandex.ru явно
  "connect-src * https://mc.yandex.ru",

  // КАРТИНКИ: оставил *, но добавил явно mc.yandex.ru + data/blob для пикселя
  "img-src * data: blob: https://mc.yandex.ru",

  // МЕДИА: как у вас
  "media-src *",

  // СТИЛИ/ШРИФТЫ
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",

  // воркеры (на всякий случай)
  "worker-src 'self' blob:",
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          // Оставляю как у вас (учтите: ALLOWALL не стандарт, но менять не просили)
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
        ],
      },
    ];
  },
};

export default nextConfig;
