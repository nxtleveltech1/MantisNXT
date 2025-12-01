// @ts-nocheck

import { keysToCamel, keysToSnake } from '@/lib/utils/case';

export type DbInventoryRow = {
  id: string;
  sku: string;
  stock_qty: number;
  reserved_qty: number;
  available_qty: number;
  cost_price: number | null;
  sale_price: number | null;
  rsp?: number | null;
  supplier_id: string | null;
  brand_id?: string | null;
};

export type InventoryItem = {
  id: string;
  sku: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  costPrice: number | null;
  salePrice: number | null;
  rsp?: number | null;
  supplierId: string | null;
  brandId?: string | null;
};

export function toDisplay(row: DbInventoryRow): InventoryItem {
  const c = keysToCamel(row) as unknown;
  return {
    id: c.id,
    sku: c.sku,
    currentStock: c.stockQty,
    reservedStock: c.reservedQty,
    availableStock: c.availableQty,
    costPrice: c.costPrice ?? null,
    salePrice: c.salePrice ?? null,
    rsp: c.rsp ?? null,
    supplierId: c.supplierId ?? null,
    brandId: c.brandId ?? null,
  };
}

export function toRaw(row: DbInventoryRow): Record<string, unknown> {
  return keysToSnake(row);
}
