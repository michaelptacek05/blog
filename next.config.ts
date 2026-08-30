import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required by the production Dockerfile (phase 7): emits a self-contained
  // server bundle into .next/standalone.
  output: 'standalone',

  experimental: {
    serverActions: {
      // Default is 1 MB, which is far too small for image uploads that go
      // through a server action. Keep this in sync with the Nginx Proxy Manager
      // `client_max_body_size` value documented in the README.
      bodySizeLimit: '20mb',
    },
  },

  // Images are served by our own /media/[id] route, not by next/image.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
