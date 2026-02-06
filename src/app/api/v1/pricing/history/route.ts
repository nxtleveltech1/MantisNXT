/**
 * Price History API Endpoints
 *
 * GET /api/v1/pricing/history - Get price history and changes
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { PriceAnalyticsService } from '@/lib/services/PriceAnalyticsService';
import { requireAuthOrg } from '@/lib/auth/require-org';
import { handleError } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuthOrg(request);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const type = searchParams.get('type') || 'product';

    if (type === 'recent') {
      const limit = parseInt(searchParams.get('limit') || '100');
      const changes = await PriceAnalyticsService.getRecentPriceChanges(orgId, limit);
      return NextResponse.json({ success: true, data: changes, count: changes.length });
    }

    if (type === 'product') {
      if (!productId) {
        return NextResponse.json({ success: false, error: 'product_id required' }, { status: 400 });
      }
      const startDate = searchParams.get('start_date') ? new Date(searchParams.get('start_date')!) : undefined;
      const endDate = searchParams.get('end_date') ? new Date(searchParams.get('end_date')!) : undefined;
      const history = await PriceAnalyticsService.getPriceHistory(orgId, productId, startDate, endDate);
      return NextResponse.json({ success: true, data: history, count: history.length });
    }

    return NextResponse.json({ success: false, error: 'Invalid history type' }, { status: 400 });
  } catch (error) {
    return handleError(error);
  }
}
