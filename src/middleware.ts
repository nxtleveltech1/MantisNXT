import { NextResponse } from 'next/server'

const API_PREFIX = '/api'

function parseAllowlist(input: string | undefined): string[] {
  if (!input) return []
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function middleware(request: Request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // Only guard API routes
  if (!pathname.startsWith(API_PREFIX)) {
    return NextResponse.next()
  }

  // Always allow health and OPTIONS (preflight)
  if (request.method === 'OPTIONS' || pathname === '/api/health') {
    return NextResponse.next()
  }

  // Dev allowlist for public GETs (comma-separated prefixes)
  const allowList = parseAllowlist(process.env.ALLOW_PUBLIC_GET_ENDPOINTS)
  if (
    process.env.NODE_ENV !== 'production' &&
    request.method === 'GET' &&
    allowList.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next()
  }

  // Require Authorization header (Bearer token). We avoid verifying in middleware to keep edge-safe.
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN',
      },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}

