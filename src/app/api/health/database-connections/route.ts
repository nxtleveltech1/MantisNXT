/**
 * @deprecated This endpoint is deprecated. Use /api/health instead.
 */
import { NextRequest } from 'next/server'
import { createDeprecationResponse } from '@/lib/api/deprecation'

export async function GET(request: NextRequest) {
  return createDeprecationResponse(
    '/api/health/database-connections',
    '/api/health',
    'This endpoint is deprecated. Use /api/health instead.'
  );
}
