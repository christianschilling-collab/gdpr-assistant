/** @type {import('next').NextConfig} */
const nextConfig = {
  // Kein `output: 'export'`: die App nutzt API-Routes unter `/api/*` (Gemini etc.),
  // die mit statischem Export nicht funktionieren. Hosting: siehe DEPLOY.md
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
