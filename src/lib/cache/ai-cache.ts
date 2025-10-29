import { NextRequest, NextResponse } from 'next/server'
import { getOrSet, makeKey } from '@/lib/cache/responseCache'

/**
 * Cache wrapper for AI routes
 * Extends caching to AI endpoints using responseCache.ts
 */
export async function withAICache<T>(
  request: NextRequest,
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return fetcher()
  }

  // Generate cache key from URL and query params
  const url = new URL(request.url)
  const fullKey = makeKey(`${cacheKey}:${url.pathname}`, Object.fromEntries(url.searchParams))
  
  // Use configured TTL or default to 5 minutes for AI responses
  const cacheTTL = ttl || parseInt(process.env.CACHE_TTL_SECONDS || '300', 10)
  
  return getOrSet(fullKey, fetcher, cacheTTL)
}

