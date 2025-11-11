// @ts-nocheck

/**
 * Loyalty Transaction Service
 *
 * Manages loyalty points transactions including earn, redeem, expire, adjust, and bonus operations.
 * Provides transaction history, statistics, and bulk operations.
 *
 * Author: Backend System Architect
 * Date: 2025-11-02
 */

import { query, withTransaction } from '@/lib/database';
import type {
  LoyaltyTransaction,
  TransactionType,
  ReferenceType,
  CalculatePointsResult} from '@/types/loyalty';
import {
  LoyaltyError,
} from '@/types/loyalty';

// ============================================================================
// TYPES FOR SERVICE METHODS
// ============================================================================

export interface CreateTransactionParams {
  customerId: string;
  programId: string;
  transactionType: TransactionType;
  pointsAmount: number;
  description: string;
  referenceType?: ReferenceType;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
  createdBy?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'points_amount';
  sortOrder?: 'ASC' | 'DESC';
}

export interface TransactionFilters {
  transactionType?: TransactionType;
  referenceType?: ReferenceType;
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
  programId?: string;
}

export interface TransactionStats {
  totalEarned: number;
  totalRedeemed: number;
  totalExpired: number;
  totalAdjusted: number;
  totalBonus: number;
  netPoints: number;
  transactionCount: number;
  avgTransactionSize: number;
  periodStart?: Date;
  periodEnd?: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface BulkResult {
  success: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
}

export interface PointsCalculation {
  pointsAwarded: number;
  basePoints: number;
  tierBonus: number;
  ruleBonus: number;
  totalMultiplier: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class LoyaltyTransactionService {
  /**
   * Create a new loyalty transaction
   */
  static async createTransaction(
    params: CreateTransactionParams,
    orgId: string
  ): Promise<LoyaltyTransaction> {
    try {
      return await withTransaction(async (client) => {
        // Validate transaction type and points amount
        this.validateTransaction(params.transactionType, params.pointsAmount);

        // Verify customer loyalty record exists
        const customerCheck = await client.query(
          `SELECT id, org_id FROM customer_loyalty
           WHERE customer_id = $1 AND program_id = $2 AND org_id = $3`,
          [params.customerId, params.programId, orgId]
        );

        if (customerCheck.rows.length === 0) {
          throw new LoyaltyError(
            'Customer not enrolled in loyalty program',
            'CUSTOMER_NOT_ENROLLED',
            404
          );
        }

        // Create transaction
        const sql = `
          INSERT INTO loyalty_transaction (
            org_id,
            customer_id,
            program_id,
            transaction_type,
            points_amount,
            reference_type,
            reference_id,
            description,
            metadata,
            expires_at,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING
            id,
            org_id,
            customer_id,
            program_id,
            transaction_type::text as transaction_type,
            points_amount,
            reference_type,
            reference_id,
            description,
            metadata,
            expires_at,
            created_by,
            created_at
        `;

        const result = await client.query<LoyaltyTransaction>(sql, [
          orgId,
          params.customerId,
          params.programId,
          params.transactionType,
          params.pointsAmount,
          params.referenceType || null,
          params.referenceId || null,
          params.description,
          params.metadata ? JSON.stringify(params.metadata) : '{}',
          params.expiresAt || null,
          params.createdBy || null,
        ]);

        // Update customer loyalty balance
        await this.updateCustomerBalance(
          client,
          params.customerId,
          params.programId,
          params.pointsAmount
        );

        return result.rows[0];
      });
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[LoyaltyTransactionService] Error creating transaction:',
        error
      );
      throw new LoyaltyError(
        'Failed to create transaction',
        'CREATE_TRANSACTION_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Calculate points for an order using database function
   */
  static async calculatePointsForOrder(
    customerId: string,
    orderAmount: number,
    orderId: string,
    orgId: string,
    orderMetadata?: Record<string, unknown>
  ): Promise<PointsCalculation> {
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

      const sql = `
        SELECT
          points_awarded,
          base_points,
          tier_bonus,
          rule_bonus,
          total_multiplier
        FROM calculate_points_for_order($1, $2, $3, $4)
      `;

      const result = await query<CalculatePointsResult>(sql, [
        customerId,
        orderAmount,
        orderId,
        orderMetadata ? JSON.stringify(orderMetadata) : '{}',
      ]);

      if (result.rows.length === 0) {
        return {
          pointsAwarded: 0,
          basePoints: 0,
          tierBonus: 0,
          ruleBonus: 0,
          totalMultiplier: 0,
        };
      }

      const row = result.rows[0];
      return {
        pointsAwarded: Number(row.points_awarded),
        basePoints: Number(row.base_points),
        tierBonus: Number(row.tier_bonus),
        ruleBonus: Number(row.rule_bonus),
        totalMultiplier: Number(row.total_multiplier),
      };
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[LoyaltyTransactionService] Error calculating points:',
        error
      );
      throw new LoyaltyError(
        'Failed to calculate points for order',
        'CALCULATE_POINTS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get customer transactions with pagination
   */
  static async getCustomerTransactions(
    customerId: string,
    orgId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<LoyaltyTransaction>> {
    try {
      const {
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = options;

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

      // Count query
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM loyalty_transaction
         WHERE customer_id = $1 AND org_id = $2`,
        [customerId, orgId]
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Data query
      const sql = `
        SELECT
          id,
          org_id,
          customer_id,
          program_id,
          transaction_type::text as transaction_type,
          points_amount,
          reference_type,
          reference_id,
          description,
          metadata,
          expires_at,
          created_by,
          created_at
        FROM loyalty_transaction
        WHERE customer_id = $1 AND org_id = $2
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $3 OFFSET $4
      `;

      const result = await query<LoyaltyTransaction>(sql, [
        customerId,
        orgId,
        limit,
        offset,
      ]);

      return {
        data: result.rows,
        count,
        limit,
        offset,
        hasMore: offset + limit < count,
      };
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[LoyaltyTransactionService] Error fetching customer transactions:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch customer transactions',
        'FETCH_TRANSACTIONS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(
    transactionId: string,
    orgId: string
  ): Promise<LoyaltyTransaction> {
    try {
      const sql = `
        SELECT
          id,
          org_id,
          customer_id,
          program_id,
          transaction_type::text as transaction_type,
          points_amount,
          reference_type,
          reference_id,
          description,
          metadata,
          expires_at,
          created_by,
          created_at
        FROM loyalty_transaction
        WHERE id = $1 AND org_id = $2
      `;

      const result = await query<LoyaltyTransaction>(sql, [transactionId, orgId]);

      if (result.rows.length === 0) {
        throw new LoyaltyError(
          'Transaction not found',
          'TRANSACTION_NOT_FOUND',
          404
        );
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[LoyaltyTransactionService] Error fetching transaction:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch transaction',
        'FETCH_TRANSACTION_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get transaction statistics with optional filters
   */
  static async getTransactionStats(
    orgId: string,
    filters: TransactionFilters = {}
  ): Promise<TransactionStats> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (filters.customerId) {
        conditions.push(`customer_id = $${paramIndex}`);
        params.push(filters.customerId);
        paramIndex++;
      }

      if (filters.programId) {
        conditions.push(`program_id = $${paramIndex}`);
        params.push(filters.programId);
        paramIndex++;
      }

      if (filters.transactionType) {
        conditions.push(`transaction_type = $${paramIndex}`);
        params.push(filters.transactionType);
        paramIndex++;
      }

      if (filters.referenceType) {
        conditions.push(`reference_type = $${paramIndex}`);
        params.push(filters.referenceType);
        paramIndex++;
      }

      if (filters.startDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(filters.endDate);
        paramIndex++;
      }

      const sql = `
        SELECT
          SUM(CASE WHEN transaction_type = 'earn' THEN points_amount ELSE 0 END) as total_earned,
          SUM(CASE WHEN transaction_type = 'redeem' THEN ABS(points_amount) ELSE 0 END) as total_redeemed,
          SUM(CASE WHEN transaction_type = 'expire' THEN ABS(points_amount) ELSE 0 END) as total_expired,
          SUM(CASE WHEN transaction_type = 'adjust' THEN points_amount ELSE 0 END) as total_adjusted,
          SUM(CASE WHEN transaction_type = 'bonus' THEN points_amount ELSE 0 END) as total_bonus,
          SUM(points_amount) as net_points,
          COUNT(*) as transaction_count,
          AVG(ABS(points_amount)) as avg_transaction_size
        FROM loyalty_transaction
        WHERE ${conditions.join(' AND ')}
      `;

      const result = await query(sql, params);
      const row = result.rows[0];

      return {
        totalEarned: Number(row.total_earned || 0),
        totalRedeemed: Number(row.total_redeemed || 0),
        totalExpired: Number(row.total_expired || 0),
        totalAdjusted: Number(row.total_adjusted || 0),
        totalBonus: Number(row.total_bonus || 0),
        netPoints: Number(row.net_points || 0),
        transactionCount: Number(row.transaction_count || 0),
        avgTransactionSize: Number(row.avg_transaction_size || 0),
        periodStart: filters.startDate,
        periodEnd: filters.endDate,
      };
    } catch (error) {
      console.error(
        '[LoyaltyTransactionService] Error fetching transaction stats:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch transaction statistics',
        'FETCH_STATS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Bulk create transactions (for imports or migrations)
   */
  static async bulkCreateTransactions(
    transactions: CreateTransactionParams[],
    orgId: string
  ): Promise<BulkResult> {
    const result: BulkResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < transactions.length; i++) {
      try {
        await this.createTransaction(transactions[i], orgId);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate transaction type and points amount
   */
  private static validateTransaction(
    transactionType: TransactionType,
    pointsAmount: number
  ): void {
    switch (transactionType) {
      case 'earn':
      case 'bonus':
        if (pointsAmount <= 0) {
          throw new LoyaltyError(
            `${transactionType} transactions must have positive points`,
            'INVALID_POINTS_AMOUNT',
            400
          );
        }
        break;
      case 'redeem':
      case 'expire':
        if (pointsAmount >= 0) {
          throw new LoyaltyError(
            `${transactionType} transactions must have negative points`,
            'INVALID_POINTS_AMOUNT',
            400
          );
        }
        break;
      case 'adjust':
        // Adjustments can be positive or negative
        break;
      default:
        throw new LoyaltyError(
          `Invalid transaction type: ${transactionType}`,
          'INVALID_TRANSACTION_TYPE',
          400
        );
    }
  }

  /**
   * Update customer loyalty balance after transaction
   */
  private static async updateCustomerBalance(
    client: unknown,
    customerId: string,
    programId: string,
    pointsAmount: number
  ): Promise<void> {
    const sql = `
      UPDATE customer_loyalty
      SET
        total_points_earned = total_points_earned + CASE WHEN $3 > 0 THEN $3 ELSE 0 END,
        total_points_redeemed = total_points_redeemed + CASE WHEN $3 < 0 THEN ABS($3) ELSE 0 END,
        points_balance = points_balance + $3,
        updated_at = NOW()
      WHERE customer_id = $1 AND program_id = $2
    `;

    await client.query(sql, [customerId, programId, pointsAmount]);
  }
}
