import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker optimization
  output: 'standalone',
  // Prevent Next from guessing workspace root via lockfiles.
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Externalize native modules so they can be managed by DockerOS or rebuilt
  serverExternalPackages: ['better-sqlite3'],
  // Serve uploaded files
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
}

export default nextConfig
