/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  eslint: {
    // Only ignore during development when explicitly allowed via env
    ignoreDuringBuilds:
      process.env.NODE_ENV === "development" &&
      process.env.IGNORE_LINT === "true",
  },
  typescript: {
    // Only ignore during development when explicitly allowed via env
    ignoreBuildErrors:
      process.env.NODE_ENV === "development" &&
      process.env.IGNORE_TS === "true",
  },
  images: {
    domains: ["localhost"],
  },
  output: "standalone",
  env: {
    UPLOAD_MAX_SIZE: process.env.UPLOAD_MAX_SIZE || "10485760",
    UPLOAD_DIR: process.env.UPLOAD_DIR || "/app/uploads",
  },

  // Configure headers for better caching and security
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

  // API rewrites for better routing
  async rewrites() {
    return [
      {
        source: "/api/metrics",
        destination: "/api/monitoring/metrics",
      },
    ];
  },

  // Enhanced webpack configuration for stability
  webpack: (config, { dev, isServer, webpack }) => {
    // Optimize cache configuration
    if (!dev) {
      config.cache = {
        type: "filesystem",
        cacheDirectory: path.join(__dirname, ".next", "cache", "webpack"),
        buildDependencies: {
          config: [__filename],
        },
      };
    } else {
      config.cache = {
        type: "memory",
      };
    }

    // Resolve module issues
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
      "@/lib": path.resolve(__dirname, "lib"),
      "ai/react": path.resolve(__dirname, "src", "shims", "ai-react.ts"),
    };

    // Optimize module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Add optimization for production builds
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              priority: 10,
            },
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Fix for PostgreSQL and other Node.js modules in browser
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        pg: "commonjs pg",
        "pg-native": "commonjs pg-native",
      });
    }

    // Handle module not found errors
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules/,
      type: "javascript/auto",
    });

    return config;
  },

  // Optimize compilation
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Configure redirects if needed
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
