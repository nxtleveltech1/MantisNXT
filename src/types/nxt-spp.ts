/**
 * Type definitions for NXT-SPP-Supplier Inventory Portfolio System
 *
 * Architecture:
 * - SPP (Staging): Price list uploads and validation
 * - CORE (Canonical): Normalized master data
 * - SERVE (Views): Read-optimized reporting layer
 */

import { z } from 'zod';

// ============================================================================
// SPP SCHEMA - Staging / Isolation Layer
// ============================================================================

/**
 * Pricelist Upload metadata
 */
export interface PricelistUpload {
  upload_id: string;
  supplier_id: string;
  received_at: Date;
  filename: string;
  currency: string;
  valid_from: Date;
  valid_to: Date | null;
  row_count: number;
  status: 'received' | 'validating' | 'validated' | 'merged' | 'failed' | 'rejected';
  errors_json: Record<string, unknown> | null;
  processed_by?: string;
  processed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export const PricelistUploadSchema = z.object({
  upload_id: z.string().uuid().optional(),
  supplier_id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  currency: z.string().length(3),
  valid_from: z.date().or(z.string().transform(str => new Date(str))),
  valid_to: z
    .date()
    .or(z.string().transform(str => new Date(str)))
    .nullable()
    .optional(),
  status: z
    .enum(['received', 'validating', 'validated', 'merged', 'failed', 'rejected'])
    .optional(),
  errors_json: z.record(z.string(), z.any()).nullable().optional(),
  processed_by: z.string().optional(),
});

/**
 * Individual pricelist row from uploaded file
 */
export interface PricelistRow {
  upload_id: string;
  row_num: number;
  supplier_sku: string;
  name: string;
  brand?: string;
  uom: string;
  pack_size?: string;
  price: number;
  currency: string;
  category_raw?: string;
  vat_code?: string;
  barcode?: string;
  attrs_json?: Record<string, unknown>;
  validation_errors?: string[];
}

export const PricelistRowSchema = z.object({
  upload_id: z.string().uuid(),
  row_num: z.number().int().positive(),
  supplier_sku: z.string().min(1).max(100),
  name: z.string().min(1).max(500),
  brand: z.string().max(100).optional(),
  uom: z.string().min(1).max(50),
  pack_size: z.string().max(50).optional(),
  price: z.number().positive(),
  currency: z.string().length(3),
  category_raw: z.string().max(200).optional(),
  vat_code: z.string().max(20).optional(),
  barcode: z.string().max(50).optional(),
  attrs_json: z.record(z.string(), z.any()).optional(),
});

// ============================================================================
// CORE SCHEMA - Canonical Master Data
// ============================================================================

/**
 * Supplier master record
 */
export interface Supplier {
  supplier_id: string;
  name: string;
  code?: string;
  active: boolean;
  default_currency: string;
  payment_terms?: string;
  contact_info?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  tax_number?: string;
  created_at: Date;
  updated_at: Date;
}

export const SupplierSchema = z.object({
  supplier_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  code: z.string().max(50).optional(),
  active: z.boolean().default(true),
  default_currency: z.string().length(3),
  payment_terms: z.string().max(100).optional(),
  contact_info: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
  tax_number: z.string().max(50).optional(),
});

/**
 * Internal product master catalog
 */
export interface Product {
  product_id: string;
  name: string;
  brand_id?: string;
  uom: string;
  pack_size?: string;
  barcode?: string;
  category_id?: string;
  attrs_json?: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const ProductSchema = z.object({
  product_id: z.string().uuid().optional(),
  name: z.string().min(1).max(500),
  brand_id: z.string().uuid().optional(),
  uom: z.string().min(1).max(50),
  pack_size: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  category_id: z.string().uuid().optional(),
  attrs_json: z.record(z.string(), z.any()).optional(),
  is_active: z.boolean().default(true),
});

/**
 * Category taxonomy
 */
export interface Category {
  category_id: string;
  name: string;
  parent_id?: string;
  level: number;
  path: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const CategorySchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  parent_id: z.string().uuid().nullable().optional(),
  level: z.number().int().min(0).default(0),
  path: z.string().max(500),
  is_active: z.boolean().default(true),
});

/**
 * Supplier product mapping
 */
export interface SupplierProduct {
  supplier_product_id: string;
  supplier_id: string;
  supplier_sku: string;
  product_id?: string;
  name_from_supplier: string;
  uom: string;
  pack_size?: string;
  barcode?: string;
  first_seen_at: Date;
  last_seen_at?: Date;
  is_active: boolean;
  is_new: boolean;
  category_id?: string;
  attrs_json?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export const SupplierProductSchema = z.object({
  supplier_product_id: z.string().uuid().optional(),
  supplier_id: z.string().uuid(),
  supplier_sku: z.string().min(1).max(100),
  product_id: z.string().uuid().nullable().optional(),
  name_from_supplier: z.string().min(1).max(500),
  uom: z.string().min(1).max(50),
  pack_size: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  is_active: z.boolean().default(true),
  is_new: z.boolean().default(true),
  category_id: z.string().uuid().nullable().optional(),
  attrs_json: z.record(z.string(), z.any()).optional(),
});

/**
 * Price history with SCD Type 2
 */
export interface PriceHistory {
  price_history_id: string;
  supplier_product_id: string;
  price: number;
  currency: string;
  valid_from: Date;
  valid_to?: Date;
  is_current: boolean;
  change_reason?: string;
  created_at: Date;
}

export const PriceHistorySchema = z.object({
  price_history_id: z.string().uuid().optional(),
  supplier_product_id: z.string().uuid(),
  price: z.number().positive(),
  currency: z.string().length(3),
  valid_from: z.date().or(z.string().transform(str => new Date(str))),
  valid_to: z
    .date()
    .or(z.string().transform(str => new Date(str)))
    .nullable()
    .optional(),
  is_current: z.boolean().default(true),
  change_reason: z.string().max(500).optional(),
});

/**
 * Inventory selection (ISI) - what we chose to stock
 *
 * **Business Rule**: Only ONE selection can have status='active' at a time.
 * This ensures NXT SOH always reflects a single, consistent catalog.
 * Activating a new selection must either:
 * 1. Fail if another selection is active (strict enforcement)
 * 2. Auto-archive the current active selection (deactivate_others flag)
 */
export interface InventorySelection {
  selection_id: string;
  selection_name: string;
  description?: string;
  created_by: string;
  created_at: Date;
  status: 'draft' | 'active' | 'archived';
  valid_from?: Date;
  valid_to?: Date;
  updated_at: Date;
}

export const InventorySelectionSchema = z.object({
  selection_id: z.string().uuid().optional(),
  selection_name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  created_by: z.string().uuid(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  valid_from: z
    .date()
    .or(z.string().transform(str => new Date(str)))
    .optional(),
  valid_to: z
    .date()
    .or(z.string().transform(str => new Date(str)))
    .nullable()
    .optional(),
});

/**
 * Selected items within a selection
 */
export interface InventorySelectedItem {
  selection_item_id: string;
  selection_id: string;
  supplier_product_id: string;
  status: 'selected' | 'deselected' | 'pending_approval';
  notes?: string;
  selected_at: Date;
  selected_by: string;
  quantity_min?: number;
  quantity_max?: number;
  reorder_point?: number;
  updated_at: Date;
}

export const InventorySelectedItemSchema = z.object({
  selection_item_id: z.string().uuid().optional(),
  selection_id: z.string().uuid(),
  supplier_product_id: z.string().uuid(),
  status: z.enum(['selected', 'deselected', 'pending_approval']).default('selected'),
  notes: z.string().max(1000).optional(),
  selected_by: z.string().uuid(),
  quantity_min: z.number().int().min(0).optional(),
  quantity_max: z.number().int().min(0).optional(),
  reorder_point: z.number().int().min(0).optional(),
});

/**
 * Stock location
 */
export interface StockLocation {
  location_id: string;
  name: string;
  type: 'internal' | 'supplier' | 'consignment';
  supplier_id?: string;
  address?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const StockLocationSchema = z.object({
  location_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  type: z.enum(['internal', 'supplier', 'consignment']),
  supplier_id: z.string().uuid().nullable().optional(),
  address: z.string().max(500).optional(),
  is_active: z.boolean().default(true),
});

/**
 * Stock on hand snapshot
 */
export interface StockOnHand {
  soh_id: string;
  location_id: string;
  supplier_product_id: string;
  qty: number;
  unit_cost?: number;
  total_value?: number;
  as_of_ts: Date;
  source: 'manual' | 'import' | 'system';
  created_at: Date;
}

export const StockOnHandSchema = z.object({
  soh_id: z.string().uuid().optional(),
  location_id: z.string().uuid(),
  supplier_product_id: z.string().uuid(),
  qty: z.number().min(0),
  unit_cost: z.number().positive().optional(),
  total_value: z.number().min(0).optional(),
  as_of_ts: z.date().or(z.string().transform(str => new Date(str))),
  source: z.enum(['manual', 'import', 'system']).default('system'),
});

// ============================================================================
// SERVE SCHEMA - View Types (Read-Optimized)
// ============================================================================

/**
 * Product table by supplier view
 */
export interface ProductTableBySupplier {
  supplier_id: string;
  supplier_name: string;
  supplier_product_id: string;
  supplier_sku: string;
  name_from_supplier: string;
  brand?: string;
  uom: string;
  pack_size?: string;
  category_name?: string;
  current_price: number;
  previous_price?: number;
  price_change_pct?: number;
  currency: string;
  is_new: boolean;
  is_mapped: boolean;
  is_selected: boolean;
  first_seen_at: Date;
  last_seen_at?: Date;
  internal_product_id?: string;
  internal_product_name?: string;
}

/**
 * Selected catalog view
 */
export interface SelectedCatalog {
  selection_id: string;
  selection_name: string;
  supplier_product_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_sku: string;
  product_name: string;
  current_price: number;
  currency: string;
  category_name?: string;
  is_in_stock: boolean;
  qty_on_hand?: number;
  selected_at: Date;
}

/**
 * Stock on hand by supplier view
 */
export interface SohBySupplier {
  supplier_id: string;
  supplier_name: string;
  supplier_product_id: string;
  supplier_sku: string;
  product_name: string;
  location_id: string;
  location_name: string;
  qty_on_hand: number;
  unit_cost: number;
  total_value: number;
  currency: string;
  as_of_ts: Date;
  is_selected: boolean;
}

/**
 * Stock on hand rolled up view
 */
export interface SohRolledUp {
  product_id: string;
  product_name: string;
  category_name?: string;
  total_qty: number;
  supplier_count: number;
  total_value: number;
  weighted_avg_cost: number;
  suppliers: Array<{
    supplier_id: string;
    supplier_name: string;
    qty: number;
    value: number;
  }>;
  as_of_ts: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Pricelist upload request
 */
export interface PricelistUploadRequest {
  supplier_id: string;
  file: File | Buffer;
  filename: string;
  currency?: string;
  valid_from?: Date;
  valid_to?: Date;
  options?: {
    auto_validate?: boolean;
    auto_merge?: boolean;
    skip_duplicates?: boolean;
  };
}

export const PricelistUploadRequestSchema = z.object({
  supplier_id: z.string().uuid(),
  filename: z.string().min(1),
  currency: z.string().length(3).optional(),
  valid_from: z
    .date()
    .or(z.string().transform(str => new Date(str)))
    .optional(),
  valid_to: z
    .date()
    .or(z.string().transform(str => new Date(str)))
    .optional(),
  options: z
    .object({
      auto_validate: z.boolean().optional(),
      auto_merge: z.boolean().optional(),
      skip_duplicates: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Pricelist validation result
 */
export interface PricelistValidationResult {
  upload_id: string;
  status: 'valid' | 'invalid' | 'warning';
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  warnings: Array<{
    row_num: number;
    type: string;
    message: string;
  }>;
  errors: Array<{
    row_num: number;
    field: string;
    message: string;
  }>;
  summary: {
    new_products: number;
    updated_prices: number;
    discontinued_products: number;
    unmapped_categories: number;
  };
}

/**
 * Selection workflow request
 */
export interface SelectionWorkflowRequest {
  selection_id?: string;
  selection_name?: string;
  supplier_product_ids: string[];
  action: 'select' | 'deselect' | 'approve';
  notes?: string;
  selected_by: string;
}

export const SelectionWorkflowRequestSchema = z.object({
  selection_id: z.string().uuid().optional(),
  selection_name: z.string().min(1).max(200).optional(),
  supplier_product_ids: z.array(z.string().uuid()).min(1),
  action: z.enum(['select', 'deselect', 'approve']),
  notes: z.string().max(1000).optional(),
  selected_by: z.string().uuid(),
});

/**
 * SOH report request
 */
export interface SohReportRequest {
  supplier_ids?: string[];
  location_ids?: string[];
  product_ids?: string[];
  as_of_date?: Date;
  group_by?: 'supplier' | 'product' | 'location';
  include_zero_stock?: boolean;
  selected_only?: boolean;
}

export const SohReportRequestSchema = z.object({
  supplier_ids: z.array(z.string().uuid()).optional(),
  location_ids: z.array(z.string().uuid()).optional(),
  product_ids: z.array(z.string().uuid()).optional(),
  as_of_date: z
    .date()
    .or(z.string().transform(str => new Date(str)))
    .optional(),
  group_by: z.enum(['supplier', 'product', 'location']).optional(),
  include_zero_stock: z.boolean().default(false),
  selected_only: z.boolean().default(false),
});

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type MergeResult = {
  success: boolean;
  upload_id: string;
  products_created: number;
  products_updated: number;
  prices_updated: number;
  errors: string[];
  duration_ms: number;
};

export type ValidationError = {
  row_num: number;
  field: string;
  value: unknown;
  message: string;
  severity: 'error' | 'warning';
};

export type BulkOperationResult<T> = {
  success: boolean;
  processed: number;
  failed: number;
  results: T[];
  errors: Array<{
    item: unknown;
    error: string;
  }>;
};

/**
 * NXT SOH (Stock on Hand) - Authoritative view of selected items only
 *
 * This is the single source of truth for operational stock queries.
 * ONLY includes items in the active selection.
 * If no active selection exists, this view returns empty results.
 */
export interface NxtSoh {
  supplier_id: string;
  supplier_name: string;
  supplier_product_id: string;
  supplier_sku: string;
  product_name: string;
  location_id: string;
  location_name: string;
  qty_on_hand: number;
  unit_cost: number;
  total_value: number;
  currency: string;
  as_of_ts: Date;
  selection_id: string;
  selection_name: string;
}

export const _NxtSohSchema = z.object({
  supplier_id: z.string().uuid(),
  supplier_name: z.string(),
  supplier_product_id: z.string().uuid(),
  supplier_sku: z.string(),
  product_name: z.string(),
  location_id: z.string().uuid(),
  location_name: z.string(),
  qty_on_hand: z.number().min(0),
  unit_cost: z.number().min(0),
  total_value: z.number().min(0),
  currency: z.string().length(3),
  as_of_ts: z.date().or(z.string().transform(str => new Date(str))),
  selection_id: z.string().uuid(),
  selection_name: z.string(),
});

/**
 * Merge procedure result from spp.merge_pricelist stored procedure
 */
export interface MergeProcedureResult {
  success: boolean;
  products_created: number;
  products_updated: number;
  prices_updated: number;
  errors: string[];
}

export const MergeProcedureResultSchema = z.object({
  success: z.boolean(),
  products_created: z.number().int().min(0),
  products_updated: z.number().int().min(0),
  prices_updated: z.number().int().min(0),
  errors: z.array(z.string()),
});

/**
 * Dashboard metrics for SPP system
 */
export interface DashboardMetrics {
  total_suppliers: number;
  total_products: number;
  selected_products: number;
  selected_inventory_value: number;
  new_products_count: number;
  recent_price_changes_count: number;
}

export const DashboardMetricsSchema = z.object({
  total_suppliers: z.number().int().min(0),
  total_products: z.number().int().min(0),
  selected_products: z.number().int().min(0),
  selected_inventory_value: z.number().min(0),
  new_products_count: z.number().int().min(0),
  recent_price_changes_count: z.number().int().min(0),
});
