import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/dashboard/metrics
 * Redirects to the real dashboard_metrics endpoint.
 * This route previously returned 100% hardcoded mock data.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL('/api/dashboard_metrics', request.url);
  // Preserve any query params from the original request
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url, { status: 307 });
}
