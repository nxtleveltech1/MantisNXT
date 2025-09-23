/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  eslint: {
    // Temporarily ignore ESLint errors during build
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ["localhost"],
  },
  output: "standalone",
  env: {
    UPLOAD_MAX_SIZE: process.env.UPLOAD_MAX_SIZE || "10485760",
    UPLOAD_DIR: process.env.UPLOAD_DIR || "/app/uploads",
  },
  experimental: {
    // Enable build worker for better cache handling
    webpackBuildWorker: true,
  },
  async headers() {
    return [
      {
        source: "/api/health",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/metrics",
        destination: "/api/monitoring/metrics",
      },
    ];
  },

  // Enhanced webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Use memory cache to avoid filesystem corruption issues
    config.cache = {
      type: 'memory'
    };

    return config;
  },
};

module.exports = nextConfig;
