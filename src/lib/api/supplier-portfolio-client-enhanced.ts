/**
 * NXT-SPP Enhanced API Client
 * Centralized API client for Supplier Product Portfolio operations
 *
 * ARCHITECTURE:
 * - SPP: Staging/isolation layer for pricelist uploads
 * - CORE: Canonical master data with supplier products
 * - SERVE: Read-optimized views for reporting
 */

import type {
  SupplierProduct,
  ProductTableBySupplier,
  SupplierProductFilters,
  PaginationParams,
  PaginatedResponse,
  InventorySelection,
  InventorySelectedItem,
  SOHBySupplier,
  SOHRolledUp,
  SOHFilters,
  SPPPricelistUpload,
  UploadValidationResult,
  BulkCategoryAssignment,
  BulkSelectionOperation,
  BulkOperationResult,
  DashboardMetrics,
  PriceChangeAlert,
  NewProductAlert,
  UploadActivity,
  APIResponse,
  SelectionWorkflowRequest
} from '@/types/supplier-portfolio'

const API_BASE = '/api'

/**
 * Enhanced API error with retry capabilities
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any,
    public isRetryable: boolean = false
  ) {
    super(message)
    this.name = 'APIError'
  }
}

class SupplierPortfolioAPIClient {
  /**
   * Enhanced fetch with retry logic for transient failures
   */
  private async fetchJSON<T>(
    url: string,
    options?: RequestInit,
    retryCount: number = 3
  ): Promise<APIResponse<T>> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
        })

        const data = await response.json()

        if (!response.ok) {
          const error = new APIError(
            data.error || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            data.details,
            this.isRetryableStatus(response.status)
          )

          // Retry on transient failures
          if (error.isRetryable && attempt < retryCount - 1) {
            await this.delay(this.getBackoffDelay(attempt))
            continue
          }

          return {
            success: false,
            error: error.message,
          }
        }

        return data
      } catch (error) {
        lastError = error as Error

        // Network errors are retryable
        if (attempt < retryCount - 1) {
          await this.delay(this.getBackoffDelay(attempt))
          continue
        }
      }
    }

    console.error('API request failed after retries:', lastError)
    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : 'Unknown error occurred',
    }
  }

  /**
   * Check if HTTP status code indicates a retryable error
   */
  private isRetryableStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500
  }

  /**
   * Calculate exponential backoff delay
   */
  private getBackoffDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 10000)
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ============================================
  // Supplier Product Management
  // ============================================

  /**
   * Get paginated list of supplier products with filters
   * @param filters - Filter criteria for products
   * @param pagination - Pagination parameters
   * @returns Paginated product list
   */
  async getSupplierProducts(
    filters: SupplierProductFilters = {},
    pagination: PaginationParams = { page: 1, page_size: 50 }
  ): Promise<APIResponse<PaginatedResponse<ProductTableBySupplier>>> {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      page_size: pagination.page_size.toString(),
      ...(pagination.sort_by && { sort_by: pagination.sort_by }),
      ...(pagination.sort_direction && { sort_direction: pagination.sort_direction }),
      ...(filters.supplier_id && { supplier_id: filters.supplier_id }),
      ...(filters.category_id && { category_id: filters.category_id }),
      ...(filters.brand && { brand: filters.brand }),
      ...(filters.is_new !== undefined && { is_new: filters.is_new.toString() }),
      ...(filters.is_mapped !== undefined && { is_mapped: filters.is_mapped.toString() }),
      ...(filters.price_min && { price_min: filters.price_min.toString() }),
      ...(filters.price_max && { price_max: filters.price_max.toString() }),
      ...(filters.has_price_change && { has_price_change: 'true' }),
      ...(filters.price_change_direction && { price_change_direction: filters.price_change_direction }),
      ...(filters.search && { search: filters.search }),
      ...(filters.is_selected !== undefined && { is_selected: filters.is_selected.toString() }),
      ...(filters.selection_id && { selection_id: filters.selection_id }),
    })

    return this.fetchJSON<PaginatedResponse<ProductTableBySupplier>>(
      `${API_BASE}/core/suppliers/products?${params}`
    )
  }

  /**
   * Get product table for ISI wizard display
   * @param supplierId - Supplier UUID
   * @param filters - Additional filters
   * @returns Product table for ISI wizard
   */
  async getProductTableForISI(
    supplierId: string,
    filters: Omit<SupplierProductFilters, 'supplier_id'> = {},
    pagination: PaginationParams = { page: 1, page_size: 100 }
  ): Promise<APIResponse<PaginatedResponse<ProductTableBySupplier>>> {
    return this.getSupplierProducts(
      { ...filters, supplier_id: supplierId },
      pagination
    )
  }

  async getSupplierProduct(supplier_product_id: string): Promise<APIResponse<SupplierProduct>> {
    return this.fetchJSON<SupplierProduct>(
      `${API_BASE}/core/suppliers/products/${supplier_product_id}`
    )
  }

  async updateSupplierProduct(
    supplier_product_id: string,
    data: Partial<SupplierProduct>
  ): Promise<APIResponse<SupplierProduct>> {
    return this.fetchJSON<SupplierProduct>(
      `${API_BASE}/core/suppliers/products/${supplier_product_id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    )
  }

  async assignCategory(assignment: BulkCategoryAssignment): Promise<APIResponse<BulkOperationResult>> {
    return this.fetchJSON<BulkOperationResult>(
      `${API_BASE}/core/suppliers/products/bulk/assign-category`,
      {
        method: 'POST',
        body: JSON.stringify(assignment),
      }
    )
  }

  async getPriceHistory(supplier_product_id: string): Promise<APIResponse<any[]>> {
    return this.fetchJSON<any[]>(
      `${API_BASE}/core/suppliers/products/${supplier_product_id}/price-history`
    )
  }

  // ============================================
  // Inventory Selection Interface (ISI)
  // ============================================

  async getSelections(status?: 'draft' | 'active' | 'archived'): Promise<APIResponse<InventorySelection[]>> {
    const params = new URLSearchParams()
    if (status) params.set('status', status)

    return this.fetchJSON<InventorySelection[]>(
      `${API_BASE}/core/selections?${params}`
    )
  }

  async getSelection(selection_id: string): Promise<APIResponse<InventorySelection>> {
    return this.fetchJSON<InventorySelection>(
      `${API_BASE}/core/selections/${selection_id}`
    )
  }

  /**
   * Create new inventory selection
   * @param name - Selection name
   * @param description - Optional description
   * @param createdBy - User UUID
   * @returns Created selection record
   */
  async createSelection(
    name: string,
    description: string | undefined,
    createdBy: string
  ): Promise<APIResponse<InventorySelection>> {
    return this.fetchJSON<InventorySelection>(
      `${API_BASE}/core/selections`,
      {
        method: 'POST',
        body: JSON.stringify({
          selection_name: name,
          description,
          created_by: createdBy,
          status: 'draft'
        }),
      }
    )
  }

  async updateSelection(
    selection_id: string,
    data: Partial<InventorySelection>
  ): Promise<APIResponse<InventorySelection>> {
    return this.fetchJSON<InventorySelection>(
      `${API_BASE}/core/selections/${selection_id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    )
  }

  /**
   * Get selected items in a selection
   * @param selectionId - Selection UUID
   * @param filters - Optional filters
   * @returns List of selected items with product details
   */
  async getSelectionItems(
    selectionId: string,
    filters?: { supplier_id?: string; category_id?: string }
  ): Promise<APIResponse<InventorySelectedItem[]>> {
    const params = new URLSearchParams()
    if (filters?.supplier_id) params.set('supplier_id', filters.supplier_id)
    if (filters?.category_id) params.set('category_id', filters.category_id)

    return this.fetchJSON<InventorySelectedItem[]>(
      `${API_BASE}/core/selections/${selectionId}/items?${params}`
    )
  }

  /**
   * Execute selection workflow (select/deselect products)
   * @param request - Workflow request with action and product IDs
   * @returns Operation result with success/failure counts
   */
  async executeWorkflow(request: SelectionWorkflowRequest): Promise<APIResponse<BulkOperationResult>> {
    return this.fetchJSON<BulkOperationResult>(
      `${API_BASE}/core/selections/workflow`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    )
  }

  async bulkSelectProducts(operation: BulkSelectionOperation): Promise<APIResponse<BulkOperationResult>> {
    return this.fetchJSON<BulkOperationResult>(
      `${API_BASE}/core/selections/${operation.selection_id}/bulk`,
      {
        method: 'POST',
        body: JSON.stringify(operation),
      }
    )
  }

  /**
   * Activate selection (make it active for SOH reporting)
   * @param selectionId - Selection UUID
   * @returns Updated selection with active status
   */
  async activateSelection(selectionId: string): Promise<APIResponse<InventorySelection>> {
    return this.fetchJSON<InventorySelection>(
      `${API_BASE}/core/selections/${selectionId}/activate`,
      {
        method: 'POST',
      }
    )
  }

  async archiveSelection(selection_id: string): Promise<APIResponse<InventorySelection>> {
    return this.fetchJSON<InventorySelection>(
      `${API_BASE}/core/selections/${selection_id}/archive`,
      {
        method: 'POST',
      }
    )
  }

  /**
   * Get active catalog (selected products only)
   * @param filters - Filter criteria
   * @returns Active catalog items
   */
  async getActiveCatalog(
    filters: SupplierProductFilters = {},
    pagination: PaginationParams = { page: 1, page_size: 50 }
  ): Promise<APIResponse<PaginatedResponse<ProductTableBySupplier>>> {
    return this.getSupplierProducts(
      { ...filters, is_selected: true },
      pagination
    )
  }

  // ============================================
  // Stock on Hand (SOH) - CRITICAL: Always use selected_only
  // ============================================

  /**
   * Get SOH by supplier (ALWAYS filters to selected products by default)
   * @param filters - Filter criteria (selected_only defaults to true)
   * @param pagination - Pagination parameters
   * @returns SOH data grouped by supplier
   */
  async getSohBySupplier(
    filters: SOHFilters & { selected_only?: boolean } = { selected_only: true },
    pagination: PaginationParams = { page: 1, page_size: 50 }
  ): Promise<APIResponse<PaginatedResponse<SOHBySupplier>>> {
    // CRITICAL: Default to selected_only: true
    const safeFilters = { ...filters, selected_only: filters.selected_only ?? true }

    const params = new URLSearchParams({
      page: pagination.page.toString(),
      page_size: pagination.page_size.toString(),
      selected_only: safeFilters.selected_only.toString(),
      ...(safeFilters.supplier_id && { supplier_id: safeFilters.supplier_id }),
      ...(safeFilters.location_id && { location_id: safeFilters.location_id }),
      ...(safeFilters.category_id && { category_id: safeFilters.category_id }),
      ...(safeFilters.min_qty && { min_qty: safeFilters.min_qty.toString() }),
      ...(safeFilters.max_qty && { max_qty: safeFilters.max_qty.toString() }),
      ...(safeFilters.min_value && { min_value: safeFilters.min_value.toString() }),
      ...(safeFilters.search && { search: safeFilters.search }),
    })

    return this.fetchJSON<PaginatedResponse<SOHBySupplier>>(
      `${API_BASE}/serve/soh?${params}`
    )
  }

  /**
   * Get rolled-up SOH across suppliers (ALWAYS filters to selected products by default)
   * @param filters - Filter criteria (selected_only defaults to true)
   * @param pagination - Pagination parameters
   * @returns SOH data aggregated across suppliers
   */
  async getSohRolledUp(
    filters: Pick<SOHFilters, 'category_id' | 'min_qty' | 'min_value' | 'search'> & { selected_only?: boolean } = { selected_only: true },
    pagination: PaginationParams = { page: 1, page_size: 50 }
  ): Promise<APIResponse<PaginatedResponse<SOHRolledUp>>> {
    // CRITICAL: Default to selected_only: true
    const safeFilters = { ...filters, selected_only: filters.selected_only ?? true }

    const params = new URLSearchParams({
      page: pagination.page.toString(),
      page_size: pagination.page_size.toString(),
      selected_only: safeFilters.selected_only.toString(),
      ...(safeFilters.category_id && { category_id: safeFilters.category_id }),
      ...(safeFilters.min_qty && { min_qty: safeFilters.min_qty.toString() }),
      ...(safeFilters.min_value && { min_value: safeFilters.min_value.toString() }),
      ...(safeFilters.search && { search: safeFilters.search }),
    })

    return this.fetchJSON<PaginatedResponse<SOHRolledUp>>(
      `${API_BASE}/serve/soh/rolled-up?${params}`
    )
  }

  /**
   * Get total inventory value (ALWAYS filters to selected products by default)
   * @param supplierIds - Optional list of supplier UUIDs
   * @param selectedOnly - Filter to selected products only (default: true)
   * @returns Total inventory value
   */
  async getInventoryValue(
    supplierIds?: string[],
    selectedOnly: boolean = true
  ): Promise<APIResponse<{ total_value: number; currency: string; supplier_breakdown?: Array<{ supplier_id: string; value: number }> }>> {
    const params = new URLSearchParams({
      selected_only: selectedOnly.toString()
    })

    if (supplierIds && supplierIds.length > 0) {
      params.set('supplier_ids', supplierIds.join(','))
    }

    return this.fetchJSON(
      `${API_BASE}/serve/soh/value?${params}`
    )
  }

  /**
   * Export SOH report to Excel/CSV
   * @param request - Report request parameters
   * @param format - Export format (xlsx or csv)
   * @returns File blob
   */
  async exportSohReport(
    request: {
      supplier_ids?: string[]
      location_ids?: string[]
      selected_only?: boolean
      group_by?: 'supplier' | 'product' | 'location'
    },
    format: 'xlsx' | 'csv' = 'xlsx'
  ): Promise<Blob> {
    const params = new URLSearchParams({
      format,
      selected_only: (request.selected_only ?? true).toString(),
      ...(request.supplier_ids && { supplier_ids: request.supplier_ids.join(',') }),
      ...(request.location_ids && { location_ids: request.location_ids.join(',') }),
      ...(request.group_by && { group_by: request.group_by }),
    })

    const response = await fetch(`${API_BASE}/serve/soh/export?${params}`)
    return response.blob()
  }

  // ============================================
  // Pricelist Upload (SPP)
  // ============================================

  /**
   * Upload pricelist file with auto-validate and auto-merge options
   * @param file - Excel/CSV file containing pricelist data
   * @param supplierId - Supplier UUID
   * @param options - Upload configuration options
   * @returns Upload record with validation result if auto_validate is true
   */
  async uploadPricelist(
    file: File,
    supplierId: string,
    options: {
      valid_from?: Date
      valid_to?: Date | null
      currency?: string
      auto_validate?: boolean
      auto_merge?: boolean
    } = {}
  ): Promise<APIResponse<SPPPricelistUpload>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('supplier_id', supplierId)
    if (options.valid_from) formData.append('valid_from', options.valid_from.toISOString())
    if (options.valid_to) formData.append('valid_to', options.valid_to.toISOString())
    if (options.currency) formData.append('currency', options.currency)
    if (options.auto_validate) formData.append('auto_validate', 'true')
    if (options.auto_merge) formData.append('auto_merge', 'true')

    try {
      const response = await fetch(`${API_BASE}/spp/upload`, {
        method: 'POST',
        body: formData,
      })

      return await response.json()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  /**
   * Validate uploaded pricelist
   * @param uploadId - Upload UUID
   * @returns Validation result with errors, warnings, and summary
   */
  async validateUpload(uploadId: string): Promise<APIResponse<UploadValidationResult>> {
    return this.fetchJSON<UploadValidationResult>(
      `${API_BASE}/spp/validate?upload_id=${uploadId}`,
      {
        method: 'POST',
      }
    )
  }

  /**
   * Merge validated pricelist to CORE schema
   * @param uploadId - Upload UUID
   * @returns Merge result with counts of created/updated products
   */
  async mergePricelist(uploadId: string): Promise<APIResponse<{ merged: boolean; message: string }>> {
    return this.fetchJSON<{ merged: boolean; message: string }>(
      `${API_BASE}/spp/merge?upload_id=${uploadId}`,
      {
        method: 'POST',
      }
    )
  }

  /**
   * Poll upload status until complete
   * @param uploadId - Upload UUID
   * @param maxAttempts - Maximum polling attempts (default: 30)
   * @param intervalMs - Polling interval in milliseconds (default: 2000)
   * @returns Final upload status
   */
  async getUploadStatus(
    uploadId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<APIResponse<SPPPricelistUpload>> {
    let attempts = 0

    while (attempts < maxAttempts) {
      const response = await this.fetchJSON<SPPPricelistUpload>(
        `${API_BASE}/spp/upload?upload_id=${uploadId}`
      )

      if (!response.success) {
        return response
      }

      const status = response.data?.status
      if (status === 'merged' || status === 'served' || status === 'error') {
        return response
      }

      attempts++
      await this.delay(intervalMs)
    }

    return {
      success: false,
      error: 'Upload status polling timeout'
    }
  }

  /**
   * List recent uploads for a supplier
   * @param supplierId - Supplier UUID (optional - returns all if not provided)
   * @param limit - Maximum number of uploads to return
   * @returns List of uploads ordered by received_at DESC
   */
  async listUploads(
    supplierId?: string,
    limit: number = 50
  ): Promise<APIResponse<SPPPricelistUpload[]>> {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (supplierId) params.set('supplier_id', supplierId)

    return this.fetchJSON<SPPPricelistUpload[]>(
      `${API_BASE}/spp/upload?${params}`
    )
  }

  async getPricelistUpload(upload_id: string): Promise<APIResponse<SPPPricelistUpload>> {
    return this.fetchJSON<SPPPricelistUpload>(
      `${API_BASE}/spp/upload?upload_id=${upload_id}`
    )
  }

  async deletePricelistUpload(upload_id: string): Promise<APIResponse<{ deleted: boolean }>> {
    return this.fetchJSON<{ deleted: boolean }>(
      `${API_BASE}/spp/upload?upload_id=${upload_id}`,
      {
        method: 'DELETE',
      }
    )
  }

  // ============================================
  // Dashboard and Monitoring
  // ============================================

  /**
   * Get dashboard aggregate metrics
   * @returns Dashboard metrics summary
   */
  async getDashboardMetrics(): Promise<APIResponse<DashboardMetrics>> {
    return this.fetchJSON<DashboardMetrics>(
      `${API_BASE}/dashboard/supplier-portfolio/metrics`
    )
  }

  async getPriceChangeAlerts(
    days: number = 7,
    severity?: 'major' | 'moderate' | 'minor'
  ): Promise<APIResponse<PriceChangeAlert[]>> {
    const params = new URLSearchParams({ days: days.toString() })
    if (severity) params.set('severity', severity)

    return this.fetchJSON<PriceChangeAlert[]>(
      `${API_BASE}/dashboard/supplier-portfolio/price-changes?${params}`
    )
  }

  async getNewProductAlerts(days: number = 7): Promise<APIResponse<NewProductAlert[]>> {
    const params = new URLSearchParams({ days: days.toString() })

    return this.fetchJSON<NewProductAlert[]>(
      `${API_BASE}/dashboard/supplier-portfolio/new-products?${params}`
    )
  }

  /**
   * Get recent upload activity feed
   * @param limit - Maximum number of activities to return
   * @returns Recent upload activities
   */
  async getRecentActivity(limit: number = 10): Promise<APIResponse<UploadActivity[]>> {
    const params = new URLSearchParams({ limit: limit.toString() })

    return this.fetchJSON<UploadActivity[]>(
      `${API_BASE}/dashboard/supplier-portfolio/uploads?${params}`
    )
  }

  // ============================================
  // Categories and Mapping
  // ============================================

  async getCategories(): Promise<APIResponse<Array<{ category_id: string; name: string; parent_id: string | null }>>> {
    return this.fetchJSON(`${API_BASE}/categories`)
  }

  async mapSupplierCategory(
    supplier_id: string,
    supplier_category_raw: string,
    category_id: string
  ): Promise<APIResponse<any>> {
    return this.fetchJSON(`${API_BASE}/categories/map`, {
      method: 'POST',
      body: JSON.stringify({
        supplier_id,
        supplier_category_raw,
        category_id,
      }),
    })
  }

  async getUnmappedCategories(supplier_id?: string): Promise<APIResponse<Array<{
    supplier_id: string
    category_raw: string
    product_count: number
  }>>> {
    const params = new URLSearchParams()
    if (supplier_id) params.set('supplier_id', supplier_id)

    return this.fetchJSON(`${API_BASE}/categories/unmapped?${params}`)
  }
}

// Export singleton instance
export const supplierPortfolioAPI = new SupplierPortfolioAPIClient()
export { SupplierPortfolioAPIClient, APIError }
