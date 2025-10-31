import { query, withTransaction } from '@/lib/database/unified-connection'
import type { Supplier } from '@/domain/supplier'

export interface SupplierListFilters {
  search?: string;
  status?: Array<'active' | 'inactive' | 'pending' | 'suspended'>;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'code' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export async function listSuppliers(filters: SupplierListFilters = {}): Promise<{ data: Supplier[]; total: number; page: number; limit: number; }>{
  const {
    search,
    status,
    page = 1,
    limit = 50,
    sortBy = 'name',
    sortOrder = 'asc'
  } = filters

  const offset = (page - 1) * limit

  const where: string[] = ['1=1']
  const params: any[] = []
  let i = 1

  if (search && search.trim().length > 0) {
    where.push(`(name ILIKE $${i})`)
    params.push(`%${search}%`)
    i++
  }

  if (status && status.length > 0) {
    where.push(`status = ANY($${i})`)
    params.push(status)
    i++
  }

  // Read from canonical public view which maps to core.supplier
  const sql = `
    SELECT *, COUNT(*) OVER() as __total
    FROM public.suppliers
    WHERE ${where.join(' AND ')}
    ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
    LIMIT $${i} OFFSET $${i + 1}
  `
  params.push(limit, offset)

  const res = await query(sql, params)
  const total = res.rows.length > 0 ? Number(res.rows[0].__total) : 0

  const data: Supplier[] = res.rows.map((r: any) => ({
    id: String(r.id),
    name: r.name,
    status: (r.status ?? (r.active ? 'active' : 'inactive')) as Supplier['status'],
    code: r.code ?? undefined,
    createdAt: new Date(r.created_at ?? r.createdAt ?? Date.now()).toISOString(),
    updatedAt: new Date(r.updated_at ?? r.updatedAt ?? Date.now()).toISOString(),
  }))

  return { data, total, page, limit }
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const res = await query(
    `SELECT *
     FROM public.suppliers
     WHERE id = $1
     LIMIT 1`,
    [id]
  )
  const row = res.rows[0]
  if (!row) return null
  return {
    id: String(row.id),
    name: row.name,
    status: (row.status ?? (row.active ? 'active' : 'inactive')) as Supplier['status'],
    code: row.code ?? undefined,
    createdAt: new Date(row.created_at ?? row.createdAt ?? Date.now()).toISOString(),
    updatedAt: new Date(row.updated_at ?? row.updatedAt ?? Date.now()).toISOString(),
  }
}

export interface UpsertSupplierInput {
  id?: string;
  name: string;
  code?: string;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  currency?: string;
  paymentTerms?: string;
  contact?: { email?: string; phone?: string; website?: string };
}

export async function upsertSupplier(input: UpsertSupplierInput): Promise<Supplier> {
  const { id, name, code, status = 'active', currency = 'ZAR', paymentTerms, contact } = input
  return withTransaction(async (client) => {
    if (id) {
      await client.query(
        `UPDATE core.supplier
         SET name = COALESCE($1, name),
             code = COALESCE($2, code),
             active = CASE WHEN $3 IS NULL THEN active ELSE ($3 = 'active') END,
             default_currency = COALESCE($4, default_currency),
             payment_terms = COALESCE($5, payment_terms),
             contact_info = COALESCE($6, contact_info),
             updated_at = NOW()
         WHERE supplier_id = $7`,
        [
          name,
          code ?? null,
          status,
          currency,
          paymentTerms ?? null,
          contact ? JSON.stringify(contact) : null,
          id,
        ]
      )
    } else {
      const ins = await client.query(
        `INSERT INTO core.supplier (name, code, active, default_currency, payment_terms, contact_info)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING supplier_id`,
        [
          name,
          code ?? null,
          status === 'active',
          currency,
          paymentTerms ?? null,
          contact ? JSON.stringify(contact) : null,
        ]
      )
      input.id = String(ins.rows[0].supplier_id)
    }

    const sup = await client.query(
      `SELECT supplier_id as id, name, code, active, created_at, updated_at
       FROM core.supplier
       WHERE supplier_id = $1`,
      [input.id]
    )
    const row = sup.rows[0]
    return {
      id: String(row.id),
      name: row.name,
      status: (row.active ? 'active' : 'inactive'),
      code: row.code ?? undefined,
      createdAt: new Date(row.created_at ?? Date.now()).toISOString(),
      updatedAt: new Date(row.updated_at ?? Date.now()).toISOString(),
    }
  })
}

export async function deactivateSupplier(id: string): Promise<void> {
  await query(`UPDATE core.supplier SET active = false, updated_at = NOW() WHERE supplier_id = $1`, [id])
}

export async function linkExternalRef(_id: string, _system: string, _value: string): Promise<void> {
  // TODO: Implement external refs mapping table if/when required.
}

