// @ts-nocheck

import { query, withTransaction } from '@/lib/database/unified-connection'
import type { InventoryItem } from '@/domain/inventory'

export async function getBySku(sku: string): Promise<InventoryItem | null> {
  const res = await query(
    `
      SELECT
        sp.supplier_sku AS sku,
        sp.supplier_id::text AS supplier_id,
        sp.supplier_product_id::text AS product_id,
        MAX(soh.location_id)::text AS location_id,
        COALESCE(SUM(soh.qty), 0) AS qty,
        MAX(sp.is_active) AS is_active,
        MAX(soh.updated_at) AS updated_at
      FROM core.supplier_product sp
      LEFT JOIN core.stock_on_hand soh
        ON soh.supplier_product_id = sp.supplier_product_id
      WHERE sp.supplier_sku = $1
      GROUP BY sp.supplier_sku, sp.supplier_id, sp.supplier_product_id
      LIMIT 1
    `,
    [sku]
  )
  const row = res.rows[0]
  if (!row) return null
  return {
    sku: row.sku,
    supplierId: row.supplier_id,
    productId: row.product_id,
    warehouseId: row.location_id ?? undefined,
    quantityOnHand: Number(row.qty ?? 0),
    quantityReserved: 0,
    backorderable: row.is_active !== false,
    updatedAt: new Date(row.updated_at ?? Date.now()).toISOString(),
  }
}

export async function listBySupplier(supplierId: string): Promise<InventoryItem[]> {
  const res = await query(
    `
      SELECT
        sp.supplier_sku AS sku,
        sp.supplier_id::text AS supplier_id,
        sp.supplier_product_id::text AS product_id,
        MAX(soh.location_id)::text AS location_id,
        COALESCE(SUM(soh.qty), 0) AS qty,
        MAX(sp.is_active) AS is_active,
        MAX(soh.updated_at) AS updated_at
      FROM core.supplier_product sp
      LEFT JOIN core.stock_on_hand soh
        ON soh.supplier_product_id = sp.supplier_product_id
      WHERE sp.supplier_id::text = $1
      GROUP BY sp.supplier_sku, sp.supplier_id, sp.supplier_product_id
    `,
    [supplierId]
  )
  return res.rows.map((row: unknown) => ({
    sku: row.sku,
    supplierId: row.supplier_id,
    productId: row.product_id,
    warehouseId: row.location_id ?? undefined,
    quantityOnHand: Number(row.qty ?? 0),
    quantityReserved: 0,
    backorderable: row.is_active !== false,
    updatedAt: new Date(row.updated_at ?? Date.now()).toISOString(),
  }))
}

export async function adjustStock(params: {
  supplierId: string;
  sku: string;
  delta: number;
  reason?: string;
}): Promise<void> {
  const { supplierId, sku, delta, reason } = params
  await withTransaction(async (client) => {
    // Resolve supplier_product_id from supplier + SKU
    const sp = await client.query(
      `SELECT sp.supplier_product_id
       FROM core.supplier_product sp
       WHERE sp.supplier_id = $1 AND sp.supplier_sku = $2
       LIMIT 1`,
      [supplierId, sku]
    )
    if (sp.rows.length === 0) {
      throw new Error('Supplier SKU not linked in core.supplier_product')
    }
    const supplierProductId = sp.rows[0].supplier_product_id

    // Upsert stock_on_hand at default location (if any). If none, create a supplier-linked location record lazily is out of scope.
    const soh = await client.query(
      `SELECT soh_id, qty, location_id FROM core.stock_on_hand WHERE supplier_product_id = $1 LIMIT 1`,
      [supplierProductId]
    )

    if (soh.rows.length === 0) {
      // Create a placeholder stock_on_hand record with qty 0 then apply delta
      await client.query(
        `INSERT INTO core.stock_on_hand (location_id, supplier_product_id, qty)
         SELECT sl.location_id, $1, 0
         FROM core.stock_location sl
         WHERE (sl.supplier_id = $2 OR sl.type = 'internal')
         ORDER BY CASE WHEN sl.supplier_id = $2 THEN 0 ELSE 1 END, sl.created_at ASC
         LIMIT 1`,
        [supplierProductId, supplierId]
      )
    }

    await client.query(
      `UPDATE core.stock_on_hand SET qty = GREATEST(0, qty + $1), updated_at = NOW()
       WHERE supplier_product_id = $2`,
      [delta, supplierProductId]
    )

    await client.query(
      `INSERT INTO core.stock_movement (supplier_product_id, movement_type, qty, reference_doc, notes)
       VALUES ($1, $2, $3, $4, $5)` ,
      [supplierProductId, delta >= 0 ? 'inbound' : 'outbound', Math.abs(delta), 'adjustment', reason ?? null]
    )
  })
}

export async function upsertSupplierProduct(params: {
  supplierId: string;
  sku: string;
  name?: string;
  uom?: string;
  categoryId?: string;
}): Promise<string> {
  const { supplierId, sku, name, uom = 'unit', categoryId } = params
  const res = await withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT supplier_product_id FROM core.supplier_product WHERE supplier_id = $1 AND supplier_sku = $2 LIMIT 1`,
      [supplierId, sku]
    )
    if (existing.rows.length > 0) {
      return String(existing.rows[0].supplier_product_id)
    }
    const ins = await client.query(
      `INSERT INTO core.supplier_product (
        supplier_id, supplier_sku, name_from_supplier, uom, category_id
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING supplier_product_id`,
      [supplierId, sku, name ?? sku, uom, categoryId ?? null]
    )
    return String(ins.rows[0].supplier_product_id)
  })
  return res
}

export async function setStock(params: {
  supplierId: string;
  sku: string;
  quantity: number;
  unitCost?: number;
  reason?: string;
}): Promise<void> {
  const { supplierId, sku, quantity, unitCost, reason } = params
  await withTransaction(async (client) => {
    // Ensure supplier_product exists
    const spId = await upsertSupplierProduct({ supplierId, sku })

    // Upsert stock_on_hand to an existing or default location
    const soh = await client.query(
      `SELECT soh_id, qty FROM core.stock_on_hand WHERE supplier_product_id = $1 LIMIT 1`,
      [spId]
    )
    if (soh.rows.length === 0) {
      // pick any internal or supplier location
      const loc = await client.query(
        `SELECT location_id FROM core.stock_location WHERE supplier_id = $1 OR type = 'internal' ORDER BY (supplier_id = $1) DESC, created_at ASC LIMIT 1`,
        [supplierId]
      )
      const locationId = loc.rows[0]?.location_id
      await client.query(
        `INSERT INTO core.stock_on_hand (location_id, supplier_product_id, qty, unit_cost)
         VALUES ($1, $2, $3, $4)`,
        [locationId ?? null, spId, quantity, unitCost ?? null]
      )
    } else {
      await client.query(
        `UPDATE core.stock_on_hand SET qty = $1, unit_cost = COALESCE($2, unit_cost), updated_at = NOW() WHERE supplier_product_id = $3`,
        [quantity, unitCost ?? null, spId]
      )
    }
    await client.query(
      `INSERT INTO core.stock_movement (supplier_product_id, movement_type, qty, reference_doc, notes)
       VALUES ($1, 'adjustment', $2, 'setStock', $3)` ,
      [spId, Math.abs(quantity), reason ?? null]
    )
  })
}

export async function reserveStock(_params: { supplierId: string; sku: string; quantity: number; }): Promise<void> {
  // TODO: Implement reservations as separate allocation table if needed.
}

export async function releaseStock(_params: { supplierId: string; sku: string; quantity: number; }): Promise<void> {
  // TODO: Implement reservations release.
}
