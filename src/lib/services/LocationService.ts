// @ts-nocheck

/**
 * LocationService - Handles inventory location management
 *
 * Responsibilities:
 * - CRUD operations for stock locations
 * - Location validation and business rules
 * - Location search and filtering
 * - Multi-tenant data isolation
 */

import { query as dbQuery, withTransaction } from '../../../lib/database/unified-connection';
import type { StockLocation } from '../../types/nxt-spp';
import { StockLocationSchema } from '../../types/nxt-spp';

export interface CreateLocationRequest {
  org_id?: string;
  name: string;
  type: 'internal' | 'supplier' | 'consignment';
  supplier_id?: string | null;
  address?: string | null;
  metadata?: Record<string, unknown>;
  is_active?: boolean;
}

export interface UpdateLocationRequest {
  name?: string;
  type?: 'internal' | 'supplier' | 'consignment';
  supplier_id?: string | null;
  address?: string | null;
  metadata?: Record<string, unknown>;
  is_active?: boolean;
}

export interface LocationSearchParams {
  org_id?: string;
  type?: 'internal' | 'supplier' | 'consignment';
  is_active?: boolean;
  search?: string;
  supplier_id?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'type' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface LocationSearchResult {
  locations: StockLocation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class LocationService {
  private defaultOrgId = '00000000-0000-0000-0000-000000000000';

  /**
   * Create a new location
   */
  async createLocation(request: CreateLocationRequest): Promise<StockLocation> {
    // Validate request
    const validated = StockLocationSchema.parse({
      name: request.name,
      type: request.type,
      supplier_id: request.supplier_id || null,
      address: request.address || null,
      is_active: request.is_active ?? true,
    });

    // Business rule: supplier_id required for type='supplier'
    if (validated.type === 'supplier' && !validated.supplier_id) {
      throw new Error('supplier_id is required for location type "supplier"');
    }

    const query = `
      INSERT INTO core.stock_location (
        org_id, name, type, supplier_id, address, metadata, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        location_id, org_id, name, type, supplier_id,
        address, metadata, is_active, created_at, updated_at
    `;

    const values = [
      request.org_id || this.defaultOrgId,
      validated.name,
      validated.type,
      validated.supplier_id,
      validated.address,
      JSON.stringify(request.metadata || {}),
      validated.is_active,
    ];

    const result = await dbQuery<StockLocation>(query, values);

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Failed to create location - no rows returned');
    }

    return result.rows[0];
  }

  /**
   * Get location by ID
   */
  async getLocationById(locationId: string): Promise<StockLocation | null> {
    const query = `
      SELECT
        location_id, org_id, name, type, supplier_id,
        address, metadata, is_active, created_at, updated_at
      FROM core.stock_location
      WHERE location_id = $1
    `;

    const result = await dbQuery<StockLocation>(query, [locationId]);

    return result.rows[0] || null;
  }

  /**
   * Update location
   */
  async updateLocation(
    locationId: string,
    request: UpdateLocationRequest
  ): Promise<StockLocation> {
    // Get existing location
    const existing = await this.getLocationById(locationId);
    if (!existing) {
      throw new Error(`Location not found: ${locationId}`);
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (request.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(request.name);
    }

    if (request.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(request.type);

      // Business rule: supplier_id required for type='supplier'
      const finalType = request.type;
      const finalSupplierId = request.supplier_id ?? existing.supplier_id;
      if (finalType === 'supplier' && !finalSupplierId) {
        throw new Error('supplier_id is required for location type "supplier"');
      }
    }

    if (request.supplier_id !== undefined) {
      updates.push(`supplier_id = $${paramIndex++}`);
      values.push(request.supplier_id);
    }

    if (request.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(request.address);
    }

    if (request.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(request.metadata));
    }

    if (request.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(request.is_active);
    }

    if (updates.length === 0) {
      return existing; // No changes
    }

    // Add location_id for WHERE clause
    values.push(locationId);

    const query = `
      UPDATE core.stock_location
      SET ${updates.join(', ')}
      WHERE location_id = $${paramIndex}
      RETURNING
        location_id, org_id, name, type, supplier_id,
        address, metadata, is_active, created_at, updated_at
    `;

    const result = await dbQuery<StockLocation>(query, values);

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Failed to update location - no rows returned');
    }

    return result.rows[0];
  }

