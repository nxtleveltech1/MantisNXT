/**
 * GET /api/category/ai-categorization/stats
 * Get overall categorization statistics
 */

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';
import type { CategorizationStats } from '@/lib/cmm/ai-categorization/types';

export async function GET(request: NextRequest) {
  try {
    // Get overall stats
    const statsSql = `
      WITH stats AS (
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as categorized_count,
          COUNT(CASE WHEN ai_categorization_status IN ('pending', 'pending_review') THEN 1 END) as pending_count,
          COUNT(CASE WHEN ai_categorization_status = 'pending_review' THEN 1 END) as pending_review_count,
          COUNT(CASE WHEN ai_categorization_status = 'failed' THEN 1 END) as failed_count,
          AVG(CASE WHEN ai_confidence IS NOT NULL THEN ai_confidence END) as avg_confidence,
          COUNT(CASE WHEN ai_confidence >= 0.8 THEN 1 END) as high_confidence,
          COUNT(CASE WHEN ai_confidence >= 0.6 AND ai_confidence < 0.8 THEN 1 END) as medium_confidence,
          COUNT(CASE WHEN ai_confidence < 0.6 THEN 1 END) as low_confidence,
          MAX(ai_categorized_at) as last_run_at
        FROM core.supplier_product
      ),
      status_counts AS (
        SELECT 
          ai_categorization_status,
          COUNT(*) as count
        FROM core.supplier_product
        GROUP BY ai_categorization_status
      ),
      provider_counts AS (
        SELECT 
          ai_provider,
          COUNT(*) as count
        FROM core.supplier_product
        WHERE ai_provider IS NOT NULL
        GROUP BY ai_provider
      ),
      active_jobs AS (
        SELECT COUNT(*) as count
        FROM core.ai_categorization_job
        WHERE status IN ('queued', 'running')
      )
      SELECT 
        s.total_products,
        s.categorized_count,
        CASE 
          WHEN s.total_products > 0 
          THEN ROUND((s.categorized_count::DECIMAL / s.total_products::DECIMAL) * 100, 2)
          ELSE 0
        END as categorized_percentage,
      s.pending_count,
      s.pending_review_count,
        s.failed_count,
        s.avg_confidence,
        s.high_confidence,
        s.medium_confidence,
        s.low_confidence,
        s.last_run_at,
        aj.count as active_jobs_count,
        COALESCE(
          json_object_agg(sc.ai_categorization_status, sc.count) FILTER (WHERE sc.ai_categorization_status IS NOT NULL),
          '{}'::json
        ) as by_status,
        COALESCE(
          json_object_agg(pc.ai_provider, pc.count) FILTER (WHERE pc.ai_provider IS NOT NULL),
          '{}'::json
        ) as by_provider
      FROM stats s
      CROSS JOIN active_jobs aj
      LEFT JOIN status_counts sc ON true
      LEFT JOIN provider_counts pc ON true
      GROUP BY s.total_products, s.categorized_count, s.pending_count, s.pending_review_count, s.failed_count, 
               s.avg_confidence, s.high_confidence, s.medium_confidence, s.low_confidence,
               s.last_run_at, aj.count
    `;

    const result = await dbQuery<{
      total_products: number;
      categorized_count: number;
      categorized_percentage: number;
      pending_count: number;
      failed_count: number;
      pending_review_count: number;
      avg_confidence: number | null;
      high_confidence: number;
      medium_confidence: number;
      low_confidence: number;
      last_run_at: Date | null;
      active_jobs_count: number;
      by_status: Record<string, number>;
      by_provider: Record<string, number>;
    }>(statsSql);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          total_products: 0,
          categorized_count: 0,
          categorized_percentage: 0,
          pending_count: 0,
          pending_review_count: 0,
          failed_count: 0,
          avg_confidence: null,
          confidence_distribution: { high: 0, medium: 0, low: 0 },
          by_status: {},
          by_provider: {},
          last_run_at: null,
          active_jobs_count: 0,
        },
      });
    }

    const row = result.rows[0];

    const stats: CategorizationStats = {
      total_products: Number(row.total_products),
      categorized_count: Number(row.categorized_count),
      categorized_percentage: Number(row.categorized_percentage),
      pending_count: Number(row.pending_count),
      pending_review_count: Number(row.pending_review_count),
      failed_count: Number(row.failed_count),
      avg_confidence: row.avg_confidence ? Number(row.avg_confidence) : null,
      confidence_distribution: {
        high: Number(row.high_confidence),
        medium: Number(row.medium_confidence),
        low: Number(row.low_confidence),
      },
      by_status: row.by_status,
      by_provider: row.by_provider,
      last_run_at: row.last_run_at,
      active_jobs_count: Number(row.active_jobs_count),
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[API] Error getting stats:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get stats',
      },
      { status: 500 }
    );
  }
}
