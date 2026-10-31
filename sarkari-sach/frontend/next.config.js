/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    const rawBackend = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const backendUrl = rawBackend.replace(/\/+$/, "");
    return [
      {
        source: '/backend/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
