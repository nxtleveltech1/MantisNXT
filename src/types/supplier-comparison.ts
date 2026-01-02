/**
 * Types for Multi-Supplier SKU Comparison Feature
 *
 * Supports comparing the same SKU across multiple suppliers
 * with different prices, stock levels, and terms.
 */

import { z } from 'zod';

// ============================================================================
// SUPPLIER OFFER TYPES
// ============================================================================

/**
 * A single supplier's offering for a specific SKU
 */
export interface SupplierOffer {
  supplier_product_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code?: string;
  supplier_tier?: 'strategic' | 'preferred' | 'approved' | 'conditional';

  // Product identification
  supplier_sku: string;
  name_from_supplier: string;
  brand?: string;
  barcode?: string;
  uom?: string;
  pack_size?: string;

  // Pricing
  current_price: number | null;
  currency: string;
  base_discount?: number;
  cost_after_discount?: number;

  // Availability
  stock_on_hand: number | null;
  lead_time_days?: number;
  minimum_order_qty?: number;

  // Timestamps
  first_seen_at: Date;
  last_seen_at: Date | null;

  // Flags
  is_best_price?: boolean;
  is_preferred_supplier?: boolean;
  is_in_stock?: boolean;
}

/**
 * Grouped comparison result for a single SKU
 */
export interface SKUComparison {
  sku: string;
  product_name: string;
  brand?: string;
  category_name?: string;

  // All supplier offerings for this SKU
  offers: SupplierOffer[];

  // Summary stats
  lowest_price: number | null;
  highest_price: number | null;
  price_range_percent: number | null;
  total_suppliers: number;
  suppliers_in_stock: number;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request params for compare-suppliers API
 */
export interface CompareSupplierRequest {
  query: string; // SKU or product name search
  include_out_of_stock?: boolean;
  min_price?: number;
  max_price?: number;
  supplier_ids?: string[];
  sort_by?: 'price' | 'supplier_name' | 'lead_time' | 'stock';
  sort_dir?: 'asc' | 'desc';
  limit?: number;
}

export const CompareSupplierRequestSchema = z.object({
  query: z.string().min(1).max(200),
  include_out_of_stock: z.boolean().optional().default(true),
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
  supplier_ids: z.array(z.string().uuid()).optional(),
  sort_by: z.enum(['price', 'supplier_name', 'lead_time', 'stock']).optional().default('price'),
  sort_dir: z.enum(['asc', 'desc']).optional().default('asc'),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

/**
 * Response from compare-suppliers API
 */
export interface CompareSupplierResponse {
  success: boolean;
  data: {
    query: string;
    comparisons: SKUComparison[];
    total_offers: number;
    total_skus: number;
  };
  error?: string;
}

// ============================================================================
// PURCHASE FLOW TYPES
// ============================================================================

/**
 * Selected supplier offer for purchase
 */
export interface SelectedSupplierOffer {
  supplier_product_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
  discount?: number;
  total_price: number;
}

/**
 * Grouped purchase items by supplier (for multi-PO generation)
 */
export interface SupplierPurchaseGroup {
  supplier_id: string;
  supplier_name: string;
  items: SelectedSupplierOffer[];
  subtotal: number;
  currency: string;
}

/**
 * Multi-supplier purchase cart
 */
export interface MultiSupplierCart {
  items: SelectedSupplierOffer[];
  groups: SupplierPurchaseGroup[];
  total_items: number;
  total_value: number;
  supplier_count: number;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Sort configuration for comparison panel
 */
export interface ComparisonSortConfig {
  field: 'price' | 'supplier_name' | 'lead_time' | 'stock' | 'discount';
  direction: 'asc' | 'desc';
}

/**
 * Filter configuration for comparison panel
 */
export interface ComparisonFilterConfig {
  in_stock_only: boolean;
  supplier_tiers?: ('strategic' | 'preferred' | 'approved' | 'conditional')[];
  min_price?: number;
  max_price?: number;
  selected_suppliers?: string[];
}

/**
 * Comparison panel state
 */
export interface ComparisonPanelState {
  sku: string;
  offers: SupplierOffer[];
  loading: boolean;
  error: string | null;
  sort: ComparisonSortConfig;
  filters: ComparisonFilterConfig;
  selected_offer_id: string | null;
}

