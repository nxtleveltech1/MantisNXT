// @ts-nocheck

import { query, withTransaction } from '@/lib/database/unified-connection';
import type { Supplier } from '@/domain/supplier';

export interface SupplierListFilters {
  search?: string;
  status?: Array<'active' | 'inactive' | 'pending' | 'suspended'>;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'code' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export async function listSuppliers(
  filters: SupplierListFilters = {}
): Promise<{ data: Supplier[]; total: number; page: number; limit: number }> {
  const { search, status, page = 1, limit = 500, sortBy = 'name', sortOrder = 'asc' } = filters;

  const offset = (page - 1) * limit;

  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  let i = 1;

  // Filter by active status by default (unless explicitly requesting inactive)
  const hasStatusFilter = status && status.length > 0;
  const hasActiveStatus = hasStatusFilter && status.includes('active');
  const hasInactiveStatus = hasStatusFilter && status.includes('inactive');

  if (!hasStatusFilter || (!hasInactiveStatus && hasActiveStatus)) {
    // Only show active suppliers by default, or if explicitly requesting active
    where.push(`active = true`);
  } else if (hasInactiveStatus && !hasActiveStatus) {
    // Only show inactive if explicitly requested and active not requested
    where.push(`active = false`);
  }
  // If both active and inactive are requested, no filter needed (show all)

  if (search && search.trim().length > 0) {
    where.push(`(name ILIKE $${i} OR code ILIKE $${i})`);
    params.push(`%${search}%`);
    i++;
  }

  // Map sortBy to actual column names in core.supplier table
  const sortByColumnMap: Record<string, string> = {
    name: 'name',
    code: 'code',
    status: 'active', // Map to active column, we'll convert to status in SELECT
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  const sortColumn = sortByColumnMap[sortBy] || 'name';

  // Read directly from core.supplier table
  const sql = `
    SELECT 
      supplier_id::text as id,
      name,
      code,
      active,
      org_id,
      created_at,
      updated_at,
      COUNT(*) OVER() as __total
    FROM core.supplier
    WHERE ${where.join(' AND ')}
    ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
    LIMIT $${i} OFFSET $${i + 1}
  `;
  params.push(limit, offset);

  const res = await query(sql, params);
  const total = res.rows.length > 0 ? Number(res.rows[0].__total) : 0;

  const data: Supplier[] = res.rows.map((r: unknown) => ({
    id: String(r.id),
    name: r.name,
    status: (r.active ? 'active' : 'inactive') as Supplier['status'],
    code: r.code ?? undefined,
    orgId: r.org_id ? String(r.org_id) : undefined,
    createdAt: new Date(r.created_at ?? Date.now()).toISOString(),
    updatedAt: new Date(r.updated_at ?? Date.now()).toISOString(),
  }));

  return { data, total, page, limit };
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const res = await query(
    `SELECT
       supplier_id::text as id,
       name,
       code,
       active,
       org_id,
       contact_info,
       default_currency,
       created_at,
       updated_at
     FROM core.supplier
     WHERE supplier_id::text = $1
     LIMIT 1`,
    [id]
  );
  const row = res.rows[0];
  if (!row) return null;

  const contactInfo =
    typeof row.contact_info === 'string'
      ? (() => {
          try {
            return JSON.parse(row.contact_info);
          } catch {
            return {};
          }
        })()
      : row.contact_info || {};

  return {
    id: String(row.id),
    name: row.name,
    status: (contactInfo.status ?? (row.active ? 'active' : 'inactive')) as Supplier['status'],
    code: row.code ?? undefined,
    orgId: row.org_id ? String(row.org_id) : undefined,
    createdAt: new Date(row.created_at ?? Date.now()).toISOString(),
    updatedAt: new Date(row.updated_at ?? Date.now()).toISOString(),
  };
}

export interface UpsertSupplierInput {
  id?: string;
  name: string;
  code?: string;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  currency?: string;
  paymentTerms?: string;
  contact?: { email?: string; phone?: string; website?: string };
  orgId?: string; // Organization ID - required for new suppliers
}

/**
 * Get default organization ID from database or environment
 */
async function getDefaultOrgId(): Promise<string> {
  // Try environment variable first
  const envOrgId = process.env.DEFAULT_ORG_ID;
  if (
    envOrgId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(envOrgId)
  ) {
    return envOrgId;
  }

  // Try to get from database
  try {
    const result = await query<{ id: string }>(
      'SELECT id FROM public.organization ORDER BY created_at LIMIT 1'
    );
    if (result.rows && result.rows.length > 0) {
      return result.rows[0].id;
    }
  } catch (error) {
    console.warn('Failed to fetch organization from database:', error);
  }

  // Fallback to known default
  return 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
}

export async function upsertSupplier(input: UpsertSupplierInput): Promise<Supplier> {
  const {
    id,
    name,
    code,
    status = 'active',
    currency = 'ZAR',
    paymentTerms,
    contact,
    orgId,
  } = input;

  return withTransaction(async client => {
    // Resolve org_id - use provided, or get default
    let resolvedOrgId = orgId;
    if (!resolvedOrgId) {
      resolvedOrgId = await getDefaultOrgId();
    }

    if (id) {
      await client.query(
        `UPDATE core.supplier
         SET name = COALESCE($1, name),
             code = COALESCE($2, code),
             active = CASE WHEN $3 IS NULL THEN active ELSE ($3 = 'active') END,
             default_currency = COALESCE($4, default_currency),
             payment_terms = COALESCE($5, payment_terms),
             contact_info = COALESCE($6, contact_info),
             org_id = COALESCE($7, org_id),
             updated_at = NOW()
         WHERE supplier_id = $8`,
        [
          name,
          code ?? null,
          status,
          currency,
          paymentTerms ?? null,
          contact ? JSON.stringify(contact) : null,
          resolvedOrgId,
          id,
        ]
      );
    } else {
      // For new suppliers, org_id is required
      const ins = await client.query(
        `INSERT INTO core.supplier (name, code, active, default_currency, payment_terms, contact_info, org_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING supplier_id`,
        [
          name,
          code ?? null,
          status === 'active',
          currency,
          paymentTerms ?? null,
          contact ? JSON.stringify(contact) : null,
          resolvedOrgId,
        ]
      );
      input.id = String(ins.rows[0].supplier_id);
    }

    const sup = await client.query(
      `SELECT supplier_id as id, name, code, active, org_id, created_at, updated_at
       FROM core.supplier
       WHERE supplier_id = $1`,
      [input.id]
    );
    const row = sup.rows[0];
    return {
      id: String(row.id),
      name: row.name,
      status: row.active ? 'active' : 'inactive',
      code: row.code ?? undefined,
      orgId: row.org_id ? String(row.org_id) : undefined,
      createdAt: new Date(row.created_at ?? Date.now()).toISOString(),
      updatedAt: new Date(row.updated_at ?? Date.now()).toISOString(),
    };
  });
}

export async function deactivateSupplier(id: string): Promise<void> {
  await query(
    `UPDATE core.supplier SET active = false, updated_at = NOW() WHERE supplier_id = $1`,
    [id]
  );
}

export async function linkExternalRef(_id: string, _system: string, _value: string): Promise<void> {
  // TODO: Implement external refs mapping table if/when required.
}
