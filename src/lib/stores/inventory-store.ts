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

      // API returns { items: [...], nextCursor: ... } format
      const rows = data?.items || [];

      // Map API snake_case fields to component expectations
      const items = rows.map((r: any) => ({
        id: r.id,
        product_id: r.id,
        sku: r.sku || r.supplier_sku || '',
        name: r.name || r.sku || 'Unknown',
        category: r.category || 'uncategorized',
        current_stock: Number(r.stock_qty ?? r.currentStock ?? r.current_stock ?? 0),
        reserved_stock: Number(r.reserved_qty ?? r.reservedStock ?? r.reserved_stock ?? 0),
        available_stock: Number(r.available_qty ?? r.availableStock ?? r.available_stock ?? 0),
        cost_per_unit_zar: Number(r.cost_price ?? r.unit_cost ?? r.costPrice ?? r.cost_per_unit_zar ?? 0),
        total_value_zar: Number(r.cost_price ?? r.costPrice ?? 0) * Number(r.stock_qty ?? r.currentStock ?? 0),
        reorder_point: Number(r.reorder_point ?? 10),
        max_stock_level: Number(r.max_stock_level ?? 100),
        location: r.location || 'Main Warehouse',
        supplier_id: r.supplier_id ?? r.supplierId ?? null,
        supplier_name: r.supplier_name || 'Unknown Supplier',
        supplier_status: r.supplier_status || 'active',
        stock_status: r.stock_status || (Number(r.stock_qty ?? 0) <= 0 ? 'out_of_stock' : (Number(r.stock_qty ?? 0) <= 10 ? 'low_stock' : 'in_stock')),
        currency: 'ZAR',
        // Add product reference for compatibility
        product: {
          id: r.id,
          name: r.name || r.sku || 'Unknown',
          sku: r.sku || '',
          category: r.category || 'uncategorized',
          unit_of_measure: 'each',
          supplier_id: r.supplier_id ?? null,
          unit_cost_zar: Number(r.cost_price ?? r.costPrice ?? 0),
          status: 'active' as const
        },
        supplier: {
          id: r.supplier_id ?? 'unknown',
          name: r.supplier_name || 'Unknown Supplier',
          status: r.supplier_status || 'active'
        }
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
      if (!res.ok) throw new Error(`PRODUCTS_FETCH_FAILED: ${res.status}`);
      const data = await res.json();
      const productRows = Array.isArray(data) ? data : (data?.data || data?.items || []);

      // Map to consistent format
      const products = productRows.map((p: any) => ({
        id: p.id || p.product_id,
        supplier_id: p.supplier_id || p.supplierId,
        name: p.name || p.product_name || 'Unknown Product',
        description: p.description || '',
        category: p.category || 'uncategorized',
        sku: p.sku || p.supplier_sku || '',
        unit_of_measure: p.unit_of_measure || p.unit || 'each',
        unit_cost_zar: Number(p.unit_cost_zar ?? p.unit_cost ?? p.cost_price ?? 0),
        status: p.status || 'active'
      }));

      set({ products, loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to fetch products', loading: false });
    }
  },

  fetchSuppliers: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/suppliers?limit=5000');
      if (!res.ok) throw new Error(`SUPPLIERS_FETCH_FAILED: ${res.status}`);
      const data = await res.json();
      const supplierRows = Array.isArray(data) ? data : (data?.data || data?.items || []);

      // Map to consistent format
      const suppliers = supplierRows.map((s: any) => ({
        id: s.id || s.supplier_id,
        name: s.name || s.supplier_name || 'Unknown Supplier',
        email: s.email || null,
        phone: s.phone || null,
        address: s.address || null,
        status: s.status || 'active',
        performance_tier: s.performance_tier || 'unrated',
        preferred_supplier: s.preferred_supplier || false,
        contact_person: s.contact_person || null
      }));

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
