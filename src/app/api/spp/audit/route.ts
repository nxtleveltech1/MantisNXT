import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const supplierId = url.searchParams.get('supplier_id');
    const uploadId = url.searchParams.get('upload_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const where: string[] = [];
    const params: unknown[] = [];
    if (supplierId) {
      where.push(`supplier_id = $${params.length + 1}`);
      params.push(supplierId);
    }
    if (uploadId) {
      where.push(`upload_id = $${params.length + 1}`);
      params.push(uploadId);
    }
    const sql = `
      SELECT id, supplier_id, upload_id, action, status, details, started_at, finished_at
      FROM public.ai_agent_audit
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY started_at DESC
      LIMIT $${params.length + 1}
    `;
    params.push(limit);
    const res = await query(sql, params);
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to list audit' },
      { status: 500 }
    );
  }
}
