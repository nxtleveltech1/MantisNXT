/**
 * Customer Loyalty Service
 *
 * Handles customer loyalty status, points management, and tier operations
 *
 * Author: Backend System Architect
 * Date: 2025-11-02
 */

import { query, withTransaction } from '@/lib/database';
import {
  CustomerLoyalty,
  CustomerLoyaltyInsert,
  CustomerLoyaltyUpdate,
  CustomerRewardsSummary,
  UpdateTierResult,
  LoyaltyError,
} from '@/types/loyalty';

export class CustomerLoyaltyService {
  /**
   * Get customer loyalty record
   */
  static async getCustomerLoyalty(
    customerId: string,
    orgId: string
  ): Promise<CustomerLoyalty | null> {
    try {
      const sql = `
        SELECT
          id,
          org_id,
          customer_id,
          program_id,
          current_tier::text as current_tier,
          tier_qualified_date,
          total_points_earned,
          total_points_redeemed,
          points_balance,
          points_pending,
          lifetime_value,
          referral_count,
          created_at,
          updated_at
        FROM customer_loyalty
        WHERE customer_id = $1 AND org_id = $2
        LIMIT 1
      `;

      const result = await query<CustomerLoyalty>(sql, [customerId, orgId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(
        '[CustomerLoyaltyService] Error fetching customer loyalty:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch customer loyalty',
        'FETCH_CUSTOMER_LOYALTY_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get customer rewards summary using database function
   */
  static async getCustomerRewardsSummary(
    customerId: string,
    orgId: string
  ): Promise<CustomerRewardsSummary | null> {
    try {
      const sql = `
        SELECT * FROM get_customer_rewards_summary($1)
      `;

      const result = await query<CustomerRewardsSummary>(sql, [customerId]);

      if (result.rows.length === 0) {
        return null;
      }

      const summary = result.rows[0];

      // Verify org isolation
      const loyaltyRecord = await this.getCustomerLoyalty(customerId, orgId);
      if (!loyaltyRecord) {
        return null;
      }

      return summary;
    } catch (error) {
      console.error(
        '[CustomerLoyaltyService] Error fetching rewards summary:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch customer rewards summary',
        'FETCH_REWARDS_SUMMARY_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Enroll a customer in a loyalty program
   */
  static async enrollCustomer(
    customerId: string,
    programId: string,
    orgId: string
  ): Promise<CustomerLoyalty> {
    try {
      return await withTransaction(async (client) => {
        // Check if customer already enrolled
        const existingResult = await client.query<CustomerLoyalty>(
          'SELECT * FROM customer_loyalty WHERE customer_id = $1 AND program_id = $2',
          [customerId, programId]
        );

        if (existingResult.rows.length > 0) {
          throw new LoyaltyError(
            'Customer already enrolled in this program',
            'ALREADY_ENROLLED',
            400
          );
        }

        // Verify program exists and is active
        const programResult = await client.query(
          'SELECT id FROM loyalty_program WHERE id = $1 AND org_id = $2 AND is_active = true',
          [programId, orgId]
        );

        if (programResult.rows.length === 0) {
          throw new LoyaltyError(
            'Loyalty program not found or inactive',
            'PROGRAM_NOT_FOUND',
            404
          );
        }

        // Enroll customer
        const sql = `
          INSERT INTO customer_loyalty (
            org_id,
            customer_id,
            program_id,
            current_tier,
            tier_qualified_date,
            total_points_earned,
            total_points_redeemed,
            points_balance,
            points_pending,
            lifetime_value,
            referral_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING
            id,
            org_id,
            customer_id,
            program_id,
            current_tier::text as current_tier,
            tier_qualified_date,
            total_points_earned,
            total_points_redeemed,
            points_balance,
            points_pending,
            lifetime_value,
            referral_count,
            created_at,
            updated_at
        `;

        const result = await client.query<CustomerLoyalty>(sql, [
          orgId,
          customerId,
          programId,
          'bronze',
          new Date(),
          0,
          0,
          0,
          0,
          0,
          0,
        ]);

        return result.rows[0];
      });
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[CustomerLoyaltyService] Error enrolling customer:',
        error
      );
      throw new LoyaltyError(
        'Failed to enroll customer',
        'ENROLL_CUSTOMER_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Update customer loyalty record
   */
  static async updateCustomerLoyalty(
    customerId: string,
    orgId: string,
    updates: CustomerLoyaltyUpdate
  ): Promise<CustomerLoyalty> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.program_id !== undefined) {
        setClauses.push(`program_id = $${paramIndex}`);
        values.push(updates.program_id);
        paramIndex++;
      }

      if (updates.current_tier !== undefined) {
        setClauses.push(`current_tier = $${paramIndex}`);
        values.push(updates.current_tier);
        paramIndex++;
      }

      if (updates.tier_qualified_date !== undefined) {
        setClauses.push(`tier_qualified_date = $${paramIndex}`);
        values.push(updates.tier_qualified_date);
        paramIndex++;
      }

      if (updates.total_points_earned !== undefined) {
        setClauses.push(`total_points_earned = $${paramIndex}`);
        values.push(updates.total_points_earned);
        paramIndex++;
      }

      if (updates.total_points_redeemed !== undefined) {
        setClauses.push(`total_points_redeemed = $${paramIndex}`);
        values.push(updates.total_points_redeemed);
        paramIndex++;
      }

      if (updates.points_balance !== undefined) {
        setClauses.push(`points_balance = $${paramIndex}`);
        values.push(updates.points_balance);
        paramIndex++;
      }

      if (updates.points_pending !== undefined) {
        setClauses.push(`points_pending = $${paramIndex}`);
        values.push(updates.points_pending);
        paramIndex++;
      }

      if (updates.lifetime_value !== undefined) {
        setClauses.push(`lifetime_value = $${paramIndex}`);
        values.push(updates.lifetime_value);
        paramIndex++;
      }

      if (updates.referral_count !== undefined) {
        setClauses.push(`referral_count = $${paramIndex}`);
        values.push(updates.referral_count);
        paramIndex++;
      }

      if (setClauses.length === 0) {
        throw new LoyaltyError('No fields to update', 'NO_UPDATES', 400);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(customerId, orgId);

      const sql = `
        UPDATE customer_loyalty
        SET ${setClauses.join(', ')}
        WHERE customer_id = $${paramIndex} AND org_id = $${paramIndex + 1}
        RETURNING
          id,
          org_id,
          customer_id,
          program_id,
          current_tier::text as current_tier,
          tier_qualified_date,
          total_points_earned,
          total_points_redeemed,
          points_balance,
          points_pending,
          lifetime_value,
          referral_count,
          created_at,
          updated_at
      `;

      const result = await query<CustomerLoyalty>(sql, values);

      if (result.rows.length === 0) {
        throw new LoyaltyError(
          'Customer loyalty record not found',
          'LOYALTY_NOT_FOUND',
          404
        );
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[CustomerLoyaltyService] Error updating customer loyalty:',
        error
      );
      throw new LoyaltyError(
        'Failed to update customer loyalty',
        'UPDATE_CUSTOMER_LOYALTY_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Update customer tier using database function
   */
  static async updateCustomerTier(
    customerId: string,
    orgId: string
  ): Promise<UpdateTierResult> {
    try {
      // Verify customer belongs to org
      const loyaltyRecord = await this.getCustomerLoyalty(customerId, orgId);
      if (!loyaltyRecord) {
        throw new LoyaltyError(
          'Customer loyalty record not found',
          'LOYALTY_NOT_FOUND',
          404
        );
      }

      const sql = `SELECT * FROM update_customer_tier($1)`;
      const result = await query<UpdateTierResult>(sql, [customerId]);

      if (result.rows.length === 0) {
        throw new LoyaltyError(
          'Failed to update customer tier',
          'UPDATE_TIER_ERROR',
          500
        );
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[CustomerLoyaltyService] Error updating customer tier:',
        error
      );
      throw new LoyaltyError(
        'Failed to update customer tier',
        'UPDATE_TIER_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get customers by tier
   */
  static async getCustomersByTier(
    tier: string,
    orgId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ data: CustomerLoyalty[]; count: number }> {
    try {
      const { limit = 50, offset = 0 } = options;

      // Count query
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM customer_loyalty
         WHERE org_id = $1 AND current_tier = $2`,
        [orgId, tier]
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Data query
      const sql = `
        SELECT
          id,
          org_id,
          customer_id,
          program_id,
          current_tier::text as current_tier,
          tier_qualified_date,
          total_points_earned,
          total_points_redeemed,
          points_balance,
          points_pending,
          lifetime_value,
          referral_count,
          created_at,
          updated_at
        FROM customer_loyalty
        WHERE org_id = $1 AND current_tier = $2
        ORDER BY total_points_earned DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await query<CustomerLoyalty>(sql, [
        orgId,
        tier,
        limit,
        offset,
      ]);

      return { data: result.rows, count };
    } catch (error) {
      console.error(
        '[CustomerLoyaltyService] Error fetching customers by tier:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch customers by tier',
        'FETCH_BY_TIER_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get top customers by points
   */
  static async getTopCustomers(
    orgId: string,
    options: { limit?: number; programId?: string } = {}
  ): Promise<CustomerLoyalty[]> {
    try {
      const { limit = 10, programId } = options;

      const conditions: string[] = ['org_id = $1'];
      const params: any[] = [orgId];

      if (programId) {
        conditions.push('program_id = $2');
        params.push(programId);
      }

      params.push(limit);

      const sql = `
        SELECT
          id,
          org_id,
          customer_id,
          program_id,
          current_tier::text as current_tier,
          tier_qualified_date,
          total_points_earned,
          total_points_redeemed,
          points_balance,
          points_pending,
          lifetime_value,
          referral_count,
          created_at,
          updated_at
        FROM customer_loyalty
        WHERE ${conditions.join(' AND ')}
        ORDER BY total_points_earned DESC
        LIMIT $${params.length}
      `;

      const result = await query<CustomerLoyalty>(sql, params);
      return result.rows;
    } catch (error) {
      console.error(
        '[CustomerLoyaltyService] Error fetching top customers:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch top customers',
        'FETCH_TOP_CUSTOMERS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Update customer lifetime value
   */
  static async updateLifetimeValue(
    customerId: string,
    orgId: string,
    orderAmount: number
  ): Promise<CustomerLoyalty> {
    try {
      const sql = `
        UPDATE customer_loyalty
        SET
          lifetime_value = lifetime_value + $1,
          updated_at = NOW()
        WHERE customer_id = $2 AND org_id = $3
        RETURNING
          id,
          org_id,
          customer_id,
          program_id,
          current_tier::text as current_tier,
          tier_qualified_date,
          total_points_earned,
          total_points_redeemed,
          points_balance,
          points_pending,
          lifetime_value,
          referral_count,
          created_at,
          updated_at
      `;

      const result = await query<CustomerLoyalty>(sql, [
        orderAmount,
        customerId,
        orgId,
      ]);

      if (result.rows.length === 0) {
        throw new LoyaltyError(
          'Customer loyalty record not found',
          'LOYALTY_NOT_FOUND',
          404
        );
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[CustomerLoyaltyService] Error updating lifetime value:',
        error
      );
      throw new LoyaltyError(
        'Failed to update lifetime value',
        'UPDATE_LIFETIME_VALUE_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Increment referral count
   */
  static async incrementReferralCount(
    customerId: string,
    orgId: string
  ): Promise<CustomerLoyalty> {
    try {
      const sql = `
        UPDATE customer_loyalty
        SET
          referral_count = referral_count + 1,
          updated_at = NOW()
        WHERE customer_id = $1 AND org_id = $2
        RETURNING
          id,
          org_id,
          customer_id,
          program_id,
          current_tier::text as current_tier,
          tier_qualified_date,
          total_points_earned,
          total_points_redeemed,
          points_balance,
          points_pending,
          lifetime_value,
          referral_count,
          created_at,
          updated_at
      `;

      const result = await query<CustomerLoyalty>(sql, [customerId, orgId]);

      if (result.rows.length === 0) {
        throw new LoyaltyError(
          'Customer loyalty record not found',
          'LOYALTY_NOT_FOUND',
          404
        );
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[CustomerLoyaltyService] Error incrementing referral count:',
        error
      );
      throw new LoyaltyError(
        'Failed to increment referral count',
        'INCREMENT_REFERRAL_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get all loyalty customers for a program
   */
  static async getProgramCustomers(
    programId: string,
    orgId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ data: CustomerLoyalty[]; count: number }> {
    try {
      const { limit = 50, offset = 0 } = options;

      // Count query
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM customer_loyalty
         WHERE program_id = $1 AND org_id = $2`,
        [programId, orgId]
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Data query
      const sql = `
        SELECT
          id,
          org_id,
          customer_id,
          program_id,
          current_tier::text as current_tier,
          tier_qualified_date,
          total_points_earned,
          total_points_redeemed,
          points_balance,
          points_pending,
          lifetime_value,
          referral_count,
          created_at,
          updated_at
        FROM customer_loyalty
        WHERE program_id = $1 AND org_id = $2
        ORDER BY total_points_earned DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await query<CustomerLoyalty>(sql, [
        programId,
        orgId,
        limit,
        offset,
      ]);

      return { data: result.rows, count };
    } catch (error) {
      console.error(
        '[CustomerLoyaltyService] Error fetching program customers:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch program customers',
        'FETCH_PROGRAM_CUSTOMERS_ERROR',
        500,
        { error }
      );
    }
  }
}