  /**
   * Delete location (soft delete by setting is_active = false)
   */
  async deleteLocation(locationId: string, hardDelete = false): Promise<void> {
    if (hardDelete) {
      // Check if location has associated stock records
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM core.stock_on_hand
        WHERE location_id = $1
      `;
      const checkResult = await dbQuery<{ count: string }>(checkQuery, [locationId]);
      const count = parseInt(checkResult.rows[0]?.count || '0');

      if (count > 0) {
        throw new Error(
          `Cannot delete location: ${count} stock records exist. Please reassign or remove stock first.`
        );
      }

      // Hard delete
      const deleteQuery = 'DELETE FROM core.stock_location WHERE location_id = $1';
      await dbQuery(deleteQuery, [locationId]);
    } else {
      // Soft delete
      await this.updateLocation(locationId, { is_active: false });
    }
  }

  /**
   * Search and filter locations with pagination
   */
  async searchLocations(params: LocationSearchParams): Promise<LocationSearchResult> {
    const {
      org_id = this.defaultOrgId,
      type,
      is_active,
      search,
      supplier_id,
      page = 1,
      pageSize = 20,
      sortBy = 'name',
      sortOrder = 'asc',
    } = params;

    // Build WHERE clauses
    const whereClauses: string[] = ['org_id = $1'];
    const values: unknown[] = [org_id];
    let paramIndex = 2;

    if (type) {
      whereClauses.push(`type = $${paramIndex++}`);
      values.push(type);
    }

    if (is_active !== undefined) {
      whereClauses.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (search) {
      whereClauses.push(`(name ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (supplier_id) {
      whereClauses.push(`supplier_id = $${paramIndex++}`);
      values.push(supplier_id);
    }

    const whereClause = whereClauses.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM core.stock_location
      WHERE ${whereClause}
    `;

    const countResult = await dbQuery<{ count: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0]?.count || '0');

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const orderClause = `${sortBy} ${sortOrder.toUpperCase()}`;

    const dataQuery = `
      SELECT
        location_id, org_id, name, type, supplier_id,
        address, metadata, is_active, created_at, updated_at
      FROM core.stock_location
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(pageSize, offset);

    const dataResult = await dbQuery<StockLocation>(dataQuery, values);

    return {
      locations: dataResult.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get all active locations for an organization
   */
  async getActiveLocations(orgId?: string): Promise<StockLocation[]> {
    const result = await this.searchLocations({
      org_id: orgId || this.defaultOrgId,
      is_active: true,
      pageSize: 1000,
    });

    return result.locations;
  }

  /**
   * Get locations by supplier
   */
  async getLocationsBySupplierId(supplierId: string): Promise<StockLocation[]> {
    const query = `
      SELECT
        location_id, org_id, name, type, supplier_id,
        address, metadata, is_active, created_at, updated_at
      FROM core.stock_location
      WHERE supplier_id = $1
      ORDER BY name ASC
    `;

    const result = await dbQuery<StockLocation>(query, [supplierId]);

    return result.rows;
  }

  /**
   * Check if location name is unique within organization
   */
  async isLocationNameUnique(
    name: string,
    orgId?: string,
    excludeLocationId?: string
  ): Promise<boolean> {
    const whereClauses = ['org_id = $1', 'name = $2'];
    const values: unknown[] = [orgId || this.defaultOrgId, name];
    let paramIndex = 3;

    if (excludeLocationId) {
      whereClauses.push(`location_id != $${paramIndex++}`);
      values.push(excludeLocationId);
    }

    const query = `
      SELECT COUNT(*) as count
      FROM core.stock_location
      WHERE ${whereClauses.join(' AND ')}
    `;

    const result = await dbQuery<{ count: string }>(query, values);
    const count = parseInt(result.rows[0]?.count || '0');

    return count === 0;
  }
}

// Export singleton instance
export const locationService = new LocationService();
