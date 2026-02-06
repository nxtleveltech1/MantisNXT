/**
 * Pricing Analytics API Endpoints
 *
 * GET /api/v1/pricing/analytics?type=dashboard|trends|competitor|elasticity
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
    const type = searchParams.get('type');

    switch (type) {
      case 'dashboard': {
        const days = parseInt(searchParams.get('days') || '30');
        const dashboardMetrics = await PriceAnalyticsService.getDashboardMetrics(orgId, days);
        return NextResponse.json({ success: true, data: dashboardMetrics });
      }

      case 'trends': {
        const trendDays = parseInt(searchParams.get('days') || '90');
        const categoryId = searchParams.get('category_id') || undefined;
        const brandId = searchParams.get('brand_id') || undefined;
        const trends = await PriceAnalyticsService.getPriceTrends(orgId, categoryId, brandId, trendDays);
        return NextResponse.json({ success: true, data: trends });
      }

      case 'competitor': {
        const productId = searchParams.get('product_id');
        if (!productId) {
          return NextResponse.json({ success: false, error: 'product_id required' }, { status: 400 });
        }
        const comparison = await PriceAnalyticsService.getCompetitorComparison(orgId, productId);
        return NextResponse.json({ success: true, data: comparison });
      }

      case 'elasticity': {
        const elasticityProductId = searchParams.get('product_id');
        if (!elasticityProductId) {
          return NextResponse.json({ success: false, error: 'product_id required' }, { status: 400 });
        }
        const elasticity = await PriceAnalyticsService.calculateElasticity(orgId, elasticityProductId);
        return NextResponse.json({ success: true, data: elasticity });
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid analytics type. Use: dashboard, trends, competitor, elasticity' }, { status: 400 });
    }
  } catch (error) {
    return handleError(error);
  }
}
