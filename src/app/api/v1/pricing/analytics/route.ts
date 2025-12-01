/**
 * Pricing Analytics API Endpoints
 *
 * GET /api/v1/pricing/analytics/performance - Performance metrics
 * GET /api/v1/pricing/analytics/dashboard - Dashboard metrics
 * GET /api/v1/pricing/analytics/trends - Price trends
 *
 * Author: Aster
 * Date: 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { PriceAnalyticsService } from '@/lib/services/PriceAnalyticsService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'dashboard': {
        const days = parseInt(searchParams.get('days') || '30');
        const dashboardMetrics = await PriceAnalyticsService.getDashboardMetrics(days);
        return NextResponse.json({ success: true, data: dashboardMetrics });
      }

      case 'trends': {
        const trendDays = parseInt(searchParams.get('days') || '90');
        const categoryId = searchParams.get('category_id') || undefined;
        const brandId = searchParams.get('brand_id') || undefined;
        const trends = await PriceAnalyticsService.getPriceTrends(categoryId, brandId, trendDays);
        return NextResponse.json({ success: true, data: trends });
      }

      case 'competitor': {
        const productId = searchParams.get('product_id');
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'product_id required' },
            { status: 400 }
          );
        }
        const comparison = await PriceAnalyticsService.getCompetitorComparison(productId);
        return NextResponse.json({ success: true, data: comparison });
      }

      case 'elasticity': {
        const elasticityProductId = searchParams.get('product_id');
        if (!elasticityProductId) {
          return NextResponse.json(
            { success: false, error: 'product_id required' },
            { status: 400 }
          );
        }
        const elasticity = await PriceAnalyticsService.calculateElasticity(elasticityProductId);
        return NextResponse.json({ success: true, data: elasticity });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid analytics type' },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
