import type { NextRequest } from 'next/server';
import { query } from '@/lib/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMERGENCY_ORG_ID = '00000000-0000-0000-0000-000000000001';

export interface WooConnectorRow {
  connector_id: string;
  org_id: string | null;
  config: Record<string, unknown>;
  status?: string;
  last_sync_at?: string;
}

function normalizeOrgId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

export function resolveWooOrgId(
  request: NextRequest,
  body?: Record<string, unknown>
): { orgId: string; source: string; usedFallback: boolean } {
  const bodyOrg = normalizeOrgId((body as any)?.orgId ?? (body as any)?.org_id);
  const headerOrg = normalizeOrgId(request.headers.get('x-org-id') || request.headers.get('x-organization-id'));
  const queryOrg = normalizeOrgId(new URL(request.url).searchParams.get('orgId'));
  const envOrg = normalizeOrgId(process.env.DEFAULT_ORG_ID || null);

  const orgId = bodyOrg || headerOrg || queryOrg || envOrg || EMERGENCY_ORG_ID;
  const source = bodyOrg
    ? 'body'
    : headerOrg
      ? 'header'
      : queryOrg
        ? 'query'
        : envOrg
          ? 'env'
          : 'emergency';

  return { orgId, source, usedFallback: source === 'env' || source === 'emergency' };
}

export async function getActiveWooConnector(
  preferredOrgId: string
): Promise<{ connector: WooConnectorRow | null; orgId: string; usedFallback: boolean; source: string }> {
  const envOrg = normalizeOrgId(process.env.DEFAULT_ORG_ID || null);
  const candidates = Array.from(
    new Set(
      [normalizeOrgId(preferredOrgId), envOrg, EMERGENCY_ORG_ID].filter(Boolean) as string[]
    )
  );

  for (const candidate of candidates) {
    const res = await query<WooConnectorRow>(
      `SELECT id as connector_id, org_id, config, status::text as status, last_sync_at
       FROM integration_connector
       WHERE provider = 'woocommerce' AND status::text = 'active' AND org_id = $1
       ORDER BY updated_at DESC LIMIT 1`,
      [candidate]
    );

    if (res.rows.length) {
      return {
        connector: res.rows[0],
        orgId: candidate,
        usedFallback: candidate !== preferredOrgId,
        source: candidate === preferredOrgId ? 'requested' : candidate === envOrg ? 'env' : 'emergency',
      };
    }
  }

  const globalRes = await query<WooConnectorRow>(
    `SELECT id as connector_id, org_id, config, status::text as status, last_sync_at
     FROM integration_connector
     WHERE provider = 'woocommerce' AND status::text = 'active'
     ORDER BY updated_at DESC LIMIT 1`
  );

  if (globalRes.rows.length) {
    const row = globalRes.rows[0];
    return {
      connector: row,
      orgId: row.org_id || preferredOrgId,
      usedFallback: true,
      source: 'global',
    };
  }

  return { connector: null, orgId: preferredOrgId, usedFallback: true, source: 'none' };
}
