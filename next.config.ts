import type { NextConfig } from 'next';

const securityHeaders = [
  // The microphone is only ever requested by this origin (speaking exercises, Talk to Emma).
  { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=()' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // Emma's illustrations never change between deploys without a rename.
        source: '/emma/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
