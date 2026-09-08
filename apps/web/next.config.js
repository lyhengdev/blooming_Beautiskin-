/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Don't let Workbox try to precache Next's middleware/build manifests.
  buildExcludes: [
    /middleware-manifest\.json$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/,
    /middleware-build-manifest\.js$/,
    /middleware-[a-z0-9]+\.js$/,
  ],
  runtimeCaching: [
    {
      // Next.js static JS/CSS chunks
      urlPattern: /\/_next\/static\/.+\.(?:css|js|mjs)$/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-resources' },
    },
    {
      // Product / banner images (mostly Cloudinary etc.)
      urlPattern: /\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico)(?:\?.*)?$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [200] },
      },
    },
    {
      // Public storefront GET endpoints — serve fresh when online, fall back
      // to the last fetched copy offline. Private/stateful paths (auth, cart,
      // orders, admin, coupon validation) deliberately fall through.
      urlPattern: /\/api\/(?!auth\/|admin\/|carts\/|orders\/|wishlist\/|coupons\/)[^?]+$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
        cacheableResponse: { statuses: [200] },
      },
    },
  ],
});

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

module.exports = withPWA(nextConfig);