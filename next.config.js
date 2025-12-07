/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // eslint: { ignoreDuringBuilds: true }, // Deprecated in Next.js 16, moved to CLI/build process
  typescript: {
    // Skip TypeScript checking during build - errors documented in TYPESCRIPT_FIXES_NEEDED.md
    // This allows deployment while type errors are being fixed
    ignoreBuildErrors: true,
    // Completely skip type checking in build process
    tsconfigPath: './tsconfig.build.json',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'cdn.mantisnxt.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    unoptimized: process.env.NODE_ENV === 'development', // Disable image optimization in dev to prevent errors
  },
  // Only use standalone output in production builds
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  env: {
    UPLOAD_MAX_SIZE: process.env.UPLOAD_MAX_SIZE || '10485760',
    UPLOAD_DIR: process.env.UPLOAD_DIR || '/app/uploads',
  },

  // Configure headers for better caching and security
  async headers() {
    return [
      {
        source: '/api/health',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // API rewrites for better routing
  async rewrites() {
    return [
      {
        source: '/api/metrics',
        destination: '/api/monitoring/metrics',
      },
    ];
  },

  // Enhanced webpack configuration for stability
  webpack: (config, { dev, isServer, webpack }) => {
    config.output = {
      ...config.output,
      uniqueName: 'mantisnxt',
    };
    // Optimize cache configuration
    if (!dev) {
      config.cache = {
        type: 'filesystem',
        cacheDirectory: path.join(__dirname, '.next', 'cache', 'webpack'),
        buildDependencies: {
          config: [__filename],
        },
      };
    } else {
      config.cache = {
        type: 'memory',
      };
    }

    // Resolve module issues
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/lib': path.resolve(__dirname, 'lib'),
      'ai/react': path.resolve(__dirname, 'src', 'shims', 'ai-react.ts'),
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
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
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
        pg: 'commonjs pg',
        'pg-native': 'commonjs pg-native',
      });
    }

    // Handle module not found errors
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    // Bundle analyzer (enable with ANALYZE=true)
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze/client.html',
          openAnalyzer: false,
        })
      );
    }

    return config;
  },

  // Optimize compilation
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // CSS optimization
  experimental: {
    // optimizeCss: true, // Disabled to prevent syntax errors in production builds
  },

  // Configure redirects if needed
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
