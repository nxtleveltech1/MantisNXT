/**
 * GET /api/spp/dashboard/metrics - Dashboard metrics for SPP system
 *
 * Provides key metrics for the PortfolioDashboard component:
 * - Total suppliers with uploads
 * - Total active supplier products
 * - Selected products in active selection
 * - Selected inventory value
 * - New products count
 * - Recent price changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { pricelistService } from '@/lib/services/PricelistService';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';

export async function GET(request: NextRequest) {
  try {
    // Use service layer for metrics (optimized with parallel queries)
    const metrics = await pricelistService.getDashboardMetrics();

    return NextResponse.json(
      {
        success: true,
        data: metrics
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=120'
        }
      }
    );
  } catch (error) {
    console.error('[API] Dashboard metrics error:', error);
    return createErrorResponse(error, 500);
  }
}
