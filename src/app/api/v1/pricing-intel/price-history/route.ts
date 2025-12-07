import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MarketIntelligenceService } from '@/lib/services/pricing-intel/MarketIntelligenceService';
import { ProductMatchService } from '@/lib/services/pricing-intel/ProductMatchService';
import { getOrgId } from '../_helpers';

const requestSchema = z.object({
  productId: z.string().uuid(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!productId) {
      return NextResponse.json(
        {
          data: null,
          error: { code: 'MISSING_PRODUCT_ID', message: 'productId query parameter is required' },
        },
        { status: 400 }
      );
    }

    const validated = requestSchema.parse({ productId, startDate, endDate });

    // Get product matches
    const matchService = new ProductMatchService();
    const matches = await matchService.listMatches(orgId, {
      internalProductId: validated.productId,
      status: 'matched',
    });

    if (matches.length === 0) {
      return NextResponse.json({
        data: {
          internalPriceHistory: [],
          competitorPriceHistory: [],
          dateRange: {
            start: startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            end: endDate || new Date().toISOString(),
          },
        },
        error: null,
      });
    }

    const matchIds = matches.map(m => m.match_id);
    const start = validated.startDate
      ? new Date(validated.startDate)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = validated.endDate ? new Date(validated.endDate) : new Date();

    // Get internal price history
    const { query } = await import('@/lib/database');
    const internalHistory = await query<{
      effective_date: Date;
      new_price: number;
      old_price: number | null;
    }>(
      `
        SELECT effective_date, new_price, old_price
        FROM ${(await import('@/lib/db/schema-contract')).SCHEMA.CORE}.price_history
        WHERE org_id = $1
          AND inventory_item_id = $2
          AND effective_date BETWEEN $3 AND $4
        ORDER BY effective_date ASC
      `,
      [orgId, validated.productId, start, end]
    );

    // Get competitor price snapshots
    const intelService = new MarketIntelligenceService();
    const competitorSnapshots = await query<{
      competitor_id: string;
      competitor_name: string;
      observed_at: Date;
      pricing: unknown;
    }>(
      `
        SELECT DISTINCT ON (snap.competitor_id, DATE(snap.observed_at))
          snap.competitor_id,
          cp.company_name as competitor_name,
          snap.observed_at,
          snap.pricing
        FROM ${(await import('@/lib/db/pricing-schema')).PRICING_TABLES.MARKET_INTEL_SNAPSHOT} snap
        LEFT JOIN ${(await import('@/lib/db/pricing-schema')).PRICING_TABLES.COMPETITOR_PROFILE} cp 
          ON cp.competitor_id = snap.competitor_id
        WHERE snap.org_id = $1
          AND snap.match_id = ANY($2::uuid[])
          AND snap.observed_at BETWEEN $3 AND $4
        ORDER BY snap.competitor_id, DATE(snap.observed_at), snap.observed_at DESC
      `,
      [orgId, matchIds, start, end]
    );

    // Format internal price history
    const internalPriceHistory = internalHistory.rows.map(row => ({
      date: row.effective_date.toISOString(),
      price: row.new_price,
      previousPrice: row.old_price,
      change: row.old_price ? row.new_price - row.old_price : 0,
      changePercent: row.old_price ? ((row.new_price - row.old_price) / row.old_price) * 100 : 0,
    }));

    // Group competitor prices by date and competitor
    const competitorPriceHistoryMap = new Map<
      string,
      Map<string, { price: number; date: string }>
    >();

    for (const snapshot of competitorSnapshots.rows) {
      const pricing = snapshot.pricing as Record<string, unknown>;
      const price = (pricing?.sale_price || pricing?.regular_price) as number | undefined;

      if (!price || typeof price !== 'number') continue;

      const dateKey = snapshot.observed_at.toISOString().split('T')[0];
      const competitorName = snapshot.competitor_name || 'Unknown';

      if (!competitorPriceHistoryMap.has(dateKey)) {
        competitorPriceHistoryMap.set(dateKey, new Map());
      }

      const competitorMap = competitorPriceHistoryMap.get(dateKey)!;
      // Keep the latest price for each competitor per day
      if (!competitorMap.has(competitorName)) {
        competitorMap.set(competitorName, {
          price,
          date: snapshot.observed_at.toISOString(),
        });
      }
    }

    // Convert to array format
    const competitorPriceHistory: Array<{
      date: string;
      competitor: string;
      competitorId: string;
      price: number;
    }> = [];

    competitorPriceHistoryMap.forEach((competitorMap, date) => {
      competitorMap.forEach((data, competitorName) => {
        const snapshot = competitorSnapshots.rows.find(
          s =>
            s.competitor_name === competitorName &&
            s.observed_at.toISOString().split('T')[0] === date
        );
        competitorPriceHistory.push({
          date,
          competitor: competitorName,
          competitorId: snapshot?.competitor_id || '',
          price: data.price,
        });
      });
    });

    return NextResponse.json({
      data: {
        internalPriceHistory,
        competitorPriceHistory,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
      error: null,
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch price history',
        },
      },
      { status: 500 }
    );
  }
}







