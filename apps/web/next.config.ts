import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  distDir: '/tmp/next-build',
  transpilePackages: ['@kepler/widgets'],
}

export default nextConfig
