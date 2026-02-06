/**
 * GET /api/tag/ai-tagging/stats
 * Get overall tagging statistics
 *
 * Uses ai_tag_assignment as the primary source of truth for tagged counts.
 * Tracking columns on supplier_product (ai_tagging_status, ai_tag_confidence, etc.)
 * are secondary — stats degrade gracefully when they're missing or unpopulated.
 */

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';
import type { TaggingStats } from '@/lib/cmm/ai-tagging/types';

export async function GET(request: NextRequest) {
  try {
    // Determine which tracking columns exist on the foreign table
    const columnCheckSql = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'core'
        AND table_name = 'supplier_product'
        AND column_name IN ('ai_tagging_status', 'ai_tag_confidence', 'ai_tagged_at', 'ai_tag_provider')
    `;
    const columnCheck = await dbQuery<{ column_name: string }>(columnCheckSql);
    const cols = new Set(columnCheck.rows.map(r => r.column_name));

    const hasStatus = cols.has('ai_tagging_status');
    const hasConfidence = cols.has('ai_tag_confidence');
    const hasTaggedAt = cols.has('ai_tagged_at');
    const hasProvider = cols.has('ai_tag_provider');

    // Check if job table exists (it's local, not via FDW)
    const jobTableCheck = await dbQuery<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'core' AND table_name = 'ai_tagging_job'
      ) as exists`
    );
    const hasJobTable = jobTableCheck.rows[0]?.exists ?? false;

    // ---------- Core counts from ai_tag_assignment (always available) ----------
    const assignmentStatsSql = `
      SELECT
        COUNT(DISTINCT supplier_product_id) as tagged_count,
        COUNT(*) as total_assignments,
        MAX(assigned_at) as last_assignment_at
      FROM core.ai_tag_assignment
    `;

    const totalProductsSql = `SELECT COUNT(*) as total_products FROM core.supplier_product`;

    // Tag distribution by tag
    const tagDistSql = `
      SELECT
        a.assigned_by,
        COUNT(DISTINCT a.supplier_product_id) as product_count
      FROM core.ai_tag_assignment a
      GROUP BY a.assigned_by
    `;

    const [assignmentRes, totalRes, tagDistRes] = await Promise.all([
      dbQuery<{ tagged_count: number; total_assignments: number; last_assignment_at: Date | null }>(
        assignmentStatsSql
      ),
      dbQuery<{ total_products: number }>(totalProductsSql),
      dbQuery<{ assigned_by: string; product_count: number }>(tagDistSql),
    ]);

    const taggedCount = Number(assignmentRes.rows[0]?.tagged_count ?? 0);
    const totalProducts = Number(totalRes.rows[0]?.total_products ?? 0);
    const lastAssignmentAt = assignmentRes.rows[0]?.last_assignment_at ?? null;

    // ---------- Tracking-column stats (optional, from supplier_product) ----------
    let pendingCount = 0;
    let pendingReviewCount = 0;
    let failedCount = 0;
    let avgConfidence: number | null = null;
    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;
    let lastRunAt: Date | null = lastAssignmentAt;
    let byStatus: Record<string, number> = {};
    let byProvider: Record<string, number> = {};

    if (hasStatus || hasConfidence || hasTaggedAt || hasProvider) {
      // Build dynamic query based on available columns
      const selectParts: string[] = [];

      if (hasStatus) {
        selectParts.push(
          `COUNT(CASE WHEN ai_tagging_status IN ('pending', 'pending_review') THEN 1 END) as pending_count`,
          `COUNT(CASE WHEN ai_tagging_status = 'pending_review' THEN 1 END) as pending_review_count`,
          `COUNT(CASE WHEN ai_tagging_status = 'failed' THEN 1 END) as failed_count`
        );
      }
      if (hasConfidence) {
        selectParts.push(
          `AVG(CASE WHEN ai_tag_confidence IS NOT NULL THEN ai_tag_confidence END) as avg_confidence`,
          `COUNT(CASE WHEN ai_tag_confidence >= 0.8 THEN 1 END) as high_confidence`,
          `COUNT(CASE WHEN ai_tag_confidence >= 0.6 AND ai_tag_confidence < 0.8 THEN 1 END) as medium_confidence`,
          `COUNT(CASE WHEN ai_tag_confidence > 0 AND ai_tag_confidence < 0.6 THEN 1 END) as low_confidence`
        );
      }
      if (hasTaggedAt) {
        selectParts.push(`MAX(ai_tagged_at) as last_run_at`);
      }

      if (selectParts.length > 0) {
        const trackingSql = `SELECT ${selectParts.join(', ')} FROM core.supplier_product`;
        try {
          const trackingRes = await dbQuery<Record<string, unknown>>(trackingSql);
          const t = trackingRes.rows[0] ?? {};

          if (hasStatus) {
            pendingCount = Number(t.pending_count ?? 0);
            pendingReviewCount = Number(t.pending_review_count ?? 0);
            failedCount = Number(t.failed_count ?? 0);
          }
          if (hasConfidence) {
            avgConfidence = t.avg_confidence ? Number(t.avg_confidence) : null;
            highConfidence = Number(t.high_confidence ?? 0);
            mediumConfidence = Number(t.medium_confidence ?? 0);
            lowConfidence = Number(t.low_confidence ?? 0);
          }
          if (hasTaggedAt && t.last_run_at) {
            lastRunAt = t.last_run_at as Date;
          }
        } catch (trackingErr) {
          console.warn('[API] Tracking column query failed (degraded mode):', trackingErr);
        }
      }

      // Status breakdown
      if (hasStatus) {
        try {
          const statusRes = await dbQuery<{ ai_tagging_status: string; count: number }>(
            `SELECT ai_tagging_status, COUNT(*) as count FROM core.supplier_product WHERE ai_tagging_status IS NOT NULL GROUP BY ai_tagging_status`
          );
          byStatus = Object.fromEntries(
            statusRes.rows.map(r => [r.ai_tagging_status, Number(r.count)])
          );
        } catch {
          /* graceful degradation */
        }
      }

      // Provider breakdown
      if (hasProvider) {
        try {
          const providerRes = await dbQuery<{ ai_tag_provider: string; count: number }>(
            `SELECT ai_tag_provider, COUNT(*) as count FROM core.supplier_product WHERE ai_tag_provider IS NOT NULL GROUP BY ai_tag_provider`
          );
          byProvider = Object.fromEntries(
            providerRes.rows.map(r => [r.ai_tag_provider, Number(r.count)])
          );
        } catch {
          /* graceful degradation */
        }
      }
    }

    // If no status tracking, compute pending as total minus tagged
    if (!hasStatus) {
      pendingCount = Math.max(0, totalProducts - taggedCount);
    }

    // Merge provider data from assignments if no column-level provider data
    if (Object.keys(byProvider).length === 0) {
      for (const row of tagDistRes.rows) {
        byProvider[row.assigned_by] = Number(row.product_count);
      }
    }

    // ---------- Active jobs ----------
    let activeJobsCount = 0;
    if (hasJobTable) {
      try {
        const jobRes = await dbQuery<{ count: number }>(
          `SELECT COUNT(*) as count FROM core.ai_tagging_job WHERE status IN ('queued', 'running')`
        );
        activeJobsCount = Number(jobRes.rows[0]?.count ?? 0);
      } catch {
        /* graceful degradation */
      }
    }

    const taggedPercentage =
      totalProducts > 0 ? Math.round((taggedCount / totalProducts) * 10000) / 100 : 0;

    const stats: TaggingStats = {
      total_products: totalProducts,
      tagged_count: taggedCount,
      tagged_percentage: taggedPercentage,
      pending_count: pendingCount,
      pending_review_count: pendingReviewCount,
      failed_count: failedCount,
      avg_confidence: avgConfidence,
      confidence_distribution: {
        high: highConfidence,
        medium: mediumConfidence,
        low: lowConfidence,
      },
      by_status: byStatus,
      by_provider: byProvider,
      last_run_at: lastRunAt,
      active_jobs_count: activeJobsCount,
    };

    return NextResponse.json({ success: true, stats });
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
