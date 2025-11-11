/**
 * NXT-SPP Integration Utilities
 * Helper functions for common workflows and data transformations
 */

import type {
  SOHBySupplier,
  ProductTableBySupplier,
  SelectionWorkflowRequest
} from '@/types/supplier-portfolio'

// ============================================
// Query Parameter Builders
// ============================================

/**
 * Build query parameters for supplier product filters
 */
export function buildSupplierProductQuery(filters: {
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
}): URLSearchParams {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, value.toString())
    }
  })

  return params
}

/**
 * Build query parameters for SOH filters (CRITICAL: Always defaults to selected_only: true)
 */
export function buildSohQuery(filters: {
  supplier_id?: string
  location_id?: string
  category_id?: string
  min_qty?: number
  max_qty?: number
  min_value?: number
  search?: string
  selected_only?: boolean
}): URLSearchParams {
  const params = new URLSearchParams()

  // CRITICAL: Default to selected_only: true
  const safeFilters = { ...filters, selected_only: filters.selected_only ?? true }

  Object.entries(safeFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, value.toString())
    }
  })

  return params
}

/**
 * Build pagination parameters
 */
export function buildPaginationQuery(pagination: {
  page?: number
  page_size?: number
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
}): URLSearchParams {
  const params = new URLSearchParams()

  params.set('page', (pagination.page ?? 1).toString())
  params.set('page_size', (pagination.page_size ?? 50).toString())

  if (pagination.sort_by) {
    params.set('sort_by', pagination.sort_by)
  }

  if (pagination.sort_direction) {
    params.set('sort_direction', pagination.sort_direction)
  }

  return params
}

// ============================================
// Data Transformation Utilities
// ============================================

/**
 * Calculate total inventory value from SOH data
 */
export function calculateInventoryValue(sohData: SOHBySupplier[]): {
  total: number
  by_supplier: Map<string, number>
  by_location: Map<string, number>
} {
  const total = sohData.reduce((sum, item) => sum + item.total_value, 0)

  const by_supplier = new Map<string, number>()
  const by_location = new Map<string, number>()

  sohData.forEach(item => {
    // By supplier
    const currentSupplier = by_supplier.get(item.supplier_id) || 0
    by_supplier.set(item.supplier_id, currentSupplier + item.total_value)

    // By location
    const currentLocation = by_location.get(item.location_id) || 0
    by_location.set(item.location_id, currentLocation + item.total_value)
  })

  return { total, by_supplier, by_location }
}

/**
 * Group SOH data by supplier
 */
export function groupSohBySupplier(sohData: SOHBySupplier[]): Map<string, {
  supplier_name: string
  items: SOHBySupplier[]
  total_qty: number
  total_value: number
}> {
  const grouped = new Map()

  sohData.forEach(item => {
    if (!grouped.has(item.supplier_id)) {
      grouped.set(item.supplier_id, {
        supplier_name: item.supplier_name,
        items: [],
        total_qty: 0,
        total_value: 0
      })
    }

    const group = grouped.get(item.supplier_id)
    group.items.push(item)
    group.total_qty += item.qty_on_hand
    group.total_value += item.total_value
  })

  return grouped
}

/**
 * Calculate price change statistics
 */
export function calculatePriceChangeStats(products: ProductTableBySupplier[]): {
  total_changes: number
  increases: number
  decreases: number
  average_change_percent: number
  max_increase: number
  max_decrease: number
} {
  const changesOnly = products.filter(p => p.price_change_percent !== null)

  const increases = changesOnly.filter(p => p.price_change_percent! > 0)
  const decreases = changesOnly.filter(p => p.price_change_percent! < 0)

  const average_change_percent = changesOnly.length > 0
    ? changesOnly.reduce((sum, p) => sum + (p.price_change_percent || 0), 0) / changesOnly.length
    : 0

  const max_increase = increases.length > 0
    ? Math.max(...increases.map(p => p.price_change_percent!))
    : 0

  const max_decrease = decreases.length > 0
    ? Math.min(...decreases.map(p => p.price_change_percent!))
    : 0

  return {
    total_changes: changesOnly.length,
    increases: increases.length,
    decreases: decreases.length,
    average_change_percent,
    max_increase,
    max_decrease
  }
}

/**
 * Transform supplier products to ISI wizard format
 */
export function transformToISIWizardData(products: ProductTableBySupplier[]): Array<{
  id: string
  sku: string
  name: string
  supplier_name: string
  category: string | null
  current_price: number
  currency: string
  is_new: boolean
  is_mapped: boolean
  is_selected: boolean
  selectable: boolean
  validation_status: string
}> {
  return products.map(product => ({
    id: product.supplier_product_id,
    sku: product.supplier_sku,
    name: product.name_from_supplier,
    supplier_name: product.supplier_name,
    category: product.category_name,
    current_price: product.current_price,
    currency: product.currency,
    is_new: product.is_new,
    is_mapped: product.is_mapped_to_product,
    is_selected: product.is_selected,
    selectable: product.validation_status === 'valid',
    validation_status: product.validation_status
  }))
}

