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
  transpilePackages: ['shared'],
};

module.exports = nextConfig;
