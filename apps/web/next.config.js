/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      // Banner image hosts used in DB (migrate to Cloudinary over time)
      { protocol: 'https', hostname: 't3.ftcdn.net' },
      { protocol: 'https', hostname: '*.ftcdn.net' },
      { protocol: 'https', hostname: 'www.shutterstock.com' },
      { protocol: 'https', hostname: 'png.pngtree.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],
  // The Express API runs in the same container (:4000). Proxy every /api/*
  // request server-side so a single domain serves both the web app and the API.
  // Browser requests for /api* always land here first (same-origin base), while
  // a remote absolute NEXT_PUBLIC_API_URL would bypass Next entirely and work too.
  async rewrites() {
    const target = process.env.API_INTERNAL_URL || 'http://localhost:4000/api';
    return [{ source: '/api/:path*', destination: `${target}/:path*` }];
  },
  transpilePackages: ['shared'],
};

module.exports = nextConfig;
