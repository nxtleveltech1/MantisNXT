// Canonical Inventory domain model (SSOT)
export type Sku = string;
export type SupplierId = string;

export interface InventoryItem {
  sku: Sku;
  supplierId: SupplierId;
  productId?: string;
  warehouseId?: string;
  quantityOnHand: number;
  quantityReserved: number;
  backorderable: boolean;
  updatedAt: string;
}
