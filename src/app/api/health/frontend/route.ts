/**
 * @deprecated This endpoint is deprecated. Use /api/health instead.
 */
import { NextRequest } from 'next/server'
import { createDeprecationResponse } from '@/lib/api/deprecation'

export async function GET(request: NextRequest) {
  return createDeprecationResponse(
    '/api/health/frontend',
    '/api/health',
    'This endpoint is deprecated. Use /api/health instead.'
  );
}