/**
 * Build selection workflow request
 */
export function buildSelectionWorkflowRequest(
  action: 'select' | 'deselect' | 'approve',
  supplierProductIds: string[],
  options: {
    selection_id?: string
    selection_name?: string
    notes?: string
    selected_by: string
  }
): SelectionWorkflowRequest {
  return {
    action,
    supplier_product_ids: supplierProductIds,
    selection_id: options.selection_id,
    selection_name: options.selection_name,
    notes: options.notes,
    selected_by: options.selected_by
  }
}

// ============================================
// Common Workflow Helpers
// ============================================

/**
 * Complete pricelist upload workflow (upload → validate → merge)
 */
export async function completePricelistWorkflow(
  api: unknown,
  file: File,
  supplierId: string,
  options: {
    currency?: string
    valid_from?: Date
    on_progress?: (stage: 'uploading' | 'validating' | 'merging', data: unknown) => void
  } = {}
): Promise<{
  success: boolean
  upload_id?: string
  validation?: unknown
  merge?: unknown
  error?: string
}> {
  try {
    // 1. Upload
    options.on_progress?.('uploading', { file: file.name })
    const uploadResult = await api.uploadPricelist(file, supplierId, {
      currency: options.currency || 'ZAR',
      valid_from: options.valid_from,
      auto_validate: false,
      auto_merge: false
    })

    if (!uploadResult.success || !uploadResult.data) {
      return { success: false, error: uploadResult.error || 'Upload failed' }
    }

    const uploadId = uploadResult.data.upload_id

    // 2. Validate
    options.on_progress?.('validating', { upload_id: uploadId })
    const validationResult = await api.validateUpload(uploadId)

    if (!validationResult.success) {
      return {
        success: false,
        upload_id: uploadId,
        error: validationResult.error || 'Validation failed'
      }
    }

    // Check validation status
    if (validationResult.data?.status === 'invalid') {
      return {
        success: false,
        upload_id: uploadId,
        validation: validationResult.data,
        error: 'Pricelist contains errors'
      }
    }

    // 3. Merge
    options.on_progress?.('merging', { upload_id: uploadId })
    const mergeResult = await api.mergePricelist(uploadId)

    if (!mergeResult.success) {
      return {
        success: false,
        upload_id: uploadId,
        validation: validationResult.data,
        error: mergeResult.error || 'Merge failed'
      }
    }

    return {
      success: true,
      upload_id: uploadId,
      validation: validationResult.data,
      merge: mergeResult.data
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Workflow failed'
    }
  }
}

/**
 * Complete ISI selection workflow (create selection → select products → activate)
 */
export async function completeISIWorkflow(
  api: unknown,
  selectionName: string,
  supplierProductIds: string[],
  createdBy: string,
  options: {
    description?: string
    notes?: string
    on_progress?: (stage: 'creating' | 'selecting' | 'activating', data: unknown) => void
  } = {}
): Promise<{
  success: boolean
  selection_id?: string
  selected_count?: number
  error?: string
}> {
  try {
    // 1. Create selection
    options.on_progress?.('creating', { name: selectionName })
    const createResult = await api.createSelection(
      selectionName,
      options.description,
      createdBy
    )

    if (!createResult.success || !createResult.data) {
      return { success: false, error: createResult.error || 'Failed to create selection' }
    }

    const selectionId = createResult.data.selection_id

    // 2. Select products
    options.on_progress?.('selecting', { selection_id: selectionId, count: supplierProductIds.length })
    const workflowResult = await api.executeWorkflow({
      selection_id: selectionId,
      supplier_product_ids: supplierProductIds,
      action: 'select',
      notes: options.notes,
      selected_by: createdBy
    })

    if (!workflowResult.success) {
      return {
        success: false,
        selection_id: selectionId,
        error: workflowResult.error || 'Failed to select products'
      }
    }

    // 3. Activate selection
    options.on_progress?.('activating', { selection_id: selectionId })
    const activateResult = await api.activateSelection(selectionId)

    if (!activateResult.success) {
      return {
        success: false,
        selection_id: selectionId,
        selected_count: workflowResult.data?.processed_count,
        error: activateResult.error || 'Failed to activate selection'
      }
    }

    return {
      success: true,
      selection_id: selectionId,
      selected_count: workflowResult.data?.processed_count
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ISI workflow failed'
    }
  }
}

/**
 * Batch select products with chunking for large selections
 */
