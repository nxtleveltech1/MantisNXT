/**
 * Complete Inventory Management API
 * Live database integration with full CRUD operations
 * 
 * @deprecated This endpoint is deprecated. Use /api/inventory instead.
 * Migration: Update requests to use /api/inventory with query parameters.
 */

import { NextRequest } from 'next/server'
import { createDeprecationResponse } from '@/lib/api/deprecation'

// GET /api/inventory/complete - Enhanced inventory listing with analytics
// @deprecated Use /api/inventory instead
export async function GET(request: NextRequest) {
  return createDeprecationResponse(
    '/api/inventory/complete',
    '/api/inventory',
    'This endpoint is deprecated. Use /api/inventory with query parameters for filtering and pagination.'
  );
}

// POST /api/inventory/complete - Create new inventory item
// @deprecated Use /api/inventory instead
export async function POST(request: NextRequest) {
  return createDeprecationResponse(
    '/api/inventory/complete',
    '/api/inventory',
    'This endpoint is deprecated. Use POST /api/inventory instead.'
  );
}

// PUT /api/inventory/complete - Bulk update operations
// @deprecated Use /api/inventory instead
export async function PUT(request: NextRequest) {
  return createDeprecationResponse(
    '/api/inventory/complete',
    '/api/inventory',
    'This endpoint is deprecated. Use PUT /api/inventory instead.'
  );
}
