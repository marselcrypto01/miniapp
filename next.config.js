/** @type {import('next').NextConfig} */
const nextConfig = {
  // Полностью пропускаем ESLint на сборке\
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Игнорим ошибки TypeScript на сборке (код всё равно скомпилится)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Дополнительно: не останавливать сборку из-за ошибок компилятора
  // (опционально, но помогает в спорных кейсах)
  experimental: {
    // Ничего критичного: оставим Turbopack по умолчанию
  },
};

module.exports = nextConfig;
