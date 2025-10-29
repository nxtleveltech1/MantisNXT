import { NextRequest } from 'next/server'
import { withAuth } from '@/middleware/api-auth'
import { createDeprecationResponse } from '@/lib/api/deprecation'

// ============================================================================
// ENHANCED INVENTORY API - REAL-TIME DATA MANAGEMENT
// Advanced inventory operations with comprehensive analytics
// 
// @deprecated This endpoint is deprecated. Use /api/inventory instead.
// ============================================================================

/**
 * GET /api/inventory/enhanced - Advanced inventory search and analytics
 * @deprecated Use /api/inventory instead
 */
export const GET = withAuth(async (request: NextRequest) => {
  return createDeprecationResponse(
    '/api/inventory/enhanced',
    '/api/inventory',
    'This endpoint is deprecated. Use /api/inventory with query parameters for advanced search and analytics.'
  );
});

/**
 * POST /api/inventory/enhanced - Create inventory item with advanced features
 * @deprecated Use /api/inventory instead
 */
export const POST = withAuth(async (request: NextRequest) => {
  return createDeprecationResponse(
    '/api/inventory/enhanced',
    '/api/inventory',
    'This endpoint is deprecated. Use POST /api/inventory instead.'
  );
});

/**
 * PUT /api/inventory/enhanced - Bulk update inventory items
 * @deprecated Use /api/inventory instead
 */
export const PUT = withAuth(async (request: NextRequest) => {
  return createDeprecationResponse(
    '/api/inventory/enhanced',
    '/api/inventory',
    'This endpoint is deprecated. Use PUT /api/inventory instead.'
  );
});
