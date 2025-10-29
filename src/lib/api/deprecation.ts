import { NextResponse } from 'next/server';

/**
 * Standard deprecation response for deprecated API endpoints
 */
export function createDeprecationResponse(
  oldEndpoint: string,
  newEndpoint: string,
  migrationNotes?: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Endpoint deprecated',
      deprecated: true,
      oldEndpoint,
      newEndpoint,
      migrationNotes: migrationNotes || `This endpoint has been deprecated. Please use ${newEndpoint} instead.`,
      code: 'DEPRECATED_ENDPOINT',
    },
    { status: 410 }
  );
}

