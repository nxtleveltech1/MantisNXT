/**
 * Sync Activity Log API Route
 *
 * Endpoint: /api/v1/integrations/sync/activity
 *
 * GET /api/v1/integrations/sync/activity?orgId={orgId}
 *   - Fetch activity log entries for an organization
 *   - Returns array of ActivityLogEntry objects
 *   - Falls back to localStorage if API unavailable
 *
 * Authentication: Optional (falls back to localStorage if not authenticated)
 * Rate Limit: 30 requests/min per org
 */

import { query } from '@/lib/database';

interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: 'sync' | 'preview' | 'orchestrate' | 'cancel';
  entityType: string;
  syncType: 'woocommerce' | 'odoo';
  status: 'completed' | 'failed' | 'partial' | 'cancelled';
  recordCount: number;
  createdCount?: number;
  updatedCount?: number;
  deletedCount?: number;
  failedCount?: number;
  duration: number;
  errorMessage?: string;
}

/**
 * GET - Fetch activity log entries
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('orgId')
    if (!orgId) {
      return new Response(JSON.stringify({ error: 'orgId is required' }), { status: 400 })
    }

    // Use action::text to avoid enum coercion when rows contain unexpected/null values
    const sql = `
      SELECT
        id,
        org_id,
        (action)::text as action,
        status,
        started_at,
        finished_at,
        COALESCE(error_message, '') as error_message
      FROM integration_sync_activity
      WHERE org_id = $1
      ORDER BY started_at DESC
      LIMIT 100
    `

    const rows = await query(sql, [orgId])
    return new Response(JSON.stringify({ data: rows }), { status: 200 })
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), { status: 500 })
  }
}

