import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database/unified-connection';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

type StatusCountRow = { status: string; count: string };
type ProviderCountRow = { provider_name: string; count: string };
type TotalsRow = { total: string; delivered: string; active: string; cancelled: string };

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);

    const [totalsRes, byStatusRes, byProviderRes] = await Promise.all([
      query<TotalsRow>(
        `
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE status = 'delivered')::text AS delivered,
          COUNT(*) FILTER (WHERE status IN ('pending','confirmed','picked_up','in_transit','out_for_delivery'))::text AS active,
          COUNT(*) FILTER (WHERE status = 'cancelled')::text AS cancelled
        FROM deliveries
        WHERE org_id = $1
      `,
        [orgId]
      ),
      query<StatusCountRow>(
        `
        SELECT status::text AS status, COUNT(*)::text AS count
        FROM deliveries
        WHERE org_id = $1
        GROUP BY status
        ORDER BY COUNT(*) DESC
      `,
        [orgId]
      ),
      query<ProviderCountRow>(
        `
        SELECT COALESCE(cp.name, 'Unassigned') AS provider_name, COUNT(*)::text AS count
        FROM deliveries d
        LEFT JOIN courier_providers cp ON cp.id = d.courier_provider_id
        WHERE d.org_id = $1
        GROUP BY COALESCE(cp.name, 'Unassigned')
        ORDER BY COUNT(*) DESC
      `,
        [orgId]
      ),
    ]);

    const totals = totalsRes.rows[0] ?? { total: '0', delivered: '0', active: '0', cancelled: '0' };

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          total: Number(totals.total),
          delivered: Number(totals.delivered),
          active: Number(totals.active),
          cancelled: Number(totals.cancelled),
        },
        byStatus: byStatusRes.rows.map((r) => ({ status: r.status, count: Number(r.count) })),
        byProvider: byProviderRes.rows.map((r) => ({
          provider_name: r.provider_name,
          count: Number(r.count),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching logistics reports:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}




