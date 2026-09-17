import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  distDir: '.next',
  transpilePackages: ['@kepler/widgets'],
}

export default nextConfig
