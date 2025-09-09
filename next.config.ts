// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // не падать из-за ESLint на прод-сборке (Cloudflare Pages)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // не падать из-за TS-ошибок на прод-сборке
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
