import { NextResponse } from 'next/server';

const API_PREFIX = '/api';

const ALWAYS_PUBLIC_ENDPOINTS = [
  '/api/health',
  '/api/health/database',
  '/api/health/database-enterprise',
  '/api/health/database-connections',
  '/api/health/frontend',
  '/api/health/system',
  '/api/core/selections',
  '/api/dashboard_metrics',
  '/api/dashboard/inventory-by-category',
  '/api/dashboard/stock-alerts',
  '/api/dashboard/location-analytics',
  '/api/activities/recent',
  '/api/analytics/anomalies',
  '/api/analytics/dashboard',
  '/api/analytics/predictions',
  '/api/analytics/recommendations',
  '/api/catalog/metrics',
  '/api/suppliers',
  '/api/suppliers/v3',
  '/api/tag/ai-tagging',
  '/api/category/ai-categorization',
  '/api/v1/integrations/woocommerce/test',
  '/api/v1/integrations/woocommerce',
];

function parseAllowlist(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only guard API routes
  if (!pathname.startsWith(API_PREFIX)) {
    return NextResponse.next();
  }

  // Always allow OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // Check if pathname matches any public endpoint
  // Using startsWith to match both exact paths and sub-paths (e.g., /api/suppliers and /api/suppliers/v3)
  if (ALWAYS_PUBLIC_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))) {
    return NextResponse.next();
  }

  // Configurable allowlist for read-only endpoints (comma-separated prefixes)
  const allowList = parseAllowlist(process.env.ALLOW_PUBLIC_GET_ENDPOINTS);
  const allowListMatch =
    request.method === 'GET' && allowList.some(prefix => pathname.startsWith(prefix));
  if (allowListMatch) {
    return NextResponse.next();
  }

  // Optional header-based token to allow curated public access (e.g. demo embeds)
  const publicToken = process.env.PUBLIC_API_TOKEN;
  const suppliedToken =
    request.headers.get('x-public-token') ||
    request.headers.get('x-demo-token') ||
    request.headers.get('x-preview-token');
  if (publicToken && suppliedToken && suppliedToken === publicToken && request.method === 'GET') {
    return NextResponse.next();
  }

  // Require Authorization header (Bearer token). We avoid verifying in middleware to keep edge-safe.
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN',
      },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
