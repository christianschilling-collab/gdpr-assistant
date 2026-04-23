/** @type {import('next').NextConfig} */
const nextConfig = {
  // Kein `output: 'export'`: die App nutzt API-Routes unter `/api/*` (Gemini etc.),
  // die mit statischem Export nicht funktionieren. Hosting: siehe DEPLOY.md
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  async redirects() {
    return [
      {
        source: '/admin/reporting/upload',
        destination: '/reporting/submit/',
        permanent: true,
      },
      {
        source: '/reporting/upload',
        destination: '/reporting/submit/',
        permanent: true,
      },
      {
        source: '/admin/market-deep-dive',
        destination: '/reporting/overrides',
        permanent: true,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
