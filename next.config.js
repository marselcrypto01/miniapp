/** @type {import('next').NextConfig} */
const nextConfig = {
  // Чтобы ESLint/TS-ошибки не падали на прод-сборке
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Cloudflare Pages нормально работает с обычным next build
  // (Turbopack оставим для локалки)
  experimental: {
    typedRoutes: false
  },

  output: 'standalone'
};

module.exports = nextConfig;
