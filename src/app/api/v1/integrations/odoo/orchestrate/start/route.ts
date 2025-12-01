import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orgId = String(body.orgId || request.headers.get('x-org-id') || '').trim();
    const entityTypes = Array.isArray(body.entityTypes)
      ? body.entityTypes
      : ['customers', 'products'];
    const systems = ['odoo'];
    const config = {
      conflictStrategy: String(body.conflictStrategy || 'auto-retry'),
      batchSize: Math.min(Math.max(parseInt(String(body.batchSize || '50'), 10), 1), 200),
      maxRetries: Math.min(Math.max(parseInt(String(body.maxRetries || '3'), 10), 1), 5),
      rateLimit: Math.min(Math.max(parseInt(String(body.rateLimit || '10'), 10), 1), 50),
      interBatchDelayMs: Math.min(
        Math.max(parseInt(String(body.interBatchDelayMs || '2000'), 10), 0),
        60000
      ),
    };
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Missing organization' }, { status: 400 });
    }
    const res = await query(
      `SELECT public.sync_start_orchestration($1, $2::jsonb, $3::jsonb, $4::jsonb) AS sync_id`,
      [orgId, JSON.stringify(systems), JSON.stringify(entityTypes), JSON.stringify(config)]
    );
    return NextResponse.json(
      { success: true, data: { syncId: res.rows[0]?.sync_id } },
      { status: 202 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to start orchestration' },
      { status: 500 }
    );
  }
}
