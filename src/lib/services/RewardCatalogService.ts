/**
 * Reward Catalog Service
 *
 * Manages reward catalog including CRUD operations, stock management,
 * availability checks, and reward analytics.
 *
 * Author: Backend System Architect
 * Date: 2025-11-02
 */

import { query, withTransaction } from '@/lib/database';
import type {
  RewardCatalog,
  RewardCatalogInsert,
  RewardCatalogUpdate,
  RewardAnalytics,
  RewardType} from '@/types/loyalty';
import {
  LoyaltyError,
} from '@/types/loyalty';

// ============================================================================
// TYPES FOR SERVICE METHODS
// ============================================================================

export interface CreateRewardData extends RewardCatalogInsert {
  // All fields from RewardCatalogInsert
}

export interface UpdateRewardData extends RewardCatalogUpdate {
  // All fields from RewardCatalogUpdate
}

export interface RewardFilters {
  rewardType?: RewardType;
  isActive?: boolean;
  isFeatured?: boolean;
  programId?: string;
  minPoints?: number;
  maxPoints?: number;
  inStock?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface AvailabilityStatus {
  available: boolean;
  reason?: string;
  inStock: boolean;
  stockQuantity?: number;
  isActive: boolean;
  isValid: boolean;
  validFrom: Date;
  validUntil?: Date;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class RewardCatalogService {
  /**
   * Create a new reward in the catalog
   */
  static async createReward(
    data: CreateRewardData,
    orgId: string
  ): Promise<RewardCatalog> {
    try {
      return await withTransaction(async (client) => {
        // Validate image URL if provided
        if (data.image_url) {
          this.validateImageUrl(data.image_url);
        }

        // Verify program exists if program_id provided
        if (data.program_id) {
          const programCheck = await client.query(
            `SELECT id FROM loyalty_program
             WHERE id = $1 AND org_id = $2 AND is_active = true`,
            [data.program_id, orgId]
          );

          if (programCheck.rows.length === 0) {
            throw new LoyaltyError(
              'Loyalty program not found or inactive',
              'PROGRAM_NOT_FOUND',
              404
            );
          }
        }

        const sql = `
          INSERT INTO reward_catalog (
            org_id,
            program_id,
            name,
            description,
            reward_type,
            points_required,
            monetary_value,
            max_redemptions_per_customer,
            stock_quantity,
            is_active,
            is_featured,
            valid_from,
            valid_until,
            terms_conditions,
            image_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING
            id,
            org_id,
            program_id,
            name,
            description,
            reward_type::text as reward_type,
            points_required,
            monetary_value,
            max_redemptions_per_customer,
            stock_quantity,
            redemption_count,
            is_active,
            is_featured,
            valid_from,
            valid_until,
            terms_conditions,
            image_url,
            created_at,
            updated_at
        `;

        const result = await client.query<RewardCatalog>(sql, [
          orgId,
          data.program_id || null,
          data.name,
          data.description || null,
          data.reward_type,
          data.points_required,
          data.monetary_value || null,
          data.max_redemptions_per_customer || null,
          data.stock_quantity || null,
          data.is_active ?? true,
          data.is_featured ?? false,
          data.valid_from || new Date(),
          data.valid_until || null,
          data.terms_conditions ? JSON.stringify(data.terms_conditions) : '{}',
          data.image_url || null,
        ]);

        return result.rows[0];
      });
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[RewardCatalogService] Error creating reward:', error);
      throw new LoyaltyError(
        'Failed to create reward',
        'CREATE_REWARD_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Update an existing reward
   */
  static async updateReward(
    rewardId: string,
    data: UpdateRewardData,
    orgId: string
  ): Promise<RewardCatalog> {
    try {
      // Validate image URL if provided
      if (data.image_url) {
        this.validateImageUrl(data.image_url);
      }

      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        setClauses.push(`name = $${paramIndex}`);
        values.push(data.name);
        paramIndex++;
      }

      if (data.description !== undefined) {
        setClauses.push(`description = $${paramIndex}`);
        values.push(data.description);
        paramIndex++;
      }

      if (data.reward_type !== undefined) {
        setClauses.push(`reward_type = $${paramIndex}`);
        values.push(data.reward_type);
        paramIndex++;
      }

      if (data.points_required !== undefined) {
        setClauses.push(`points_required = $${paramIndex}`);
        values.push(data.points_required);
        paramIndex++;
      }

      if (data.monetary_value !== undefined) {
        setClauses.push(`monetary_value = $${paramIndex}`);
        values.push(data.monetary_value);
        paramIndex++;
      }

      if (data.max_redemptions_per_customer !== undefined) {
        setClauses.push(`max_redemptions_per_customer = $${paramIndex}`);
        values.push(data.max_redemptions_per_customer);
        paramIndex++;
      }

      if (data.stock_quantity !== undefined) {
        setClauses.push(`stock_quantity = $${paramIndex}`);
        values.push(data.stock_quantity);
        paramIndex++;
      }

      if (data.is_active !== undefined) {
        setClauses.push(`is_active = $${paramIndex}`);
        values.push(data.is_active);
        paramIndex++;
      }

      if (data.is_featured !== undefined) {
        setClauses.push(`is_featured = $${paramIndex}`);
        values.push(data.is_featured);
        paramIndex++;
      }

      if (data.valid_from !== undefined) {
        setClauses.push(`valid_from = $${paramIndex}`);
        values.push(data.valid_from);
        paramIndex++;
      }

      if (data.valid_until !== undefined) {
        setClauses.push(`valid_until = $${paramIndex}`);
        values.push(data.valid_until);
        paramIndex++;
      }

      if (data.terms_conditions !== undefined) {
        setClauses.push(`terms_conditions = $${paramIndex}`);
        values.push(JSON.stringify(data.terms_conditions));
        paramIndex++;
      }

      if (data.image_url !== undefined) {
        setClauses.push(`image_url = $${paramIndex}`);
        values.push(data.image_url);
        paramIndex++;
      }

      if (setClauses.length === 0) {
        throw new LoyaltyError('No fields to update', 'NO_UPDATES', 400);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(rewardId, orgId);

      const sql = `
        UPDATE reward_catalog
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}
        RETURNING
          id,
          org_id,
          program_id,
          name,
          description,
          reward_type::text as reward_type,
          points_required,
          monetary_value,
          max_redemptions_per_customer,
          stock_quantity,
          redemption_count,
          is_active,
          is_featured,
          valid_from,
          valid_until,
          terms_conditions,
          image_url,
          created_at,
          updated_at
      `;

      const result = await query<RewardCatalog>(sql, values);

      if (result.rows.length === 0) {
        throw new LoyaltyError('Reward not found', 'REWARD_NOT_FOUND', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[RewardCatalogService] Error updating reward:', error);
      throw new LoyaltyError(
        'Failed to update reward',
        'UPDATE_REWARD_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Delete a reward from the catalog
   */
  static async deleteReward(rewardId: string, orgId: string): Promise<void> {
    try {
      // Check if reward has any redemptions
      const redemptionCheck = await query(
        `SELECT COUNT(*) as count
         FROM reward_redemption
         WHERE reward_id = $1`,
        [rewardId]
      );

      const redemptionCount = parseInt(
        redemptionCheck.rows[0]?.count || '0',
        10
      );

      if (redemptionCount > 0) {
        throw new LoyaltyError(
          'Cannot delete reward with existing redemptions. Set is_active to false instead.',
          'REWARD_HAS_REDEMPTIONS',
          400
        );
      }

      const result = await query(
        `DELETE FROM reward_catalog WHERE id = $1 AND org_id = $2`,
        [rewardId, orgId]
      );

      if (result.rowCount === 0) {
        throw new LoyaltyError('Reward not found', 'REWARD_NOT_FOUND', 404);
      }
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[RewardCatalogService] Error deleting reward:', error);
      throw new LoyaltyError(
        'Failed to delete reward',
        'DELETE_REWARD_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get reward by ID
   */
  static async getRewardById(
    rewardId: string,
    orgId: string
  ): Promise<RewardCatalog> {
    try {
      const sql = `
        SELECT
          id,
          org_id,
          program_id,
          name,
          description,
          reward_type::text as reward_type,
          points_required,
          monetary_value,
          max_redemptions_per_customer,
          stock_quantity,
          redemption_count,
          is_active,
          is_featured,
          valid_from,
          valid_until,
          terms_conditions,
          image_url,
          created_at,
          updated_at
        FROM reward_catalog
        WHERE id = $1 AND org_id = $2
      `;

      const result = await query<RewardCatalog>(sql, [rewardId, orgId]);

      if (result.rows.length === 0) {
        throw new LoyaltyError('Reward not found', 'REWARD_NOT_FOUND', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[RewardCatalogService] Error fetching reward:', error);
      throw new LoyaltyError(
        'Failed to fetch reward',
        'FETCH_REWARD_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * List rewards with optional filters and pagination
   */
  static async listRewards(
    orgId: string,
    filters: RewardFilters = {},
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResult<RewardCatalog>> {
    try {
      const { limit = 50, offset = 0 } = options;
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (filters.rewardType) {
        conditions.push(`reward_type = $${paramIndex}`);
        params.push(filters.rewardType);
        paramIndex++;
      }

      if (filters.isActive !== undefined) {
        conditions.push(`is_active = $${paramIndex}`);
        params.push(filters.isActive);
        paramIndex++;
      }

      if (filters.isFeatured !== undefined) {
        conditions.push(`is_featured = $${paramIndex}`);
        params.push(filters.isFeatured);
        paramIndex++;
      }

      if (filters.programId) {
        conditions.push(
          `(program_id = $${paramIndex} OR program_id IS NULL)`
        );
        params.push(filters.programId);
        paramIndex++;
      }

      if (filters.minPoints !== undefined) {
        conditions.push(`points_required >= $${paramIndex}`);
        params.push(filters.minPoints);
        paramIndex++;
      }

      if (filters.maxPoints !== undefined) {
        conditions.push(`points_required <= $${paramIndex}`);
        params.push(filters.maxPoints);
        paramIndex++;
      }

      if (filters.inStock) {
        conditions.push(`(stock_quantity IS NULL OR stock_quantity > 0)`);
      }

      // Count query
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM reward_catalog WHERE ${conditions.join(' AND ')}`,
        params
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Data query
      params.push(limit, offset);

      const sql = `
        SELECT
          id,
          org_id,
          program_id,
          name,
          description,
          reward_type::text as reward_type,
          points_required,
          monetary_value,
          max_redemptions_per_customer,
          stock_quantity,
          redemption_count,
          is_active,
          is_featured,
          valid_from,
          valid_until,
          terms_conditions,
          image_url,
          created_at,
          updated_at
        FROM reward_catalog
        WHERE ${conditions.join(' AND ')}
        ORDER BY is_featured DESC, points_required ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await query<RewardCatalog>(sql, params);

      return {
        data: result.rows,
        count,
        limit,
        offset,
        hasMore: offset + limit < count,
      };
    } catch (error) {
      console.error('[RewardCatalogService] Error listing rewards:', error);
      throw new LoyaltyError(
        'Failed to list rewards',
        'LIST_REWARDS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get available rewards for a customer (based on their points balance)
   */
  static async getAvailableRewardsForCustomer(
    customerId: string,
    orgId: string
  ): Promise<RewardCatalog[]> {
    try {
      const sql = `
        SELECT
          rc.id,
          rc.org_id,
          rc.program_id,
          rc.name,
          rc.description,
          rc.reward_type::text as reward_type,
          rc.points_required,
          rc.monetary_value,
          rc.max_redemptions_per_customer,
          rc.stock_quantity,
          rc.redemption_count,
          rc.is_active,
          rc.is_featured,
          rc.valid_from,
          rc.valid_until,
          rc.terms_conditions,
          rc.image_url,
          rc.created_at,
          rc.updated_at
        FROM reward_catalog rc
        JOIN customer_loyalty cl ON (rc.program_id = cl.program_id OR rc.program_id IS NULL)
        WHERE cl.customer_id = $1
          AND cl.org_id = $2
          AND rc.org_id = $2
          AND rc.is_active = true
          AND rc.points_required <= cl.points_balance
          AND (rc.valid_from IS NULL OR rc.valid_from <= NOW())
          AND (rc.valid_until IS NULL OR rc.valid_until > NOW())
          AND (rc.stock_quantity IS NULL OR rc.stock_quantity > 0)
        ORDER BY rc.is_featured DESC, rc.points_required ASC
      `;

      const result = await query<RewardCatalog>(sql, [customerId, orgId]);
      return result.rows;
    } catch (error) {
      console.error(
        '[RewardCatalogService] Error fetching available rewards:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch available rewards',
        'FETCH_AVAILABLE_REWARDS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get featured rewards
   */
  static async getFeaturedRewards(orgId: string): Promise<RewardCatalog[]> {
    try {
      const sql = `
        SELECT
          id,
          org_id,
          program_id,
          name,
          description,
          reward_type::text as reward_type,
          points_required,
          monetary_value,
          max_redemptions_per_customer,
          stock_quantity,
          redemption_count,
          is_active,
          is_featured,
          valid_from,
          valid_until,
          terms_conditions,
          image_url,
          created_at,
          updated_at
        FROM reward_catalog
        WHERE org_id = $1
          AND is_featured = true
          AND is_active = true
          AND (valid_from IS NULL OR valid_from <= NOW())
          AND (valid_until IS NULL OR valid_until > NOW())
        ORDER BY points_required ASC
      `;

      const result = await query<RewardCatalog>(sql, [orgId]);
      return result.rows;
    } catch (error) {
      console.error(
        '[RewardCatalogService] Error fetching featured rewards:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch featured rewards',
        'FETCH_FEATURED_REWARDS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Update stock quantity
   */
  static async updateStock(
    rewardId: string,
    quantity: number,
    orgId: string
  ): Promise<void> {
    try {
      if (quantity < 0) {
        throw new LoyaltyError(
          'Stock quantity cannot be negative',
          'INVALID_STOCK_QUANTITY',
          400
        );
      }

      const result = await query(
        `UPDATE reward_catalog
         SET stock_quantity = $1, updated_at = NOW()
         WHERE id = $2 AND org_id = $3`,
        [quantity, rewardId, orgId]
      );

      if (result.rowCount === 0) {
        throw new LoyaltyError('Reward not found', 'REWARD_NOT_FOUND', 404);
      }
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[RewardCatalogService] Error updating stock:', error);
      throw new LoyaltyError(
        'Failed to update stock',
        'UPDATE_STOCK_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Check reward availability
   */
  static async checkAvailability(
    rewardId: string,
    orgId: string
  ): Promise<AvailabilityStatus> {
    try {
      const reward = await this.getRewardById(rewardId, orgId);

      const now = new Date();
      const isValid =
        (!reward.valid_from || new Date(reward.valid_from) <= now) &&
        (!reward.valid_until || new Date(reward.valid_until) > now);

      const inStock =
        reward.stock_quantity === null || reward.stock_quantity > 0;

      const available = reward.is_active && isValid && inStock;

      let reason: string | undefined;
      if (!reward.is_active) reason = 'Reward is inactive';
      else if (!isValid) reason = 'Reward is not valid at this time';
      else if (!inStock) reason = 'Reward is out of stock';

      return {
        available,
        reason,
        inStock,
        stockQuantity: reward.stock_quantity ?? undefined,
        isActive: reward.is_active,
        isValid,
        validFrom: reward.valid_from,
        validUntil: reward.valid_until ?? undefined,
      };
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[RewardCatalogService] Error checking availability:',
        error
      );
      throw new LoyaltyError(
        'Failed to check reward availability',
        'CHECK_AVAILABILITY_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get reward analytics using the database view
   */
  static async getRewardAnalytics(orgId: string): Promise<RewardAnalytics[]> {
    try {
      const sql = `
        SELECT
          org_id,
          reward_id,
          reward_name,
          reward_type::text as reward_type,
          points_required,
          monetary_value,
          is_active,
          is_featured,
          stock_quantity,
          redemption_count,
          total_redemptions,
          unique_customers,
          fulfilled_redemptions,
          pending_redemptions,
          cancelled_redemptions,
          total_points_spent,
          total_monetary_value,
          redemptions_last_30_days,
          redemptions_last_90_days,
          avg_fulfillment_hours,
          daily_redemption_rate
        FROM reward_analytics
        WHERE org_id = $1
        ORDER BY total_redemptions DESC
      `;

      const result = await query<RewardAnalytics>(sql, [orgId]);
      return result.rows;
    } catch (error) {
      console.error(
        '[RewardCatalogService] Error fetching reward analytics:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch reward analytics',
        'FETCH_ANALYTICS_ERROR',
        500,
        { error }
      );
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate image URL format
   */
  private static validateImageUrl(url: string): void {
    if (!/^https?:\/\/.+/.test(url)) {
      throw new LoyaltyError(
        'Invalid image URL format. Must start with http:// or https://',
        'INVALID_IMAGE_URL',
        400
      );
    }
  }
}
