/**
 * NXT-SPP API Client
 * Centralized API client for Supplier Product Portfolio operations
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
} from '@/types/supplier-portfolio';

const API_BASE = '/api';

class SupplierPortfolioAPIClient {
  private async fetchJSON<T>(url: string, options?: RequestInit): Promise<APIResponse<T>> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // ============================================
  // Supplier Product Management
  // ============================================

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
      ...(filters.price_change_direction && {
        price_change_direction: filters.price_change_direction,
      }),
      ...(filters.search && { search: filters.search }),
      ...(filters.is_selected !== undefined && { is_selected: filters.is_selected.toString() }),
      ...(filters.selection_id && { selection_id: filters.selection_id }),
    });

    return this.fetchJSON<PaginatedResponse<ProductTableBySupplier>>(
      `${API_BASE}/supplier-products?${params}`
    );
  }

  async getSupplierProduct(supplier_product_id: string): Promise<APIResponse<SupplierProduct>> {
    return this.fetchJSON<SupplierProduct>(`${API_BASE}/supplier-products/${supplier_product_id}`);
  }

  async updateSupplierProduct(
    supplier_product_id: string,
    data: Partial<SupplierProduct>
  ): Promise<APIResponse<SupplierProduct>> {
    return this.fetchJSON<SupplierProduct>(`${API_BASE}/supplier-products/${supplier_product_id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async assignCategory(
    assignment: BulkCategoryAssignment
  ): Promise<APIResponse<BulkOperationResult>> {
    return this.fetchJSON<BulkOperationResult>(
      `${API_BASE}/supplier-products/bulk/assign-category`,
      {
        method: 'POST',
        body: JSON.stringify(assignment),
      }
    );
  }

  async getPriceHistory(supplier_product_id: string): Promise<APIResponse<unknown[]>> {
    return this.fetchJSON<unknown[]>(
      `${API_BASE}/supplier-products/${supplier_product_id}/price-history`
    );
  }

  // ============================================
  // Inventory Selection Interface (ISI)
  // ============================================

  async getSelections(
    status?: 'draft' | 'active' | 'archived'
  ): Promise<APIResponse<InventorySelection[]>> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);

    return this.fetchJSON<InventorySelection[]>(`${API_BASE}/inventory-selections?${params}`);
  }

  async getSelection(selection_id: string): Promise<APIResponse<InventorySelection>> {
    return this.fetchJSON<InventorySelection>(`${API_BASE}/inventory-selections/${selection_id}`);
  }

  async createSelection(
    data: Omit<InventorySelection, 'selection_id' | 'created_at'>
  ): Promise<APIResponse<InventorySelection>> {
    return this.fetchJSON<InventorySelection>(`${API_BASE}/inventory-selections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSelection(
    selection_id: string,
    data: Partial<InventorySelection>
  ): Promise<APIResponse<InventorySelection>> {
    return this.fetchJSON<InventorySelection>(`${API_BASE}/inventory-selections/${selection_id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getSelectionItems(
    selection_id: string,
    filters?: { supplier_id?: string; category_id?: string }
  ): Promise<APIResponse<InventorySelectedItem[]>> {
    const params = new URLSearchParams({ selection_id });
    if (filters?.supplier_id) params.set('supplier_id', filters.supplier_id);
    if (filters?.category_id) params.set('category_id', filters.category_id);

    return this.fetchJSON<InventorySelectedItem[]>(
      `${API_BASE}/inventory-selections/${selection_id}/items?${params}`
    );
  }

  async bulkSelectProducts(
    operation: BulkSelectionOperation
  ): Promise<APIResponse<BulkOperationResult>> {
    return this.fetchJSON<BulkOperationResult>(
      `${API_BASE}/inventory-selections/${operation.selection_id}/bulk`,
      {
        method: 'POST',
        body: JSON.stringify(operation),
      }
    );
  }

  async activateSelection(selection_id: string): Promise<APIResponse<InventorySelection>> {
    return this.fetchJSON<InventorySelection>(
      `${API_BASE}/inventory-selections/${selection_id}/activate`,
      {
        method: 'POST',
      }
    );
  }

  async archiveSelection(selection_id: string): Promise<APIResponse<InventorySelection>> {
    return this.fetchJSON<InventorySelection>(
      `${API_BASE}/inventory-selections/${selection_id}/archive`,
      {
        method: 'POST',
      }
    );
  }

  // ============================================
  // Stock on Hand (SOH)
  // ============================================

  async getSOHBySupplier(
    filters: SOHFilters = {},
    pagination: PaginationParams = { page: 1, page_size: 50 }
  ): Promise<APIResponse<PaginatedResponse<SOHBySupplier>>> {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      page_size: pagination.page_size.toString(),
      view: 'by_supplier',
      ...(filters.supplier_id && { supplier_id: filters.supplier_id }),
      ...(filters.location_id && { location_id: filters.location_id }),
      ...(filters.category_id && { category_id: filters.category_id }),
      ...(filters.min_qty && { min_qty: filters.min_qty.toString() }),
      ...(filters.max_qty && { max_qty: filters.max_qty.toString() }),
      ...(filters.min_value && { min_value: filters.min_value.toString() }),
      ...(filters.search && { search: filters.search }),
    });

    return this.fetchJSON<PaginatedResponse<SOHBySupplier>>(`${API_BASE}/stock-on-hand?${params}`);
  }

  async getSOHRolledUp(
    filters: Pick<SOHFilters, 'category_id' | 'min_qty' | 'min_value' | 'search'> = {},
    pagination: PaginationParams = { page: 1, page_size: 50 }
  ): Promise<APIResponse<PaginatedResponse<SOHRolledUp>>> {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      page_size: pagination.page_size.toString(),
      view: 'rolled_up',
      ...(filters.category_id && { category_id: filters.category_id }),
      ...(filters.min_qty && { min_qty: filters.min_qty.toString() }),
      ...(filters.min_value && { min_value: filters.min_value.toString() }),
      ...(filters.search && { search: filters.search }),
    });

    return this.fetchJSON<PaginatedResponse<SOHRolledUp>>(`${API_BASE}/stock-on-hand?${params}`);
  }

  async exportSOH(filters: SOHFilters, view: 'by_supplier' | 'rolled_up'): Promise<Blob> {
    const params = new URLSearchParams({
      view,
      format: 'xlsx',
      ...(filters.supplier_id && { supplier_id: filters.supplier_id }),
      ...(filters.location_id && { location_id: filters.location_id }),
      ...(filters.category_id && { category_id: filters.category_id }),
    });

    const response = await fetch(`${API_BASE}/stock-on-hand/export?${params}`);
    return response.blob();
  }

  // ============================================
  // Pricelist Upload (SPP)
  // ============================================

  async uploadPricelist(
    supplier_id: string,
    file: File,
    options: {
      valid_from?: Date;
      valid_to?: Date | null;
      currency?: string;
    } = {}
  ): Promise<APIResponse<SPPPricelistUpload>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('supplier_id', supplier_id);
    if (options.valid_from) formData.append('valid_from', options.valid_from.toISOString());
    if (options.valid_to) formData.append('valid_to', options.valid_to.toISOString());
    if (options.currency) formData.append('currency', options.currency);

    try {
      const response = await fetch(`${API_BASE}/pricelists/upload`, {
        method: 'POST',
        body: formData,
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  async validatePricelist(upload_id: string): Promise<APIResponse<UploadValidationResult>> {
    return this.fetchJSON<UploadValidationResult>(`${API_BASE}/pricelists/${upload_id}/validate`, {
      method: 'POST',
    });
  }

  async mergePricelist(
    upload_id: string
  ): Promise<APIResponse<{ merged: boolean; message: string }>> {
    return this.fetchJSON<{ merged: boolean; message: string }>(
      `${API_BASE}/pricelists/${upload_id}/merge`,
      {
        method: 'POST',
      }
    );
  }

  async getPricelistUploads(
    supplier_id?: string,
    status?: string
  ): Promise<APIResponse<SPPPricelistUpload[]>> {
    const params = new URLSearchParams();
    if (supplier_id) params.set('supplier_id', supplier_id);
    if (status) params.set('status', status);

    return this.fetchJSON<SPPPricelistUpload[]>(`${API_BASE}/pricelists?${params}`);
  }

  async getPricelistUpload(upload_id: string): Promise<APIResponse<SPPPricelistUpload>> {
    return this.fetchJSON<SPPPricelistUpload>(`${API_BASE}/pricelists/${upload_id}`);
  }

  async deletePricelistUpload(upload_id: string): Promise<APIResponse<{ deleted: boolean }>> {
    return this.fetchJSON<{ deleted: boolean }>(`${API_BASE}/pricelists/${upload_id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // Dashboard and Monitoring
  // ============================================

  async getDashboardMetrics(): Promise<APIResponse<DashboardMetrics>> {
    return this.fetchJSON<DashboardMetrics>(`${API_BASE}/dashboard/supplier-portfolio/metrics`);
  }

  async getPriceChangeAlerts(
    days: number = 7,
    severity?: 'major' | 'moderate' | 'minor'
  ): Promise<APIResponse<PriceChangeAlert[]>> {
    const params = new URLSearchParams({ days: days.toString() });
    if (severity) params.set('severity', severity);

    return this.fetchJSON<PriceChangeAlert[]>(
      `${API_BASE}/dashboard/supplier-portfolio/price-changes?${params}`
    );
  }

  async getNewProductAlerts(days: number = 7): Promise<APIResponse<NewProductAlert[]>> {
    const params = new URLSearchParams({ days: days.toString() });

    return this.fetchJSON<NewProductAlert[]>(
      `${API_BASE}/dashboard/supplier-portfolio/new-products?${params}`
    );
  }

  async getUploadActivity(limit: number = 10): Promise<APIResponse<UploadActivity[]>> {
    const params = new URLSearchParams({ limit: limit.toString() });

    return this.fetchJSON<UploadActivity[]>(
      `${API_BASE}/dashboard/supplier-portfolio/uploads?${params}`
    );
  }

  // ============================================
  // Categories and Mapping
  // ============================================

  async getCategories(): Promise<
    APIResponse<Array<{ category_id: string; name: string; parent_id: string | null }>>
  > {
    return this.fetchJSON(`${API_BASE}/categories`);
  }

  async mapSupplierCategory(
    supplier_id: string,
    supplier_category_raw: string,
    category_id: string
  ): Promise<APIResponse<unknown>> {
    return this.fetchJSON(`${API_BASE}/categories/map`, {
      method: 'POST',
      body: JSON.stringify({
        supplier_id,
        supplier_category_raw,
        category_id,
      }),
    });
  }

  async getUnmappedCategories(supplier_id?: string): Promise<
    APIResponse<
      Array<{
        supplier_id: string;
        category_raw: string;
        product_count: number;
      }>
    >
  > {
    const params = new URLSearchParams();
    if (supplier_id) params.set('supplier_id', supplier_id);

    return this.fetchJSON(`${API_BASE}/categories/unmapped?${params}`);
  }
}

// Export singleton instance
export const supplierPortfolioAPI = new SupplierPortfolioAPIClient();
