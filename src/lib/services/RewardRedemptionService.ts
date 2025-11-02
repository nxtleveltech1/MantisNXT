/**
 * Reward Redemption Service
 *
 * Manages the complete reward redemption lifecycle including redeem, approve,
 * fulfill, and cancel operations with comprehensive validation and tracking.
 *
 * Author: Backend System Architect
 * Date: 2025-11-02
 */

import { query, withTransaction } from '@/lib/database';
import {
  RewardRedemption,
  RewardRedemptionInsert,
  RewardRedemptionUpdate,
  RedeemRewardResult,
  RedemptionStatus,
  LoyaltyError,
  InsufficientPointsError,
  RewardNotAvailableError,
  RedemptionLimitReachedError,
} from '@/types/loyalty';

// ============================================================================
// TYPES FOR SERVICE METHODS
// ============================================================================

export interface RedemptionOptions {
  redemptionExpiryDays?: number;
  notes?: string;
}

export interface RedemptionResult {
  success: boolean;
  redemptionId?: string;
  redemptionCode?: string;
  errorMessage?: string;
  redemption?: RewardRedemption;
}

export interface BulkResult {
  success: number;
  failed: number;
  errors: Array<{ index: number; redemptionId: string; error: string }>;
}

export interface RedemptionFilters {
  status?: RedemptionStatus;
  customerId?: string;
  rewardId?: string;
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class RewardRedemptionService {
  /**
   * Redeem a reward for a customer using database function
   */
  static async redeemReward(
    customerId: string,
    rewardId: string,
    orgId: string,
    options: RedemptionOptions = {}
  ): Promise<RedemptionResult> {
    try {
      // Verify customer belongs to org
      const customerCheck = await query(
        `SELECT id FROM customer_loyalty WHERE customer_id = $1 AND org_id = $2`,
        [customerId, orgId]
      );

      if (customerCheck.rows.length === 0) {
        throw new LoyaltyError(
          'Customer not found in organization',
          'CUSTOMER_NOT_FOUND',
          404
        );
      }

      // Verify reward belongs to org
      const rewardCheck = await query(
        `SELECT id FROM reward_catalog WHERE id = $1 AND org_id = $2`,
        [rewardId, orgId]
      );

      if (rewardCheck.rows.length === 0) {
        throw new LoyaltyError(
          'Reward not found in organization',
          'REWARD_NOT_FOUND',
          404
        );
      }

      return await withTransaction(async (client) => {
        // Call database function for redemption
        const sql = `
          SELECT
            success,
            redemption_id,
            redemption_code,
            error_message
          FROM redeem_reward($1, $2, $3)
        `;

        const result = await client.query<RedeemRewardResult>(sql, [
          customerId,
          rewardId,
          options.redemptionExpiryDays || 30,
        ]);

        const dbResult = result.rows[0];

        if (!dbResult.success) {
          // Map error messages to specific error types
          if (dbResult.error_message?.includes('Insufficient points')) {
            const match = dbResult.error_message.match(
              /Required: (\d+), Available: (\d+)/
            );
            if (match) {
              throw new InsufficientPointsError(
                parseInt(match[1]),
                parseInt(match[2])
              );
            }
          } else if (dbResult.error_message?.includes('out of stock')) {
            throw new RewardNotAvailableError('Out of stock');
          } else if (
            dbResult.error_message?.includes('Maximum redemptions')
          ) {
            throw new RedemptionLimitReachedError(0);
          }

          return {
            success: false,
            errorMessage: dbResult.error_message || 'Unknown error',
          };
        }

        // Fetch the complete redemption record
        const redemption = await this.getRedemptionById(
          dbResult.redemption_id!,
          orgId
        );

        return {
          success: true,
          redemptionId: dbResult.redemption_id!,
          redemptionCode: dbResult.redemption_code!,
          redemption,
        };
      });
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[RewardRedemptionService] Error redeeming reward:',
        error
      );
      throw new LoyaltyError(
        'Failed to redeem reward',
        'REDEEM_REWARD_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Approve a pending redemption
   */
  static async approveRedemption(
    redemptionId: string,
    approverId: string,
    orgId: string
  ): Promise<void> {
    try {
      const redemption = await this.getRedemptionById(redemptionId, orgId);

      if (redemption.status !== 'pending') {
        throw new LoyaltyError(
          `Cannot approve redemption with status: ${redemption.status}`,
          'INVALID_STATUS',
          400
        );
      }

      await query(
        `UPDATE reward_redemption
         SET status = 'approved', updated_at = NOW()
         WHERE id = $1 AND org_id = $2`,
        [redemptionId, orgId]
      );

      console.log(
        `[RewardRedemptionService] Redemption ${redemptionId} approved by ${approverId}`
      );
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[RewardRedemptionService] Error approving redemption:',
        error
      );
      throw new LoyaltyError(
        'Failed to approve redemption',
        'APPROVE_REDEMPTION_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Fulfill an approved redemption
   */
  static async fulfillRedemption(
    redemptionId: string,
    fulfillerId: string,
    orgId: string,
    notes?: string
  ): Promise<void> {
    try {
      const redemption = await this.getRedemptionById(redemptionId, orgId);

      if (redemption.status !== 'approved' && redemption.status !== 'pending') {
        throw new LoyaltyError(
          `Cannot fulfill redemption with status: ${redemption.status}`,
          'INVALID_STATUS',
          400
        );
      }

      await query(
        `UPDATE reward_redemption
         SET
           status = 'fulfilled',
           fulfilled_at = NOW(),
           fulfilled_by = $1,
           fulfillment_notes = $2
         WHERE id = $3 AND org_id = $4`,
        [fulfillerId, notes || null, redemptionId, orgId]
      );

      console.log(
        `[RewardRedemptionService] Redemption ${redemptionId} fulfilled by ${fulfillerId}`
      );
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[RewardRedemptionService] Error fulfilling redemption:',
        error
      );
      throw new LoyaltyError(
        'Failed to fulfill redemption',
        'FULFILL_REDEMPTION_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Cancel a redemption and refund points
   */
  static async cancelRedemption(
    redemptionId: string,
    reason: string,
    orgId: string
  ): Promise<void> {
    try {
      return await withTransaction(async (client) => {
        const redemption = await this.getRedemptionById(redemptionId, orgId);

        if (redemption.status === 'fulfilled') {
          throw new LoyaltyError(
            'Cannot cancel fulfilled redemption',
            'INVALID_STATUS',
            400
          );
        }

        if (redemption.status === 'cancelled') {
          throw new LoyaltyError(
            'Redemption already cancelled',
            'ALREADY_CANCELLED',
            400
          );
        }

        // Update redemption status
        await client.query(
          `UPDATE reward_redemption
           SET status = 'cancelled', fulfillment_notes = $1
           WHERE id = $2 AND org_id = $3`,
          [reason, redemptionId, orgId]
        );

        // Refund points to customer
        await client.query(
          `INSERT INTO loyalty_transaction (
             org_id,
             customer_id,
             program_id,
             transaction_type,
             points_amount,
             reference_type,
             reference_id,
             description,
             metadata
           )
           SELECT
             cl.org_id,
             cl.customer_id,
             cl.program_id,
             'adjust',
             rr.points_spent,
             'redemption',
             rr.id,
             'Redemption cancelled: ' || $1,
             jsonb_build_object('original_redemption_id', rr.id)
           FROM reward_redemption rr
           JOIN customer_loyalty cl ON rr.customer_id = cl.customer_id
           WHERE rr.id = $2`,
          [reason, redemptionId]
        );

        // Update customer loyalty balance
        await client.query(
          `UPDATE customer_loyalty cl
           SET
             total_points_redeemed = total_points_redeemed - rr.points_spent,
             points_balance = points_balance + rr.points_spent,
             updated_at = NOW()
           FROM reward_redemption rr
           WHERE cl.customer_id = rr.customer_id
             AND rr.id = $1`,
          [redemptionId]
        );

        // Update reward stock and redemption count
        await client.query(
          `UPDATE reward_catalog rc
           SET
             stock_quantity = CASE
               WHEN stock_quantity IS NOT NULL THEN stock_quantity + 1
               ELSE NULL
             END,
             redemption_count = redemption_count - 1,
             updated_at = NOW()
           FROM reward_redemption rr
           WHERE rc.id = rr.reward_id
             AND rr.id = $1`,
          [redemptionId]
        );

        console.log(
          `[RewardRedemptionService] Redemption ${redemptionId} cancelled: ${reason}`
        );
      });
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[RewardRedemptionService] Error cancelling redemption:',
        error
      );
      throw new LoyaltyError(
        'Failed to cancel redemption',
        'CANCEL_REDEMPTION_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get redemption by ID
   */
  static async getRedemptionById(
    redemptionId: string,
    orgId: string
  ): Promise<RewardRedemption> {
    try {
      const sql = `
        SELECT
          id,
          org_id,
          customer_id,
          reward_id,
          points_spent,
          monetary_value_used,
          status::text as status,
          redemption_code,
          redeemed_at,
          expires_at,
          fulfilled_at,
          fulfilled_by,
          fulfillment_notes,
          created_at
        FROM reward_redemption
        WHERE id = $1 AND org_id = $2
      `;

      const result = await query<RewardRedemption>(sql, [redemptionId, orgId]);

      if (result.rows.length === 0) {
        throw new LoyaltyError(
          'Redemption not found',
          'REDEMPTION_NOT_FOUND',
          404
        );
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[RewardRedemptionService] Error fetching redemption:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch redemption',
        'FETCH_REDEMPTION_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get all redemptions for a customer
   */
  static async getCustomerRedemptions(
    customerId: string,
    orgId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<RewardRedemption[]> {
    try {
      const { limit = 50, offset = 0 } = options;

      // Verify customer belongs to org
      const customerCheck = await query(
        `SELECT id FROM customer_loyalty WHERE customer_id = $1 AND org_id = $2`,
        [customerId, orgId]
      );

      if (customerCheck.rows.length === 0) {
        throw new LoyaltyError(
          'Customer not found in organization',
          'CUSTOMER_NOT_FOUND',
          404
        );
      }

      const sql = `
        SELECT
          id,
          org_id,
          customer_id,
          reward_id,
          points_spent,
          monetary_value_used,
          status::text as status,
          redemption_code,
          redeemed_at,
          expires_at,
          fulfilled_at,
          fulfilled_by,
          fulfillment_notes,
          created_at
        FROM reward_redemption
        WHERE customer_id = $1 AND org_id = $2
        ORDER BY redeemed_at DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await query<RewardRedemption>(sql, [
        customerId,
        orgId,
        limit,
        offset,
      ]);

      return result.rows;
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[RewardRedemptionService] Error fetching customer redemptions:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch customer redemptions',
        'FETCH_CUSTOMER_REDEMPTIONS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get pending redemptions for an organization
   */
  static async getPendingRedemptions(
    orgId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<RewardRedemption[]> {
    try {
      const { limit = 50, offset = 0 } = options;

      const sql = `
        SELECT
          id,
          org_id,
          customer_id,
          reward_id,
          points_spent,
          monetary_value_used,
          status::text as status,
          redemption_code,
          redeemed_at,
          expires_at,
          fulfilled_at,
          fulfilled_by,
          fulfillment_notes,
          created_at
        FROM reward_redemption
        WHERE org_id = $1 AND status = 'pending'
        ORDER BY redeemed_at ASC
        LIMIT $2 OFFSET $3
      `;

      const result = await query<RewardRedemption>(sql, [orgId, limit, offset]);

      return result.rows;
    } catch (error) {
      console.error(
        '[RewardRedemptionService] Error fetching pending redemptions:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch pending redemptions',
        'FETCH_PENDING_REDEMPTIONS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get redemptions by status
   */
  static async getRedemptionsByStatus(
    status: RedemptionStatus,
    orgId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<RewardRedemption[]> {
    try {
      const { limit = 50, offset = 0 } = options;

      const sql = `
        SELECT
          id,
          org_id,
          customer_id,
          reward_id,
          points_spent,
          monetary_value_used,
          status::text as status,
          redemption_code,
          redeemed_at,
          expires_at,
          fulfilled_at,
          fulfilled_by,
          fulfillment_notes,
          created_at
        FROM reward_redemption
        WHERE org_id = $1 AND status = $2
        ORDER BY redeemed_at DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await query<RewardRedemption>(sql, [
        orgId,
        status,
        limit,
        offset,
      ]);

      return result.rows;
    } catch (error) {
      console.error(
        '[RewardRedemptionService] Error fetching redemptions by status:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch redemptions by status',
        'FETCH_BY_STATUS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Bulk approve redemptions
   */
  static async bulkApprove(
    redemptionIds: string[],
    approverId: string,
    orgId: string
  ): Promise<BulkResult> {
    const result: BulkResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < redemptionIds.length; i++) {
      try {
        await this.approveRedemption(redemptionIds[i], approverId, orgId);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          index: i,
          redemptionId: redemptionIds[i],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Bulk fulfill redemptions
   */
  static async bulkFulfill(
    redemptionIds: string[],
    fulfillerId: string,
    orgId: string,
    notes?: string
  ): Promise<BulkResult> {
    const result: BulkResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < redemptionIds.length; i++) {
      try {
        await this.fulfillRedemption(
          redemptionIds[i],
          fulfillerId,
          orgId,
          notes
        );
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          index: i,
          redemptionId: redemptionIds[i],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Get redemption statistics
   */
  static async getRedemptionStats(
    orgId: string,
    filters: RedemptionFilters = {}
  ): Promise<{
    total: number;
    pending: number;
    approved: number;
    fulfilled: number;
    cancelled: number;
    expired: number;
    totalPointsSpent: number;
    totalMonetaryValue: number;
  }> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: any[] = [orgId];
      let paramIndex = 2;

      if (filters.customerId) {
        conditions.push(`customer_id = $${paramIndex}`);
        params.push(filters.customerId);
        paramIndex++;
      }

      if (filters.rewardId) {
        conditions.push(`reward_id = $${paramIndex}`);
        params.push(filters.rewardId);
        paramIndex++;
      }

      if (filters.startDate) {
        conditions.push(`redeemed_at >= $${paramIndex}`);
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        conditions.push(`redeemed_at <= $${paramIndex}`);
        params.push(filters.endDate);
        paramIndex++;
      }

      const sql = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'fulfilled') as fulfilled,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COUNT(*) FILTER (WHERE status = 'expired') as expired,
          COALESCE(SUM(points_spent), 0) as total_points_spent,
          COALESCE(SUM(monetary_value_used), 0) as total_monetary_value
        FROM reward_redemption
        WHERE ${conditions.join(' AND ')}
      `;

      const result = await query(sql, params);
      const row = result.rows[0];

      return {
        total: parseInt(row.total || '0'),
        pending: parseInt(row.pending || '0'),
        approved: parseInt(row.approved || '0'),
        fulfilled: parseInt(row.fulfilled || '0'),
        cancelled: parseInt(row.cancelled || '0'),
        expired: parseInt(row.expired || '0'),
        totalPointsSpent: Number(row.total_points_spent || 0),
        totalMonetaryValue: Number(row.total_monetary_value || 0),
      };
    } catch (error) {
      console.error(
        '[RewardRedemptionService] Error fetching redemption stats:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch redemption statistics',
        'FETCH_STATS_ERROR',
        500,
        { error }
      );
    }
  }
}
