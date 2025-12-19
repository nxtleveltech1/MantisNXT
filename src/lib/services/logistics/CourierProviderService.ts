/**
 * Courier Provider Service
 *
 * Handles CRUD operations for courier providers
 */

import { query } from '@/lib/database/unified-connection';
import type {
  CourierProvider,
  CourierProviderInsert,
  CourierProviderStatus,
} from '@/types/logistics';

export class CourierProviderService {
  /**
   * Get all courier providers for an organization
   */
  static async getCourierProviders(
    orgId: string,
    filters?: { status?: CourierProviderStatus }
  ): Promise<CourierProvider[]> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];

      if (filters?.status) {
        conditions.push(`status = $2`);
        params.push(filters.status);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query<CourierProvider>(
        `SELECT * FROM courier_providers ${whereClause} ORDER BY name`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching courier providers:', error);
      throw error;
    }
  }

  /**
   * Get courier provider by ID
   */
  static async getCourierProviderById(
    id: string,
    orgId: string
  ): Promise<CourierProvider | null> {
    try {
      const result = await query<CourierProvider>(
        'SELECT * FROM courier_providers WHERE id = $1 AND org_id = $2',
        [id, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching courier provider:', error);
      throw error;
    }
  }

  /**
   * Get courier provider by code
   */
  static async getCourierProviderByCode(
    code: string,
    orgId: string
  ): Promise<CourierProvider | null> {
    try {
      const result = await query<CourierProvider>(
        'SELECT * FROM courier_providers WHERE code = $1 AND org_id = $2',
        [code, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching courier provider by code:', error);
      throw error;
    }
  }

  /**
   * Get active courier providers
   */
  static async getActiveCourierProviders(orgId: string): Promise<CourierProvider[]> {
    return this.getCourierProviders(orgId, { status: 'active' });
  }

  /**
   * Create a new courier provider
   */
  static async createCourierProvider(data: CourierProviderInsert): Promise<CourierProvider> {
    try {
      const insertSql = `
        INSERT INTO courier_providers (
          org_id, name, code, status, api_endpoint, api_credentials,
          is_default, supports_tracking, supports_quotes, metadata, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
        RETURNING *
      `;

      const result = await query<CourierProvider>(insertSql, [
        data.org_id,
        data.name,
        data.code,
        data.status || 'active',
        data.api_endpoint || null,
        data.api_credentials ? JSON.stringify(data.api_credentials) : '{}',
        data.is_default || false,
        data.supports_tracking !== undefined ? data.supports_tracking : true,
        data.supports_quotes !== undefined ? data.supports_quotes : true,
        data.metadata ? JSON.stringify(data.metadata) : '{}',
        data.created_by || null,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating courier provider:', error);
      throw error;
    }
  }

  /**
   * Update courier provider
   */
  static async updateCourierProvider(
    id: string,
    orgId: string,
    updates: Partial<CourierProviderInsert> & { updated_by?: string }
  ): Promise<CourierProvider> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }

      if (updates.api_endpoint !== undefined) {
        fields.push(`api_endpoint = $${paramIndex++}`);
        values.push(updates.api_endpoint);
      }

      if (updates.api_credentials !== undefined) {
        fields.push(`api_credentials = $${paramIndex++}`);
        values.push(JSON.stringify(updates.api_credentials));
      }

      if (updates.is_default !== undefined) {
        fields.push(`is_default = $${paramIndex++}`);
        values.push(updates.is_default);
      }

      if (updates.supports_tracking !== undefined) {
        fields.push(`supports_tracking = $${paramIndex++}`);
        values.push(updates.supports_tracking);
      }

      if (updates.supports_quotes !== undefined) {
        fields.push(`supports_quotes = $${paramIndex++}`);
        values.push(updates.supports_quotes);
      }

      if (updates.updated_by !== undefined) {
        fields.push(`updated_by = $${paramIndex++}`);
        values.push(updates.updated_by);
      }

      if (fields.length === 0) {
        return (await this.getCourierProviderById(id, orgId))!;
      }

      values.push(id, orgId);
      const updateSql = `
        UPDATE courier_providers
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex++} AND org_id = $${paramIndex++}
        RETURNING *
      `;

      const result = await query<CourierProvider>(updateSql, values);

      if (result.rows.length === 0) {
        throw new Error('Courier provider not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating courier provider:', error);
      throw error;
    }
  }

  /**
   * Delete courier provider
   */
  static async deleteCourierProvider(id: string, orgId: string): Promise<void> {
    try {
      await query('DELETE FROM courier_providers WHERE id = $1 AND org_id = $2', [id, orgId]);
    } catch (error) {
      console.error('Error deleting courier provider:', error);
      throw error;
    }
  }
}