export async function batchSelectProducts(
  api: unknown,
  selectionId: string,
  supplierProductIds: string[],
  selectedBy: string,
  options: {
    chunk_size?: number
    on_chunk_complete?: (processed: number, total: number) => void
  } = {}
): Promise<{
  success: boolean
  total_processed: number
  total_failed: number
  errors: string[]
}> {
  const chunkSize = options.chunk_size || 100
  const chunks: string[][] = []

  // Split into chunks
  for (let i = 0; i < supplierProductIds.length; i += chunkSize) {
    chunks.push(supplierProductIds.slice(i, i + chunkSize))
  }

  let totalProcessed = 0
  let totalFailed = 0
  const errors: string[] = []

  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    try {
      const result = await api.executeWorkflow({
        selection_id: selectionId,
        supplier_product_ids: chunk,
        action: 'select',
        selected_by: selectedBy
      })

      if (result.success && result.data) {
        totalProcessed += result.data.processed_count || 0
        totalFailed += result.data.failed_count || 0

        if (result.data.errors) {
          errors.push(...result.data.errors.map((e: unknown) => e.error))
        }
      } else {
        totalFailed += chunk.length
        errors.push(`Chunk ${i + 1} failed: ${result.error}`)
      }

      options.on_chunk_complete?.(totalProcessed, supplierProductIds.length)
    } catch (error) {
      totalFailed += chunk.length
      errors.push(`Chunk ${i + 1} error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: errors.length === 0,
    total_processed: totalProcessed,
    total_failed: totalFailed,
    errors
  }
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate price change is within acceptable range
 */
export function validatePriceChange(
  previousPrice: number,
  newPrice: number,
  maxIncreasePercent: number = 50,
  maxDecreasePercent: number = 30
): {
  valid: boolean
  change_percent: number
  severity: 'major' | 'moderate' | 'minor'
  message?: string
} {
  const changePercent = ((newPrice - previousPrice) / previousPrice) * 100

  if (changePercent > maxIncreasePercent) {
    return {
      valid: false,
      change_percent: changePercent,
      severity: 'major',
      message: `Price increase of ${changePercent.toFixed(1)}% exceeds maximum allowed (${maxIncreasePercent}%)`
    }
  }

  if (changePercent < -maxDecreasePercent) {
    return {
      valid: false,
      change_percent: changePercent,
      severity: 'major',
      message: `Price decrease of ${Math.abs(changePercent).toFixed(1)}% exceeds maximum allowed (${maxDecreasePercent}%)`
    }
  }

  const severity: 'major' | 'moderate' | 'minor' =
    Math.abs(changePercent) > 20 ? 'major' :
    Math.abs(changePercent) > 10 ? 'moderate' : 'minor'

  return {
    valid: true,
    change_percent: changePercent,
    severity
  }
}

/**
 * Check if product is ready for selection
 */
export function isProductSelectableForISI(product: ProductTableBySupplier): {
  selectable: boolean
  reasons: string[]
} {
  const reasons: string[] = []

  if (!product.is_active) {
    reasons.push('Product is inactive')
  }

  if (!product.current_price || product.current_price <= 0) {
    reasons.push('Invalid price')
  }

  if (!product.category_name && !product.is_mapped_to_product) {
    reasons.push('Product is not mapped to category')
  }

  if (product.validation_status === 'needs_review') {
    reasons.push('Product needs review')
  }

  return {
    selectable: reasons.length === 0,
    reasons
  }
}

// ============================================
// Export Helpers
// ============================================

/**
 * Format SOH data for Excel export
 */
export function formatSohForExport(sohData: SOHBySupplier[]): Array<{
  Supplier: string
  SKU: string
  Product: string
  Location: string
  'Qty on Hand': number
  'Unit Cost': number
  'Total Value': number
  Currency: string
  'As of': string
  Selected: string
}> {
  return sohData.map(item => ({
    Supplier: item.supplier_name,
    SKU: item.supplier_sku,
    Product: item.product_name,
    Location: item.location_name,
    'Qty on Hand': item.qty_on_hand,
    'Unit Cost': item.cost_per_unit,
    'Total Value': item.total_value,
    Currency: item.currency,
    'As of': item.as_of_ts.toISOString(),
    Selected: item.is_selected ? 'Yes' : 'No'
  }))
}

/**
 * Format product table for Excel export
 */
export function formatProductTableForExport(products: ProductTableBySupplier[]): Array<{
  Supplier: string
  SKU: string
  Name: string
  Brand: string
  Category: string
  'Current Price': number
  'Previous Price': number | null
  'Change %': number | null
  Currency: string
  'Is New': string
  'Is Mapped': string
  'Is Selected': string
  'First Seen': string
}> {
  return products.map(p => ({
    Supplier: p.supplier_name,
    SKU: p.supplier_sku,
    Name: p.name_from_supplier,
    Brand: p.brand || '',
    Category: p.category_name || '',
    'Current Price': p.current_price,
    'Previous Price': p.previous_price,
    'Change %': p.price_change_percent,
    Currency: p.currency,
    'Is New': p.is_new ? 'Yes' : 'No',
    'Is Mapped': p.is_mapped_to_product ? 'Yes' : 'No',
    'Is Selected': p.is_selected ? 'Yes' : 'No',
    'First Seen': p.first_seen_at.toISOString()
  }))
}
