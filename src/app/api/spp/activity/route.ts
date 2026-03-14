/**
 * GET /api/spp/activity - Unified Recent Activity
 *
 * Returns a combined feed of pricelist uploads and sync events (JSON Feed, PlusPortal)
 * for the Supplier Inventory Portfolio dashboard.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

export interface ActivityItem {
  type: 'upload' | 'sync';
  id: string;
  supplier_id: string | null;
  supplier_name: string;
  source: string;
  timestamp: string;
  row_count: number;
  status: string;
  details?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '25', 10), 50);

    const uploadsSql = `
      SELECT
        u.upload_id AS id,
        u.supplier_id::text AS supplier_id,
        COALESCE(s.name, 'Unknown') AS supplier_name,
        u.filename AS source,
        u.received_at AS timestamp,
        COALESCE(u.row_count, 0)::int AS row_count,
        u.status,
        NULL::jsonb AS details
      FROM spp.pricelist_upload u
      LEFT JOIN core.supplier s ON s.supplier_id::text = u.supplier_id::text
      ORDER BY u.received_at DESC
      LIMIT $1
    `;

    const auditSql = `
      SELECT
        a.id::text AS id,
        a.supplier_id::text AS supplier_id,
        COALESCE(s.name, 'Unknown') AS supplier_name,
        a.action AS source,
        COALESCE(a.finished_at, a.started_at) AS timestamp,
        (COALESCE((a.details->>'productsUpdated')::int, 0) + COALESCE((a.details->>'productsCreated')::int, 0)) AS row_count,
        a.status,
        a.details
      FROM public.ai_agent_audit a
      LEFT JOIN core.supplier s ON s.supplier_id::text = a.supplier_id::text
      WHERE a.action IN ('JSON Feed Sync', 'PlusPortal Sync')
      ORDER BY COALESCE(a.finished_at, a.started_at) DESC
      LIMIT $1
    `;

    const [uploadsRes, auditRes] = await Promise.all([
      query(uploadsSql, [limit]),
      query(auditSql, [limit]),
    ]);

    const uploadItems: ActivityItem[] = (uploadsRes.rows || []).map((row: Record<string, unknown>) => ({
      type: 'upload',
      id: String(row.id),
      supplier_id: row.supplier_id != null ? String(row.supplier_id) : null,
      supplier_name: String(row.supplier_name ?? 'Unknown'),
      source: String(row.source ?? ''),
      timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : String(row.timestamp),
      row_count: Number(row.row_count ?? 0),
      status: String(row.status ?? ''),
      details: (row.details as Record<string, unknown>) ?? undefined,
    }));

    const syncItems: ActivityItem[] = (auditRes.rows || []).map((row: Record<string, unknown>) => ({
      type: 'sync',
      id: String(row.id),
      supplier_id: row.supplier_id != null ? String(row.supplier_id) : null,
      supplier_name: String(row.supplier_name ?? 'Unknown'),
      source: String(row.source ?? ''),
      timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : String(row.timestamp),
      row_count: Number(row.row_count ?? 0),
      status: String(row.status ?? ''),
      details: (row.details as Record<string, unknown>) ?? undefined,
    }));

    const merged = [...uploadItems, ...syncItems].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const activities = merged.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: activities,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/spp/activity] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch activity',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
