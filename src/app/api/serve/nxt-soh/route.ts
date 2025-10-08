/**
 * GET /api/serve/nxt-soh - Authoritative Stock on Hand for selected items only
 *
 * This is the SINGLE SOURCE OF TRUTH for operational stock queries.
 * Returns ONLY items in the active inventory selection.
 * If no active selection exists, returns empty array.
 *
 * All downstream modules (inventory, purchase orders, invoices, reporting)
 * should use this endpoint instead of querying stock directly.
 *
 * Query Parameters:
 * - supplier_ids: string[] - Filter by supplier IDs (comma-separated)
 * - location_ids: string[] - Filter by location IDs (comma-separated)
 * - search: string - Search by product name or SKU
 * - limit: number - Page size (default: 1000)
 * - offset: number - Page offset (default: 0)
 */

import { NextRequest, NextResponse } from 'next/server';
import { stockService } from '@/lib/services/StockService';
import { createErrorResponse, validateQueryParams } from '@/lib/utils/neon-error-handler';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate and parse query parameters
    const validation = validateQueryParams(searchParams, {
      limit: 'number',
      offset: 'number',
      search: 'string'
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // Parse array parameters manually
    const supplier_ids = searchParams.get('supplier_ids')?.split(',').filter(Boolean) || undefined;
    const location_ids = searchParams.get('location_ids')?.split(',').filter(Boolean) || undefined;

    // Query NXT SOH (selected items only)
    const nxtSoh = await stockService.getNxtSoh({
      supplier_ids,
      location_ids,
      search: validation.parsed.search,
      limit: validation.parsed.limit || 1000,
      offset: validation.parsed.offset || 0
    });

    // Get total count for pagination
    const totalQuery = await stockService.getNxtSoh({
      supplier_ids,
      location_ids,
      search: validation.parsed.search,
      limit: 999999 // Get all for count
    });
    const total = totalQuery.length;

    return NextResponse.json(
      {
        success: true,
        data: nxtSoh,
        pagination: {
          total,
          limit: validation.parsed.limit || 1000,
          offset: validation.parsed.offset || 0,
          has_more: (validation.parsed.offset || 0) + nxtSoh.length < total
        }
      },
      {
        headers: {
          // Cache for 30 seconds - balance between freshness and performance
          'Cache-Control': 'public, max-age=30, s-maxage=60'
        }
      }
    );
  } catch (error) {
    console.error('[API] NXT SOH error:', error);
    return createErrorResponse(error, 500);
  }
}
