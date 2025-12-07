import type { NextConfig } from 'next';

const nextConfig = {
  typescript: {
    // should be checked in the pipeline anyway and takes a lot of time during build
    ignoreBuildErrors: true,
  },
  // IMPORTANT: If you do not want to host your application on vercel, you need to enable this option.
  // output: 'standalone',
} satisfies NextConfig;

export default nextConfig;
