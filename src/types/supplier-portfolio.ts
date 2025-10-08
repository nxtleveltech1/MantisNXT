/**
 * NXT-SPP-Supplier Inventory Portfolio Types
 * Complete type definitions for the supplier product and inventory selection system
 */

// Core SPP Types (Supplier Portfolio Platform)
export interface SPPPricelistUpload {
  upload_id: string
  supplier_id: string
  received_at: Date
  filename: string
  currency: string
  valid_from: Date
  valid_to: Date | null
  row_count: number
  status: 'received' | 'validated' | 'merged' | 'served' | 'error'
  errors_json: ValidationError[] | null
  created_by: string
  created_at: Date
}

export interface SPPPricelistRow {
  upload_id: string
  row_num: number
  supplier_sku: string
  name: string
  brand: string | null
  uom: string | null
  pack_size: string | null
  price: number
  currency: string
  category_raw: string | null
  vat_code: string | null
  barcode: string | null
  attrs_json: Record<string, any> | null
}

// Core Domain Types
export interface SupplierProduct {
  supplier_product_id: string
  supplier_id: string
  supplier_sku: string
  product_id: string | null
  name_from_supplier: string
  uom: string
  pack_size: string | null
  barcode: string | null
  first_seen_at: Date
  last_seen_at: Date | null
  is_active: boolean
  is_new: boolean
  category_id: string | null
  category_name: string | null
  brand: string | null

  // Computed fields from joins
  supplier_name?: string
  supplier_code?: string
  current_price?: number
  previous_price?: number
  price_change_percent?: number
  currency?: string
  stock_quantity?: number
  is_mapped?: boolean
  validation_status?: 'valid' | 'unmapped' | 'needs_review'
}

export interface PriceHistory {
  price_history_id: string
  supplier_product_id: string
  price: number
  currency: string
  valid_from: Date
  valid_to: Date | null
  is_current: boolean
}

export interface CurrentPrice {
  supplier_product_id: string
  price: number
  currency: string
  valid_from: Date
  previous_price: number | null
  price_change_percent: number | null
  change_date: Date | null
}

// Inventory Selection Interface (ISI) Types
export interface InventorySelection {
  selection_id: string
  selection_name: string
  created_by: string
  created_at: Date
  status: 'draft' | 'active' | 'archived'
  notes: string | null
  supplier_id: string | null
  effective_from: Date | null
  effective_to: Date | null
}

export interface InventorySelectedItem {
  selection_item_id: string
  selection_id: string
  supplier_product_id: string
  status: 'selected' | 'deselected'
  notes: string | null
  selected_at: Date
  selected_by: string

  // Joined data
  supplier_product?: SupplierProduct
  current_price?: number
  category_name?: string
}

// Stock on Hand Types
export interface StockLocation {
  location_id: string
  name: string
  supplier_id: string | null
  type: 'internal' | 'supplier'
  is_active: boolean
}

export interface StockOnHand {
  soh_id: string
  location_id: string
  supplier_product_id: string
  qty: number
  as_of_ts: Date

  // Joined data
  location_name?: string
  supplier_name?: string
  product_name?: string
  sku?: string
  current_price?: number
  inventory_value?: number
}

// View Types for Serving Layer
export interface ProductTableBySupplier extends SupplierProduct {
  current_price: number
  previous_price: number | null
  price_change_percent: number | null
  price_change_direction: 'up' | 'down' | 'stable'
  is_mapped_to_product: boolean
  validation_status: 'valid' | 'unmapped' | 'needs_review'
  days_since_first_seen: number
  is_selected: boolean
  selection_status: 'selected' | 'deselected' | 'not_in_selection'
}

export interface SOHBySupplier {
  supplier_id: string
  supplier_name: string
  supplier_sku: string
  product_id: string | null
  product_name: string
  location_id: string
  location_name: string
  qty_on_hand: number
  as_of_ts: Date
  cost_per_unit: number
  currency: string
  total_value: number
  category_name: string | null
  is_selected: boolean
}

export interface SOHRolledUp {
  product_id: string
  product_name: string
  total_qty: number
  total_value: number
  supplier_count: number
  suppliers: string[]
  category_name: string | null
  average_cost: number
  locations: Array<{
    location_id: string
    location_name: string
    qty: number
  }>
}

// Validation and Upload Types
export interface ValidationError {
  row: number
  field: string
  value: any
  message: string
  severity: 'error' | 'warning' | 'info'
  suggestion?: string
  auto_fix_available?: boolean
}

export interface UploadValidationResult {
  is_valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  summary: {
    total_rows: number
    valid_rows: number
    error_rows: number
    warning_rows: number
    duplicate_rows: number
    empty_rows: number
    estimated_value: number
    unique_categories: number
    unique_brands: number
    average_price: number
  }
  processed_items: SPPPricelistRow[]
  recommendations: string[]
}

// Filter and Query Types
export interface SupplierProductFilters {
  supplier_id?: string
  category_id?: string
  brand?: string
  is_new?: boolean
  is_mapped?: boolean
  price_min?: number
  price_max?: number
  has_price_change?: boolean
  price_change_direction?: 'up' | 'down'
  search?: string
  is_selected?: boolean
  selection_id?: string
}

export interface SOHFilters {
  supplier_id?: string
  location_id?: string
  category_id?: string
  min_qty?: number
  max_qty?: number
  min_value?: number
  search?: string
}

export interface PaginationParams {
  page: number
  page_size: number
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    page_size: number
    total_count: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
  }
}

// Dashboard and Analytics Types
export interface PriceChangeAlert {
  supplier_product_id: string
  supplier_name: string
  sku: string
  product_name: string
  old_price: number
  new_price: number
  change_percent: number
  change_date: Date
  severity: 'major' | 'moderate' | 'minor'
}

export interface NewProductAlert {
  supplier_product_id: string
  supplier_name: string
  sku: string
  product_name: string
  first_seen_at: Date
  current_price: number
  category: string | null
  is_mapped: boolean
}

export interface UploadActivity {
  upload_id: string
  supplier_name: string
  filename: string
  received_at: Date
  status: string
  row_count: number
  valid_rows: number
  error_rows: number
}

export interface DashboardMetrics {
  total_suppliers: number
  total_products: number
  new_products_count: number
  unmapped_products_count: number
  recent_price_changes_count: number
  total_inventory_value: number
  active_selections_count: number
  pending_uploads_count: number
}

// Bulk Operation Types
export interface BulkCategoryAssignment {
  supplier_product_ids: string[]
  category_id: string
  notes?: string
}

export interface BulkSelectionOperation {
  selection_id: string
  supplier_product_ids: string[]
  action: 'select' | 'deselect'
  notes?: string
}

export interface BulkOperationResult {
  success: boolean
  processed_count: number
  failed_count: number
  errors: Array<{
    id: string
    error: string
  }>
}

// Component Props Types
export interface SupplierProductTableProps {
  supplier_id?: string
  filters?: SupplierProductFilters
  selection_id?: string
  enable_selection?: boolean
  on_selection_change?: (selected_ids: string[]) => void
}

export interface ISIWizardProps {
  supplier_id?: string
  selection_id?: string
  on_complete?: (selection: InventorySelection) => void
}

export interface SOHReportProps {
  view_mode: 'by_supplier' | 'rolled_up'
  filters?: SOHFilters
  enable_export?: boolean
}

export interface PricelistUploadWizardProps {
  supplier_id?: string
  on_complete?: (result: UploadValidationResult) => Promise<void>
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface APIErrorResponse {
  success: false
  error: string
  details?: Record<string, any>
}
