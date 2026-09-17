import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // backend-plan.md §4: standalone output for the Fargate image.
  output: 'standalone',
  // old.md §4: shared widgets package lives outside this directory; set turbopack.root when it lands.
  // turbopack: { root: path.join(__dirname, '../..') },
};

export default nextConfig;
