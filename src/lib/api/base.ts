/**
 * Base API Layer for Real-Time Enterprise Operations
 * Connects all 102 tables to live endpoints with real-time capabilities
 */

import { db } from '../database';
import { EventEmitter } from 'events';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: unknown;
}

export class BaseApiService extends EventEmitter {
  protected tableName: string;
  protected allowedFields: string[];
  protected requiredFields: string[];

  constructor(tableName: string, allowedFields: string[] = [], requiredFields: string[] = []) {
    super();
    this.tableName = tableName;
    this.allowedFields = allowedFields;
    this.requiredFields = requiredFields;
  }

  /**
   * Create new record with real-time notification
   */
  async create<T>(data: Partial<T>): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();

    try {
      // Validate required fields
      this.validateRequiredFields(data);

      // Filter allowed fields only
      const filteredData = this.filterAllowedFields(data);

      // Build insert query
      const fields = Object.keys(filteredData);
      const values = Object.values(filteredData);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      const query = `
        INSERT INTO ${this.tableName} (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await db.query(query, values);
      const createdRecord = result.rows[0];

      // Emit real-time event
      this.emit('created', {
        table: this.tableName,
        record: createdRecord,
        timestamp: new Date().toISOString(),
      });

      // Notify PostgreSQL listeners
      await this.notifyChange('INSERT', createdRecord);

      return {
        success: true,
        data: createdRecord,
        timestamp: new Date().toISOString(),
        requestId,
      };
    } catch (error) {
      console.error(`❌ Error creating ${this.tableName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Get records with pagination and filtering
   */
  async findMany<T>(
    filters: FilterParams = {},
    pagination: PaginationParams = { page: 1, limit: 50 }
  ): Promise<ApiResponse<{ data: T[]; total: number; page: number; totalPages: number }>> {
    const requestId = this.generateRequestId();

    try {
      const offset = (pagination.page - 1) * pagination.limit;

      // Build WHERE clause
      const whereConditions: string[] = [];
      const queryParams: unknown[] = [];
      let paramIndex = 1;

      Object.entries(filters).forEach(([key, value]) => {
        if (this.allowedFields.length === 0 || this.allowedFields.includes(key)) {
          if (value !== undefined && value !== null) {
            whereConditions.push(`${key} = $${paramIndex}`);
            queryParams.push(value);
            paramIndex++;
          }
        }
      });

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const orderBy = pagination.sortBy
        ? `ORDER BY ${pagination.sortBy} ${pagination.sortOrder || 'ASC'}`
        : 'ORDER BY created_at DESC';

      // Count total records
      const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
      const countResult = await db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated data
      const dataQuery = `
        SELECT * FROM ${this.tableName}
        ${whereClause}
        ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const dataResult = await db.query(dataQuery, [...queryParams, pagination.limit, offset]);
      const totalPages = Math.ceil(total / pagination.limit);

      return {
        success: true,
        data: {
          data: dataResult.rows,
          total,
          page: pagination.page,
          totalPages,
        },
        timestamp: new Date().toISOString(),
        requestId,
      };
    } catch (error) {
      console.error(`❌ Error fetching ${this.tableName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Get single record by ID
   */
  async findById<T>(id: string | number): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();

    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: `Record not found in ${this.tableName}`,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }

      return {
        success: true,
        data: result.rows[0],
        timestamp: new Date().toISOString(),
        requestId,
      };
    } catch (error) {
      console.error(`❌ Error fetching ${this.tableName} by ID:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Update record with real-time notification
   */
  async update<T>(id: string | number, data: Partial<T>): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();

    try {
      // Filter allowed fields only
      const filteredData = this.filterAllowedFields(data);

      if (Object.keys(filteredData).length === 0) {
        return {
          success: false,
          error: 'No valid fields to update',
          timestamp: new Date().toISOString(),
          requestId,
        };
      }

      // Add updated_at timestamp
      filteredData.updated_at = new Date().toISOString();

      // Build update query
      const setClause = Object.keys(filteredData)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;

      const result = await db.query(query, [id, ...Object.values(filteredData)]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: `Record not found in ${this.tableName}`,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }

      const updatedRecord = result.rows[0];

      // Emit real-time event
      this.emit('updated', {
        table: this.tableName,
        record: updatedRecord,
        timestamp: new Date().toISOString(),
      });

      // Notify PostgreSQL listeners
      await this.notifyChange('UPDATE', updatedRecord);

      return {
        success: true,
        data: updatedRecord,
        timestamp: new Date().toISOString(),
        requestId,
      };
    } catch (error) {
      console.error(`❌ Error updating ${this.tableName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Delete record with real-time notification
   */
  async delete(id: string | number): Promise<ApiResponse<{ id: string | number }>> {
    const requestId = this.generateRequestId();

    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`;
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: `Record not found in ${this.tableName}`,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }

      // Emit real-time event
      this.emit('deleted', {
        table: this.tableName,
        id: result.rows[0].id,
        timestamp: new Date().toISOString(),
      });

      // Notify PostgreSQL listeners
      await this.notifyChange('DELETE', { id: result.rows[0].id });

      return {
        success: true,
        data: { id: result.rows[0].id },
        timestamp: new Date().toISOString(),
        requestId,
      };
    } catch (error) {
      console.error(`❌ Error deleting ${this.tableName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Execute custom query with real-time capabilities
   */
  async customQuery<T>(query: string, params: unknown[] = []): Promise<ApiResponse<T[]>> {
    const requestId = this.generateRequestId();

    try {
      const result = await db.query(query, params);

      return {
        success: true,
        data: result.rows,
        timestamp: new Date().toISOString(),
        requestId,
      };
    } catch (error) {
      console.error(`❌ Error executing custom query on ${this.tableName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(data: unknown): void {
    for (const field of this.requiredFields) {
      if (!data[field] && data[field] !== 0) {
        throw new Error(`Required field '${field}' is missing`);
      }
    }
  }

  /**
   * Filter only allowed fields
   */
  private filterAllowedFields(data: unknown): unknown {
    if (this.allowedFields.length === 0) {
      return { ...data };
    }

    const filtered: unknown = {};
    for (const field of this.allowedFields) {
      if (data[field] !== undefined) {
        filtered[field] = data[field];
      }
    }
    return filtered;
  }

  /**
   * Notify PostgreSQL listeners about changes
   */
  private async notifyChange(operation: string, record: unknown): Promise<void> {
    try {
      const payload = JSON.stringify({
        operation,
        table: this.tableName,
        record,
        timestamp: new Date().toISOString(),
      });

      await db.query(`NOTIFY table_changes, '${payload}'`);
    } catch (error) {
      console.error('Error sending PostgreSQL notification:', error);
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default BaseApiService;
