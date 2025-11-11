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

export function assertCamelItem(i: unknown): asserts i is InventoryItem {
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

type Filters = { search?: string } & Record<string, unknown>;

type InventoryZustandState = {
  items: unknown[];
  products: unknown[];
  suppliers: unknown[];
  filters: Filters;
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  setFilters: (f: Partial<Filters>) => void;
  clearFilters: () => void;
  addProduct: (p: unknown) => Promise<void>;
  updateProduct: (id: string, p: unknown) => Promise<void>;
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
      const payload = await res.json();

      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data?.items)
              ? payload.data.items
              : [];

      // Map API fields (camelCase or snake_case) to component expectations
      const items = rows.map((r: unknown) => {
        const supplierId = r.supplier_id ?? r.supplierId ?? r.supplier_uuid ?? r.supplier?.id ?? null;
        const supplierProductId =
          r.supplier_product_id ?? r.supplierProductId ?? r.product?.id ?? r.inventory_item_id ?? null;
        const productId =
          r.product_id ?? r.productId ?? supplierProductId ?? r.product?.id ?? null;
        const sku = r.sku ?? r.supplier_sku ?? r.product?.sku ?? '';
        const categoryRaw =
          r.category_name ?? r.categoryName ?? r.category ?? r.category_id ?? r.categoryId ?? r.product?.category ?? 'uncategorized';
        const category =
          typeof categoryRaw === 'string' ? categoryRaw : String(categoryRaw ?? 'uncategorized');
        const currentStock = Number(
          r.current_stock ?? r.currentStock ?? r.stock_qty ?? r.qty ?? 0
        );
        const reservedStock = Number(
          r.reserved_stock ?? r.reservedStock ?? r.reserved_qty ?? 0
        );
        const availableStock = Number(
          r.available_stock ?? r.availableStock ?? r.available_qty ?? currentStock - reservedStock
        );
        const unitCost = Number(
          r.cost_per_unit_zar ?? r.costPerUnitZar ?? r.unit_cost_zar ?? r.unit_cost ?? r.cost_price ?? 0
        );
        const totalValue = Number(r.total_value_zar ?? unitCost * currentStock);
        const stockStatus =
          r.stock_status ?? r.stockStatus ?? (currentStock <= 0
            ? 'out_of_stock'
            : currentStock <= 10
              ? 'low_stock'
              : 'in_stock');
        const location = r.location ?? r.location_name ?? 'Main Warehouse';
        const currency = r.currency ?? r.currency_code ?? 'ZAR';
        const reorderPoint = Number(r.reorder_point ?? r.reorderPoint ?? 10);
        const maxStockLevel = Number(r.max_stock_level ?? r.maxStockLevel ?? 100);
        const supplierName = r.supplier_name ?? r.supplierName ?? r.supplier?.name ?? 'Unknown Supplier';
        const supplierStatus = r.supplier_status ?? r.supplierStatus ?? r.supplier?.status ?? 'active';

        return {
          id: r.id ?? r.soh_id ?? productId ?? sku,
          product_id: productId,
          supplier_product_id: supplierProductId,
          sku,
          name: r.name ?? r.product?.name ?? (sku || 'Unknown'),
          category,
          current_stock: currentStock,
          reserved_stock: reservedStock,
          available_stock: availableStock,
          cost_per_unit_zar: unitCost,
          total_value_zar: totalValue,
          reorder_point: reorderPoint,
          max_stock_level: maxStockLevel,
          location,
          supplier_id: supplierId,
          supplier_name: supplierName,
          supplier_status: supplierStatus,
          stock_status: stockStatus,
          currency,
          // Add product reference for compatibility
          product: {
            id: productId,
            supplier_product_id: supplierProductId,
            name: r.product?.name ?? r.name ?? (sku || 'Unknown'),
            sku,
            category,
            unit_of_measure: r.unit_of_measure ?? r.unit ?? r.uom ?? 'each',
            supplier_id: supplierId,
            unit_cost_zar: unitCost,
            status: r.product?.status ?? (stockStatus === 'out_of_stock' ? 'inactive' : 'active')
          },
          supplier: {
            id: supplierId ?? 'unknown',
            name: supplierName,
            status: supplierStatus,
            preferred_supplier: r.supplier?.preferred_supplier ?? false
          }
        };
      });

      set({ items, loading: false });
    } catch (e: unknown) {
      set({ error: e?.message || 'Failed to fetch items', loading: false });
    }
  },

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      // Use /api/inventory instead of deprecated /api/inventory/products
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error(`PRODUCTS_FETCH_FAILED: ${res.status}`);
      const payload = await res.json();
      const productRows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.items)
            ? payload.items
            : [];

      // Map to consistent format
      const products = productRows.map((p: unknown) => {
        const supplierId = p.supplier_id ?? p.supplierId ?? p.supplier_uuid ?? p.supplier?.id ?? null;
        const unitCost = Number(
          p.unit_cost_zar ?? p.unit_cost ?? p.cost_price ?? p.price ?? p.salePrice ?? 0
        );
        const categoryRaw = p.category_name ?? p.category ?? 'uncategorized';
        return {
          id: p.id || p.product_id || p.supplier_product_id,
          supplier_id: supplierId,
          name: p.name || p.product_name || 'Unknown Product',
          description: p.description || '',
          category: typeof categoryRaw === 'string' ? categoryRaw : 'uncategorized',
          sku: p.sku || p.supplier_sku || '',
          unit_of_measure: p.unit_of_measure || p.unit || p.uom || 'each',
          unit_cost_zar: unitCost,
          status: p.status || 'active'
        };
      });

      set({ products, loading: false });
    } catch (e: unknown) {
      set({ error: e?.message || 'Failed to fetch products', loading: false });
    }
  },

  fetchSuppliers: async () => {
    set({ loading: true, error: null });
    try {
      // Use v3 API with correct limit (max 1000) and handle pagination if needed
      const res = await fetch('/api/suppliers?limit=1000');
      if (!res.ok) throw new Error(`SUPPLIERS_FETCH_FAILED: ${res.status}`);
      const data = await res.json();
      // Handle v3 API response format with pagination
      const supplierRows = Array.isArray(data?.data) 
        ? data.data 
        : Array.isArray(data) 
        ? data 
        : (data?.data || data?.items || []);

      // Map to consistent format
      const suppliers = supplierRows.map((s: unknown) => ({
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
    } catch (e: unknown) {
      set({ error: e?.message || 'Failed to fetch suppliers', loading: false });
    }
  },

  setFilters: (f: Partial<Filters>) => {
    set((state) => ({ filters: { ...state.filters, ...f } }));
    // Optionally refetch items when filters change
  },

  clearFilters: () => set({ filters: { search: '' } }),

  addProduct: async (p: unknown) => {
    set({ loading: true, error: null });
    try {
      // Use /api/inventory instead of deprecated /api/inventory/products
      const res = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      if (!res.ok) throw new Error(`ADD_PRODUCT_FAILED: ${res.status}`);
      await get().fetchProducts();
      set({ loading: false });
    } catch (e: unknown) {
      set({ error: e?.message || 'Failed to add product', loading: false });
    }
  },

  updateProduct: async (id: string, p: unknown) => {
    set({ loading: true, error: null });
    try {
      // Use /api/inventory/[id] instead of deprecated /api/inventory/products/[id]
      const res = await fetch(`/api/inventory/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      if (!res.ok) throw new Error(`UPDATE_PRODUCT_FAILED: ${res.status}`);
      await get().fetchProducts();
      set({ loading: false });
    } catch (e: unknown) {
      set({ error: e?.message || 'Failed to update product', loading: false });
    }
  },

  deleteProduct: async (id: string) => {
    set({ loading: true, error: null });
    try {
      // Use /api/inventory/[id] instead of deprecated /api/inventory/products/[id]
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`DELETE_PRODUCT_FAILED: ${res.status}`);
      await get().fetchProducts();
      set({ loading: false });
    } catch (e: unknown) {
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
    } catch (e: unknown) {
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
