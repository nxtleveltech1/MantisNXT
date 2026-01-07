import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ===========================================
// Public Route Definitions
// ===========================================

// Routes that don't require Clerk authentication
const isPublicRoute = createRouteMatcher([
  '/auth/login(.*)',
  '/auth/register(.*)',
  '/auth/forgot-password(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk(.*)',
  '/api/auth/login(.*)',
  '/api/v1/auth/login(.*)',
]);

// API endpoints that are always publicly accessible
const ALWAYS_PUBLIC_ENDPOINTS = [
  '/api/health',
  '/api/health/database',
  '/api/health/database-enterprise',
  '/api/health/database-connections',
  '/api/health/frontend',
  '/api/health/system',
  '/api/core/selections',
  '/api/v1/products/pos',
  '/api/v1/sales/pos',
  '/api/v1/customers',
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
  '/api/webhooks/clerk',
];

// ===========================================
// Helper Functions
// ===========================================

function parseAllowlist(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function isPublicApiEndpoint(pathname: string, method: string): boolean {
  // Always allow OPTIONS (preflight)
  if (method === 'OPTIONS') {
    return true;
  }

  // Check if pathname matches any always-public endpoint
  if (ALWAYS_PUBLIC_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))) {
    return true;
  }

  // Configurable allowlist for read-only endpoints (comma-separated prefixes)
  const allowList = parseAllowlist(process.env.ALLOW_PUBLIC_GET_ENDPOINTS);
  if (method === 'GET' && allowList.some(prefix => pathname.startsWith(prefix))) {
    return true;
  }

  return false;
}

// ===========================================
// Clerk Middleware with Custom Logic
// ===========================================

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // Skip auth for public routes defined in Clerk matcher
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Skip auth for public API endpoints
  if (pathname.startsWith('/api') && isPublicApiEndpoint(pathname, method)) {
    return NextResponse.next();
  }

  // Optional: Check for public API token (for demo embeds)
  const publicToken = process.env.PUBLIC_API_TOKEN;
  const suppliedToken =
    request.headers.get('x-public-token') ||
    request.headers.get('x-demo-token') ||
    request.headers.get('x-preview-token');
  
  if (publicToken && suppliedToken && suppliedToken === publicToken && method === 'GET') {
    return NextResponse.next();
  }

  // Development mode: bypass auth if DISABLE_AUTH is true
  if (process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Protect all other routes with Clerk
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
