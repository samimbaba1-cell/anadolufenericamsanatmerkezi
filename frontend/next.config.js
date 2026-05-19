const path = require('path');
const fs = require('fs');

/**
 * Geliştirme: Next rewrites ve NEXT_DEV_BACKEND_BASE aynı backend portuna
 * baksın (frontend/.env’de NEXT_INTERNAL_BACKEND yoksa ../backend/.env PORT okunur).
 * PORT=3100 + rewrite hedefi 3000 = DELETE /api/... istekleri yanlış process’e gider, Express "Route not found" döner.
 */
function getDevBackendBaseUrl() {
  if (process.env.NEXT_INTERNAL_BACKEND && String(process.env.NEXT_INTERNAL_BACKEND).trim() !== '') {
    return String(process.env.NEXT_INTERNAL_BACKEND).replace(/\/+$/, '');
  }
  const envPath = path.join(__dirname, '..', 'backend', '.env');
  let port = '3000';
  try {
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      const m = raw.match(/^\s*PORT\s*=\s*(\d+)/m);
      if (m) port = m[1];
    }
  } catch (_) {
    // yok
  }
  return `http://127.0.0.1:${port}`;
}

const isNodeDev = process.env.NODE_ENV === 'development';

/** LAN’den (ör. telefon) dev: Next 16 _next kaynaklarını ve HMR’ı aç */
const extraAllowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isNodeDev
    ? {
        env: {
          NEXT_DEV_BACKEND_BASE: getDevBackendBaseUrl(),
        },
      }
    : {}),
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    'http://127.0.0.1:3001',
    'http://localhost:3001',
    '192.168.1.20',
    'http://192.168.1.20',
    'http://192.168.1.20:3001',
    'http://192.168.1.20:3000',
    ...extraAllowedDevOrigins,
  ],

  // Set workspace root to silence multiple lockfiles warning
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: path.join(__dirname),
  
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['react-icons'],
  },
  
  // Disable strict mode for build
  reactStrictMode: false,
  
  // Disable static optimization for admin pages
  output: 'standalone',
  
  // Disable static generation for problematic pages
  trailingSlash: false,
  
  // Development cache settings
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  
  
  
  
  
  // Image optimization
  images: {
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.20',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Development modunda cache'i devre dışı bırak
    minimumCacheTTL: process.env.NODE_ENV === 'development' ? 0 : 31536000,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Compression
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  
  // Bundle analyzer (uncomment to analyze)
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.resolve.fallback = {
  //       ...config.resolve.fallback,
  //       fs: false,
  //     };
  //   }
  //   return config;
  // },

  // Headers for better caching (only in production)
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Development modunda cache'i devre dışı bırak
          ...(isDev ? [{
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          }] : []),
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev 
              ? 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
              : 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev 
              ? 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
              : 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Geliştirme: tarayıcı /api/* isteklerini Express’e ilet (Next 3000 iken
  // getApiBaseUrl() boş kalır; 3000’deki “yanlış app” 404’ünü önler)
  async rewrites() {
    if (process.env.NEXT_API_REWRITES === '0') {
      return [];
    }
    const target = isNodeDev
      ? getDevBackendBaseUrl()
      : (process.env.INTERNAL_API_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
    return [
      { source: '/api/:path*', destination: `${target}/api/:path*` },
      { source: '/uploads/:path*', destination: `${target}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
