export type InventoryItem = {
  id: string;
  sku: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  costPrice: number | null;
  salePrice: number | null;
  supplierId: string | null;
  brandId?: string | null;
};

export type StockStatus = 'out_of_stock' | 'low_stock' | 'overstocked' | 'in_stock';

export function deriveStockStatus(current: number, reorder: number, max: number): StockStatus {
  if (current <= 0) return 'out_of_stock';
  if (reorder > 0 && current <= reorder) return 'low_stock';
  if (max > 0 && current > max) return 'overstocked';
  return 'in_stock';
}

export function assertCamelItem(i: any): asserts i is InventoryItem {
  if (
    typeof i !== 'object' || i === null ||
    typeof i.id !== 'string' ||
    typeof i.sku !== 'string' ||
    typeof i.currentStock !== 'number' ||
    typeof i.reservedStock !== 'number' ||
    typeof i.availableStock !== 'number'
  ) {
    throw new Error('INVENTORY_SHAPE_ERROR: expected camelCase InventoryItem');
  }
}

export async function fetchInventory(opts?: { signal?: AbortSignal }): Promise<InventoryItem[]> {
  const res = await fetch('/api/inventory', { signal: opts?.signal });
  if (!res.ok) throw new Error(`INVENTORY_FETCH_FAILED: ${res.status}`);
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error('INVENTORY_FETCH_FAILED: array expected');
  return data.map((row) => {
    assertCamelItem(row);
    return row;
  });
}

export function totalSkus(items: InventoryItem[]) {
  return items.length;
}
export function totalAvailable(items: InventoryItem[]) {
  return items.reduce((acc, it) => acc + it.availableStock, 0);
}
export function bySku(items: InventoryItem[]): Record<string, InventoryItem> {
  const map: Record<string, InventoryItem> = {};
  for (const it of items) map[it.sku] = it;
  return map;
}

// Phase 3 allocation helpers
export async function allocateToSupplier(itemId: string, supplierId: string, quantity: number, opts?: { orgId?: string; notes?: string; expiresAt?: string }) {
  const res = await fetch(`/api/suppliers/${supplierId}/inventory`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'allocate_to_supplier', inventoryItemId: itemId, quantity, orgId: opts?.orgId, notes: opts?.notes, expiresAt: opts?.expiresAt })
  });
  if (!res.ok) throw new Error(`ALLOCATE_FAILED: ${res.status}`);
  return res.json();
}

export async function deallocateFromSupplier(itemId: string, supplierId: string, quantity: number, opts?: { orgId?: string; notes?: string }) {
  const res = await fetch(`/api/suppliers/${supplierId}/inventory`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deallocate_from_supplier', inventoryItemId: itemId, quantity, orgId: opts?.orgId, notes: opts?.notes })
  });
  if (!res.ok) throw new Error(`DEALLOCATE_FAILED: ${res.status}`);
  return res.json();
}

// ---------------------------------------------
// Compatibility Zustand store (useInventoryStore)
// Provides the fields and actions expected by existing components.
// ---------------------------------------------
import { create } from 'zustand';

type Filters = { search?: string } & Record<string, any>;

type InventoryZustandState = {
  items: any[];
  products: any[];
  suppliers: any[];
  filters: Filters;
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  setFilters: (f: Partial<Filters>) => void;
  clearFilters: () => void;
  addProduct: (p: any) => Promise<void>;
  updateProduct: (id: string, p: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustInventory: (payload: { inventoryItemId: string; delta: number; reason: string }) => Promise<void>;
  clearError: () => void;
};

export const useInventoryStore = create<InventoryZustandState>((set, get) => ({
  items: [],
  products: [],
  suppliers: [],
  filters: { search: '' },
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/inventory?format=display&limit=25000');
      if (!res.ok) throw new Error(`INVENTORY_FETCH_FAILED: ${res.status}`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data?.data || []);
      // Ensure shape with sensible defaults
      const items = rows.map((r: any) => ({
        id: r.id,
        sku: r.sku,
        currentStock: Number(r.currentStock ?? 0),
        reservedStock: Number(r.reservedStock ?? 0),
        availableStock: Number(r.availableStock ?? (Number(r.currentStock ?? 0) - Number(r.reservedStock ?? 0))),
        costPrice: r.costPrice ?? null,
        salePrice: r.salePrice ?? null,
        supplierId: r.supplierId ?? null,
        brandId: r.brandId ?? null,
      }));
      set({ items, loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to fetch items', loading: false });
    }
  },

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/inventory/products');
      const data = await res.json();
      const products = Array.isArray(data) ? data : (data?.data || []);
      set({ products, loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to fetch products', loading: false });
    }
  },

  fetchSuppliers: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      const suppliers = Array.isArray(data) ? data : (data?.data || []);
      set({ suppliers, loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to fetch suppliers', loading: false });
    }
  },

  setFilters: (f: Partial<Filters>) => {
    set((state) => ({ filters: { ...state.filters, ...f } }));
    // Optionally refetch items when filters change
  },

  clearFilters: () => set({ filters: { search: '' } }),

  addProduct: async (p: any) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/inventory/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      if (!res.ok) throw new Error(`ADD_PRODUCT_FAILED: ${res.status}`);
      await get().fetchProducts();
      set({ loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to add product', loading: false });
    }
  },

  updateProduct: async (id: string, p: any) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/inventory/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      if (!res.ok) throw new Error(`UPDATE_PRODUCT_FAILED: ${res.status}`);
      await get().fetchProducts();
      set({ loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to update product', loading: false });
    }
  },

  deleteProduct: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/inventory/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`DELETE_PRODUCT_FAILED: ${res.status}`);
      await get().fetchProducts();
      set({ loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to delete product', loading: false });
    }
  },

  adjustInventory: async ({ inventoryItemId, delta, reason }) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/inventory/adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inventoryItemId, delta, reason }) });
      if (!res.ok) throw new Error(`ADJUST_INVENTORY_FAILED: ${res.status}`);
      await get().fetchItems();
      set({ loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to adjust inventory', loading: false });
    }
  },

  clearError: () => set({ error: null })
}));

export async function consignmentIn(itemId: string, supplierId: string, quantity: number, opts?: { orgId?: string; notes?: string }) {
  const res = await fetch(`/api/suppliers/${supplierId}/inventory`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'consignment_in', inventoryItemId: itemId, quantity, orgId: opts?.orgId, notes: opts?.notes })
  });
  if (!res.ok) throw new Error(`CONSIGNMENT_IN_FAILED: ${res.status}`);
  return res.json();
}

export async function consignmentOut(itemId: string, supplierId: string, quantity: number, opts?: { orgId?: string; notes?: string }) {
  const res = await fetch(`/api/suppliers/${supplierId}/inventory`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'consignment_out', inventoryItemId: itemId, quantity, orgId: opts?.orgId, notes: opts?.notes })
  });
  if (!res.ok) throw new Error(`CONSIGNMENT_OUT_FAILED: ${res.status}`);
  return res.json();
}
