// next.config.ts
import type { NextConfig } from 'next';

const csp = [
  "default-src 'self'",
  "frame-src 'self' https://vkvideo.ru https://vk.com",
  "img-src * blob: data:",
  "media-src *",
  "connect-src *",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "frame-ancestors *",
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // не падать из-за ESLint на прод-сборке
    ignoreDuringBuilds: true,
  },
  typescript: {
    // не падать из-за TS-ошибок на прод-сборке
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Разрешаем встраивание плеера VK
          { key: 'Content-Security-Policy', value: csp },
          // Полезно для iframes на iOS/Android WebView
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
        ],
      },
    ];
  },
};

export default nextConfig;
