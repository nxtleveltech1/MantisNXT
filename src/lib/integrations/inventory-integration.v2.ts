import { query } from '@/lib/database/unified-connection';

export type UpsertInventoryInput = {
  sku: string;
  stock_qty?: number;
  reserved_qty?: number;
  cost_price?: number | null;
  sale_price?: number | null;
  supplier_id?: string | null;
  brand_id?: string | null;
};

export async function getInventoryBySku(sku: string) {
  const q = `
    SELECT id, sku, stock_qty, reserved_qty, available_qty, cost_price, sale_price, supplier_id, brand_id
    FROM inventory_item
    WHERE sku = $1
    LIMIT 1
  `;
  const { rows } = await query(q, [sku]);
  return rows[0] ?? null;
}

export async function upsertInventoryItem(input: UpsertInventoryInput) {
  const q = `
    INSERT INTO inventory_item (sku, stock_qty, reserved_qty, cost_price, sale_price, supplier_id, brand_id)
    VALUES ($1, COALESCE($2,0), COALESCE($3,0), $4, $5, $6, $7)
    ON CONFLICT (sku) DO UPDATE SET
      stock_qty = EXCLUDED.stock_qty,
      reserved_qty = EXCLUDED.reserved_qty,
      cost_price = EXCLUDED.cost_price,
      sale_price = EXCLUDED.sale_price,
      supplier_id = EXCLUDED.supplier_id,
      brand_id = EXCLUDED.brand_id
    RETURNING id
  `;
  const { rows } = await query(q, [
    input.sku,
    input.stock_qty ?? 0,
    input.reserved_qty ?? 0,
    input.cost_price ?? null,
    input.sale_price ?? null,
    input.supplier_id ?? null,
    input.brand_id ?? null,
  ]);
  return rows[0];
}

export function deprecated(message: string): never {
  throw new Error(`INTEGRATION_DEPRECATED: ${message}`);
}
