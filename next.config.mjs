/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker optimization
  output: 'standalone',
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
