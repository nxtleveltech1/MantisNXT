/**
 * Unified Data Service
 *
 * Single source of truth for all API data operations
 * Provides consistent response formats, field mapping, and error handling
 *
 * @module UnifiedDataService
 */

import { query, pool } from '@/lib/database/unified-connection';
import { CacheManager, cachedQuery } from '@/lib/cache/query-cache';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Standardized API Response Format
 * All endpoints should use this format for consistency
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T | T[];
  pagination?: PaginationMeta;
  meta?: QueryMeta;
  error?: string;
  details?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  cursor?: string | null;
}

/**
 * Query execution metadata
 */
export interface QueryMeta {
  queryTime?: number;
  filters?: Record<string, any>;
  queryFingerprint?: string;
}

/**
 * Query options for data fetching
 */
export interface QueryOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  search?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Supplier data structure (matches core.supplier schema)
 */
export interface Supplier {
  id: string;
  name: string;
  code: string;
  active: boolean;
  email?: string;
  phone?: string;
  website?: string;
  currency?: string;
  paymentTerms?: string;
  taxNumber?: string;
  contactInfo?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Inventory item data structure (matches core.stock_on_hand + joins)
 */
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category?: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  costPerUnitZar: number;
  salePerUnitZar: number;
  totalValueZar: number;
  supplierId: string;
  supplierName?: string;
  brandId?: string;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'critical';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Maps database row to Supplier object with field name transformation
 */
function mapDatabaseRowToSupplier(row: any): Supplier {
  return {
    id: row.id || row.supplier_id,
    name: row.name,
    code: row.code,
    active: row.active,
    email: row.email || row.contact_info?.email || '',
    phone: row.phone || row.contact_info?.phone || '',
    website: row.website || row.contact_info?.website || '',
    currency: row.currency || row.default_currency || 'ZAR',
    paymentTerms: row.payment_terms || row.paymentTerms,
    taxNumber: row.tax_number || row.taxNumber,
    contactInfo: row.contact_info,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps database row to InventoryItem object with field name transformation
 */
function mapDatabaseRowToInventoryItem(row: any): InventoryItem {
  const stockQty = Number(row.stock_qty ?? row.qty ?? 0);
  const costPrice = Number(row.cost_price ?? row.unit_cost ?? 0);
  const salePrice = Number(row.sale_price ?? row.unit_cost ?? 0);
  const reservedQty = Number(row.reserved_qty ?? 0);
  const availableQty = stockQty - reservedQty;

  // Determine stock status
  let status: InventoryItem['status'] = 'in_stock';
  if (stockQty === 0) {
    status = 'out_of_stock';
  } else if (stockQty <= 5) {
    status = 'critical';
  } else if (stockQty <= 10) {
    status = 'low_stock';
  }

  return {
    id: row.id || row.soh_id,
    sku: row.sku || row.supplier_sku,
    name: row.name || '',
    category: row.category || row.category_id,
    currentStock: stockQty,
    reservedStock: reservedQty,
    availableStock: availableQty,
    costPerUnitZar: costPrice,
    salePerUnitZar: salePrice,
    totalValueZar: stockQty * costPrice,
    supplierId: row.supplier_id || row.supplierId || '',
    supplierName: row.supplier_name || row.supplierName,
    brandId: row.brand_id || row.brandId,
    status,
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T | T[],
  pagination?: PaginationMeta,
  meta?: QueryMeta
): ApiResponse<T> {
  return {
    success: true,
    data,
    pagination,
    meta,
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(error: string, details?: string): ApiResponse {
  return {
    success: false,
    error,
    details,
  };
}

// ============================================================================
// SUPPLIER OPERATIONS
// ============================================================================

export class SupplierService {
  /**
   * Fetch suppliers with filtering and pagination
   */
  static async getSuppliers(options: QueryOptions = {}): Promise<ApiResponse<Supplier>> {
    const {
      page = 1,
      limit = 50,
      search,
      filters = {},
      sortBy = 'name',
      sortOrder = 'asc',
    } = options;

    const offset = (page - 1) * limit;
    const startTime = performance.now();

    try {
      // Build WHERE conditions
      const whereConditions: string[] = ['1=1'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Search filter
      if (search && search.length >= 2) {
        whereConditions.push(`(
          name ILIKE $${paramIndex} OR
          code ILIKE $${paramIndex} OR
          contact_info->>'email' ILIKE $${paramIndex} OR
          contact_info->>'phone' ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      // Active filter
      if (filters.active !== undefined) {
        whereConditions.push(`active = $${paramIndex}`);
        queryParams.push(filters.active);
        paramIndex++;
      }

      // Status filter (active/inactive)
      if (filters.status && Array.isArray(filters.status)) {
        const statusBooleans = filters.status.map((s: string) => s.toLowerCase() === 'active');
        whereConditions.push(`active = ANY($${paramIndex})`);
        queryParams.push(statusBooleans);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Main query with window function for total count
      const sql = `
        SELECT
          supplier_id as id,
          name,
          code,
          active,
          contact_info,
          contact_info->>'email' as email,
          contact_info->>'phone' as phone,
          contact_info->>'website' as website,
          default_currency as currency,
          payment_terms,
          tax_number,
          created_at,
          updated_at,
          COUNT(*) OVER() as total_count
        FROM core.supplier
        WHERE ${whereClause}
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const cacheKey = `suppliers:list:${JSON.stringify({ page, limit, search, filters, sortBy, sortOrder })}`;
      const result = await cachedQuery(
        CacheManager.hotCache,
        cacheKey,
        async () => await query(sql, queryParams),
        60_000
      );

      const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
      const totalPages = Math.ceil(total / limit);

      const queryTime = performance.now() - startTime;

      // Map results
      const suppliers = result.rows.map(mapDatabaseRowToSupplier);

      return createSuccessResponse(
        suppliers,
        {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        {
          queryTime,
          filters,
          queryFingerprint: 'suppliers_list',
        }
      );
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return createErrorResponse(
        'Failed to fetch suppliers',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get a single supplier by ID
   */
  static async getSupplierById(id: string): Promise<ApiResponse<Supplier>> {
    try {
      const sql = `
        SELECT
          supplier_id as id,
          name,
          code,
          active,
          contact_info,
          contact_info->>'email' as email,
          contact_info->>'phone' as phone,
          contact_info->>'website' as website,
          default_currency as currency,
          payment_terms,
          tax_number,
          created_at,
          updated_at
        FROM core.supplier
        WHERE supplier_id = $1
      `;

      const result = await query(sql, [id]);

      if (result.rows.length === 0) {
        return createErrorResponse('Supplier not found', `No supplier with id: ${id}`);
      }

      const supplier = mapDatabaseRowToSupplier(result.rows[0]);

      return createSuccessResponse(supplier);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      return createErrorResponse(
        'Failed to fetch supplier',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Create a new supplier
   */
  static async createSupplier(data: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    try {
      // Check for duplicate name
      const existingSupplier = await pool.query(
        'SELECT supplier_id FROM core.supplier WHERE name = $1',
        [data.name]
      );

      if (existingSupplier.rows.length > 0) {
        return createErrorResponse(
          'Supplier with this name already exists',
          `Duplicate name: ${data.name}`
        );
      }

      // Build contact_info JSONB
      const contactInfo = {
        email: data.email || '',
        phone: data.phone || '',
        website: data.website || '',
      };

      // Generate code if not provided
      const code =
        data.code ||
        data.name
          ?.substring(0, 10)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '') ||
        '';

      const insertSql = `
        INSERT INTO core.supplier (
          name,
          code,
          contact_info,
          active,
          default_currency,
          payment_terms,
          tax_number,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3::jsonb, $4, $5, $6, $7, NOW(), NOW()
        ) RETURNING supplier_id as id, *
      `;

      const insertResult = await pool.query(insertSql, [
        data.name,
        code,
        JSON.stringify(contactInfo),
        data.active ?? true,
        data.currency || 'ZAR',
        data.paymentTerms || '30 days',
        data.taxNumber,
      ]);

      const supplier = mapDatabaseRowToSupplier(insertResult.rows[0]);

      return createSuccessResponse(supplier);
    } catch (error) {
      console.error('Error creating supplier:', error);
      return createErrorResponse(
        'Failed to create supplier',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

// ============================================================================
// INVENTORY OPERATIONS
// ============================================================================

export class InventoryService {
  /**
   * Fetch inventory items with filtering and pagination
   */
  static async getInventory(options: QueryOptions = {}): Promise<ApiResponse<InventoryItem>> {
    const {
      page = 1,
      limit = 250,
      cursor,
      search,
      filters = {},
      sortBy = 'sku',
      sortOrder = 'asc',
    } = options;

    const offset = (page - 1) * limit;
    const startTime = performance.now();

    try {
      // Build WHERE conditions
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Cursor-based pagination
      if (cursor) {
        const [lastSku, lastId] = cursor.split('|');
        if (lastSku && lastId) {
          whereConditions.push(
            `(sp.supplier_sku > $${paramIndex} OR (sp.supplier_sku = $${paramIndex + 1} AND soh.soh_id > $${paramIndex + 2}::uuid))`
          );
          queryParams.push(lastSku, lastSku, lastId);
          paramIndex += 3;
        }
      }

      // Supplier filter
      if (filters.supplierId) {
        whereConditions.push(`sp.supplier_id = $${paramIndex}::uuid`);
        queryParams.push(filters.supplierId);
        paramIndex++;
      }

      // Category filter
      if (filters.category) {
        const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
        whereConditions.push(
          `COALESCE(p.category_id, sp.category_id) = ANY($${paramIndex}::uuid[])`
        );
        queryParams.push(categories);
        paramIndex++;
      }

      // Search filter
      if (search && search.length >= 2) {
        whereConditions.push(
          `(sp.supplier_sku ILIKE $${paramIndex} OR COALESCE(p.name, sp.name_from_supplier) ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      // Stock status filter
      if (filters.status) {
        switch (filters.status) {
          case 'out_of_stock':
            whereConditions.push('soh.qty = 0');
            break;
          case 'low_stock':
            whereConditions.push('soh.qty > 0 AND soh.qty <= 10');
            break;
          case 'critical':
            whereConditions.push('soh.qty > 0 AND soh.qty <= 5');
            break;
          case 'in_stock':
            whereConditions.push('soh.qty > 10');
            break;
        }
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Main query (adds window function for total only when not using cursor pagination)
      const sql = `
        SELECT
          soh.soh_id as id,
          sp.supplier_sku as sku,
          COALESCE(p.name, sp.name_from_supplier) as name,
          COALESCE(p.category_id, sp.category_id) as category,
          soh.qty as stock_qty,
          0 as reserved_qty,
          soh.qty as available_qty,
          soh.unit_cost as cost_price,
          soh.unit_cost as sale_price,
          sp.supplier_id,
          s.name as supplier_name,
          p.brand_id
          ${cursor ? '' : ', COUNT(*) OVER() as total_count'}
        FROM core.stock_on_hand AS soh
        JOIN core.supplier_product AS sp ON sp.supplier_product_id = soh.supplier_product_id
        JOIN core.supplier AS s ON s.supplier_id = sp.supplier_id
        LEFT JOIN core.product AS p ON p.product_id = sp.product_id
        ${whereClause}
        ORDER BY sp.supplier_sku ${sortOrder.toUpperCase()}, soh.soh_id ${sortOrder.toUpperCase()}
        ${cursor ? `LIMIT $${paramIndex}` : `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`}
      `;

      if (cursor) {
        queryParams.push(limit);
      } else {
        queryParams.push(limit, offset);
      }

      const invCacheKey = `inventory:list:${JSON.stringify({ page, limit, cursor: cursor || null, search, filters })}`;
      const result = await cachedQuery(
        CacheManager.realtimeCache,
        invCacheKey,
        async () => await query(sql, queryParams),
        30_000
      );

      // Generate next cursor
      let nextCursor: string | null = null;
      if (cursor && result.rows.length > 0) {
        const lastRow = result.rows[result.rows.length - 1];
        nextCursor = `${lastRow.sku}|${lastRow.id}`;
      }

      const queryTime = performance.now() - startTime;

      // Map results
      const items = result.rows.map(mapDatabaseRowToInventoryItem);

      // For cursor pagination, we don't have total count
      if (cursor) {
        return createSuccessResponse(
          items,
          {
            page: 1,
            limit,
            total: -1, // Unknown for cursor-based
            totalPages: -1,
            hasNext: result.rows.length === limit,
            hasPrev: false,
            cursor: nextCursor,
          },
          {
            queryTime,
            filters,
            queryFingerprint: 'inventory_cursor',
          }
        );
      }

      // For offset pagination, derive total from window function
      const total = result.rows.length > 0 ? parseInt((result.rows[0] as any).total_count, 10) : 0;
      const totalPages = Math.ceil(total / limit);

      return createSuccessResponse(
        items,
        {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        {
          queryTime,
          filters,
          queryFingerprint: 'inventory_offset',
        }
      );
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return createErrorResponse(
        'Failed to fetch inventory',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get inventory analytics/summary
   */
  static async getInventoryAnalytics(): Promise<ApiResponse<any>> {
    try {
      const sql = `
        SELECT
          COUNT(DISTINCT soh.soh_id) AS total_items,
          COALESCE(SUM(soh.qty * soh.unit_cost), 0) AS total_value,
          COUNT(CASE WHEN soh.qty > 0 AND soh.qty <= 10 THEN 1 END) AS low_stock_items,
          COUNT(CASE WHEN soh.qty = 0 THEN 1 END) AS out_of_stock_items,
          COUNT(CASE WHEN soh.qty > 0 AND soh.qty <= 5 THEN 1 END) AS critical_items,
          COUNT(CASE WHEN soh.qty > 10 THEN 1 END) AS in_stock_items
        FROM core.stock_on_hand soh
        JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
        JOIN core.supplier s ON s.supplier_id = sp.supplier_id
        WHERE s.active = true
      `;
      const analytics = await cachedQuery(
        CacheManager.dashboardCache,
        'inventory:analytics',
        async () => {
          const result = await query(sql);
          const row = result.rows[0];
          return {
            totalItems: parseInt(row.total_items),
            totalValue: parseFloat(row.total_value),
            lowStockItems: parseInt(row.low_stock_items),
            outOfStockItems: parseInt(row.out_of_stock_items),
            criticalItems: parseInt(row.critical_items),
            inStockItems: parseInt(row.in_stock_items),
          };
        },
        300_000
      );
      return createSuccessResponse(analytics);
    } catch (error) {
      console.error('Error fetching inventory analytics:', error);
      return createErrorResponse(
        'Failed to fetch inventory analytics',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  SupplierService,
  InventoryService,
  createSuccessResponse,
  createErrorResponse,
};
