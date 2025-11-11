/**
 * Loyalty Program Service
 *
 * Handles loyalty program configuration, tier management, and program CRUD operations
 *
 * Author: Backend System Architect
 * Date: 2025-11-02
 */

import { query, withTransaction } from '@/lib/database';
import type {
  LoyaltyProgram,
  LoyaltyProgramInsert,
  LoyaltyProgramUpdate,
  TierThresholds,
  TierBenefits} from '@/types/loyalty';
import {
  LoyaltyError,
} from '@/types/loyalty';

export class LoyaltyProgramService {
  /**
   * Get all loyalty programs for an organization
   */
  static async getPrograms(
    orgId: string,
    options: {
      activeOnly?: boolean;
      includeDefault?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: LoyaltyProgram[]; count: number }> {
    try {
      const {
        activeOnly = false,
        includeDefault = true,
        limit = 50,
        offset = 0,
      } = options;

      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      const paramIndex = 2;

      if (activeOnly) {
        conditions.push('is_active = true');
      }

      // Count query
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM loyalty_program
         WHERE ${conditions.join(' AND ')}`,
        params
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Data query
      const sql = `
        SELECT
          id,
          org_id,
          name,
          description,
          is_active,
          is_default,
          earn_rate,
          tier_thresholds,
          tier_benefits,
          points_expiry_days,
          created_at,
          updated_at
        FROM loyalty_program
        WHERE ${conditions.join(' AND ')}
        ORDER BY
          is_default DESC NULLS LAST,
          created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await query<LoyaltyProgram>(sql, [
        ...params,
        limit,
        offset,
      ]);

      return { data: result.rows, count };
    } catch (error) {
      console.error('[LoyaltyProgramService] Error fetching programs:', error);
      throw new LoyaltyError(
        'Failed to fetch loyalty programs',
        'FETCH_PROGRAMS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get a single loyalty program by ID
   */
  static async getProgramById(
    programId: string,
    orgId: string
  ): Promise<LoyaltyProgram | null> {
    try {
      const sql = `
        SELECT
          id,
          org_id,
          name,
          description,
          is_active,
          is_default,
          earn_rate,
          tier_thresholds,
          tier_benefits,
          points_expiry_days,
          created_at,
          updated_at
        FROM loyalty_program
        WHERE id = $1 AND org_id = $2
      `;

      const result = await query<LoyaltyProgram>(sql, [programId, orgId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('[LoyaltyProgramService] Error fetching program:', error);
      throw new LoyaltyError(
        'Failed to fetch loyalty program',
        'FETCH_PROGRAM_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get the default loyalty program for an organization
   */
  static async getDefaultProgram(
    orgId: string
  ): Promise<LoyaltyProgram | null> {
    try {
      const sql = `
        SELECT
          id,
          org_id,
          name,
          description,
          is_active,
          is_default,
          earn_rate,
          tier_thresholds,
          tier_benefits,
          points_expiry_days,
          created_at,
          updated_at
        FROM loyalty_program
        WHERE org_id = $1
          AND is_default = true
          AND is_active = true
        LIMIT 1
      `;

      const result = await query<LoyaltyProgram>(sql, [orgId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(
        '[LoyaltyProgramService] Error fetching default program:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch default loyalty program',
        'FETCH_DEFAULT_PROGRAM_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Create a new loyalty program
   */
  static async createProgram(
    orgId: string,
    program: LoyaltyProgramInsert
  ): Promise<LoyaltyProgram> {
    try {
      return await withTransaction(async (client) => {
        // If setting as default, unset other defaults
        if (program.is_default) {
          await client.query(
            'UPDATE loyalty_program SET is_default = false WHERE org_id = $1 AND is_default = true',
            [orgId]
          );
        }

        const sql = `
          INSERT INTO loyalty_program (
            org_id,
            name,
            description,
            is_active,
            is_default,
            earn_rate,
            tier_thresholds,
            tier_benefits,
            points_expiry_days
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING
            id,
            org_id,
            name,
            description,
            is_active,
            is_default,
            earn_rate,
            tier_thresholds,
            tier_benefits,
            points_expiry_days,
            created_at,
            updated_at
        `;

        const defaultTierThresholds: TierThresholds = {
          bronze: 0,
          silver: 1000,
          gold: 5000,
          platinum: 15000,
          diamond: 50000,
        };

        const defaultTierBenefits: TierBenefits = {
          bronze: { multiplier: 1.0 },
          silver: { multiplier: 1.2, discount: 5 },
          gold: {
            multiplier: 1.5,
            discount: 10,
            free_shipping: true,
          },
          platinum: {
            multiplier: 2.0,
            discount: 15,
            free_shipping: true,
            priority_support: true,
          },
          diamond: {
            multiplier: 3.0,
            discount: 20,
            free_shipping: true,
            priority_support: true,
            dedicated_rep: true,
          },
        };

        const result = await client.query<LoyaltyProgram>(sql, [
          orgId,
          program.name,
          program.description || null,
          program.is_active ?? true,
          program.is_default ?? false,
          program.earn_rate,
          JSON.stringify(program.tier_thresholds || defaultTierThresholds),
          JSON.stringify(program.tier_benefits || defaultTierBenefits),
          program.points_expiry_days || null,
        ]);

        return result.rows[0];
      });
    } catch (error) {
      console.error('[LoyaltyProgramService] Error creating program:', error);
      throw new LoyaltyError(
        'Failed to create loyalty program',
        'CREATE_PROGRAM_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Update a loyalty program
   */
  static async updateProgram(
    programId: string,
    orgId: string,
    updates: LoyaltyProgramUpdate
  ): Promise<LoyaltyProgram> {
    try {
      return await withTransaction(async (client) => {
        // If setting as default, unset other defaults
        if (updates.is_default === true) {
          await client.query(
            'UPDATE loyalty_program SET is_default = false WHERE org_id = $1 AND id != $2 AND is_default = true',
            [orgId, programId]
          );
        }

        const setClauses: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (updates.name !== undefined) {
          setClauses.push(`name = $${paramIndex}`);
          values.push(updates.name);
          paramIndex++;
        }

        if (updates.description !== undefined) {
          setClauses.push(`description = $${paramIndex}`);
          values.push(updates.description);
          paramIndex++;
        }

        if (updates.is_active !== undefined) {
          setClauses.push(`is_active = $${paramIndex}`);
          values.push(updates.is_active);
          paramIndex++;
        }

        if (updates.is_default !== undefined) {
          setClauses.push(`is_default = $${paramIndex}`);
          values.push(updates.is_default);
          paramIndex++;
        }

        if (updates.earn_rate !== undefined) {
          setClauses.push(`earn_rate = $${paramIndex}`);
          values.push(updates.earn_rate);
          paramIndex++;
        }

        if (updates.tier_thresholds !== undefined) {
          setClauses.push(`tier_thresholds = $${paramIndex}`);
          values.push(JSON.stringify(updates.tier_thresholds));
          paramIndex++;
        }

        if (updates.tier_benefits !== undefined) {
          setClauses.push(`tier_benefits = $${paramIndex}`);
          values.push(JSON.stringify(updates.tier_benefits));
          paramIndex++;
        }

        if (updates.points_expiry_days !== undefined) {
          setClauses.push(`points_expiry_days = $${paramIndex}`);
          values.push(updates.points_expiry_days);
          paramIndex++;
        }

        if (setClauses.length === 0) {
          throw new LoyaltyError(
            'No fields to update',
            'NO_UPDATES',
            400
          );
        }

        setClauses.push(`updated_at = NOW()`);

        values.push(programId, orgId);

        const sql = `
          UPDATE loyalty_program
          SET ${setClauses.join(', ')}
          WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}
          RETURNING
            id,
            org_id,
            name,
            description,
            is_active,
            is_default,
            earn_rate,
            tier_thresholds,
            tier_benefits,
            points_expiry_days,
            created_at,
            updated_at
        `;

        const result = await client.query<LoyaltyProgram>(sql, values);

        if (result.rows.length === 0) {
          throw new LoyaltyError(
            'Loyalty program not found',
            'PROGRAM_NOT_FOUND',
            404
          );
        }

        return result.rows[0];
      });
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[LoyaltyProgramService] Error updating program:', error);
      throw new LoyaltyError(
        'Failed to update loyalty program',
        'UPDATE_PROGRAM_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Delete a loyalty program (soft delete by setting inactive)
   */
  static async deleteProgram(
    programId: string,
    orgId: string,
    hardDelete: boolean = false
  ): Promise<void> {
    try {
      await withTransaction(async (client) => {
        // Check if program has active customers
        const customerCheck = await client.query(
          'SELECT COUNT(*) as count FROM customer_loyalty WHERE program_id = $1',
          [programId]
        );

        const customerCount = parseInt(
          customerCheck.rows[0]?.count || '0',
          10
        );

        if (customerCount > 0 && hardDelete) {
          throw new LoyaltyError(
            'Cannot delete program with active customers',
            'PROGRAM_HAS_CUSTOMERS',
            400,
            { customerCount }
          );
        }

        if (hardDelete && customerCount === 0) {
          // Hard delete only if no customers
          await client.query(
            'DELETE FROM loyalty_program WHERE id = $1 AND org_id = $2',
            [programId, orgId]
          );
        } else {
          // Soft delete by setting inactive
          const result = await client.query(
            `UPDATE loyalty_program
             SET is_active = false, is_default = false, updated_at = NOW()
             WHERE id = $1 AND org_id = $2`,
            [programId, orgId]
          );

          if (result.rowCount === 0) {
            throw new LoyaltyError(
              'Loyalty program not found',
              'PROGRAM_NOT_FOUND',
              404
            );
          }
        }
      });
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[LoyaltyProgramService] Error deleting program:', error);
      throw new LoyaltyError(
        'Failed to delete loyalty program',
        'DELETE_PROGRAM_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get tier configuration for a program
   */
  static async getTierConfiguration(
    programId: string,
    orgId: string
  ): Promise<{ thresholds: TierThresholds; benefits: TierBenefits }> {
    try {
      const sql = `
        SELECT tier_thresholds, tier_benefits
        FROM loyalty_program
        WHERE id = $1 AND org_id = $2
      `;

      const result = await query<{
        tier_thresholds: TierThresholds;
        tier_benefits: TierBenefits;
      }>(sql, [programId, orgId]);

      if (result.rows.length === 0) {
        throw new LoyaltyError(
          'Loyalty program not found',
          'PROGRAM_NOT_FOUND',
          404
        );
      }

      return {
        thresholds: result.rows[0].tier_thresholds,
        benefits: result.rows[0].tier_benefits,
      };
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[LoyaltyProgramService] Error fetching tier config:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch tier configuration',
        'FETCH_TIER_CONFIG_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Update tier configuration
   */
  static async updateTierConfiguration(
    programId: string,
    orgId: string,
    config: { thresholds?: TierThresholds; benefits?: TierBenefits }
  ): Promise<{ thresholds: TierThresholds; benefits: TierBenefits }> {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (config.thresholds) {
        setClauses.push(`tier_thresholds = $${paramIndex}`);
        values.push(JSON.stringify(config.thresholds));
        paramIndex++;
      }

      if (config.benefits) {
        setClauses.push(`tier_benefits = $${paramIndex}`);
        values.push(JSON.stringify(config.benefits));
        paramIndex++;
      }

      if (setClauses.length === 0) {
        throw new LoyaltyError('No configuration to update', 'NO_UPDATES', 400);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(programId, orgId);

      const sql = `
        UPDATE loyalty_program
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}
        RETURNING tier_thresholds, tier_benefits
      `;

      const result = await query<{
        tier_thresholds: TierThresholds;
        tier_benefits: TierBenefits;
      }>(sql, values);

      if (result.rows.length === 0) {
        throw new LoyaltyError(
          'Loyalty program not found',
          'PROGRAM_NOT_FOUND',
          404
        );
      }

      return {
        thresholds: result.rows[0].tier_thresholds,
        benefits: result.rows[0].tier_benefits,
      };
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error(
        '[LoyaltyProgramService] Error updating tier config:',
        error
      );
      throw new LoyaltyError(
        'Failed to update tier configuration',
        'UPDATE_TIER_CONFIG_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get program statistics
   */
  static async getProgramStatistics(
    programId: string,
    orgId: string
  ): Promise<{
    total_members: number;
    active_members: number;
    tier_distribution: Record<string, number>;
    total_points_issued: number;
    total_points_redeemed: number;
    total_points_outstanding: number;
  }> {
    try {
      const sql = `
        WITH stats AS (
          SELECT
            COUNT(*) as total_members,
            COUNT(*) FILTER (WHERE points_balance > 0) as active_members,
            SUM(total_points_earned) as total_points_issued,
            SUM(total_points_redeemed) as total_points_redeemed,
            SUM(points_balance) as total_points_outstanding
          FROM customer_loyalty
          WHERE program_id = $1 AND org_id = $2
        ),
        tier_dist AS (
          SELECT
            current_tier::text as tier,
            COUNT(*) as count
          FROM customer_loyalty
          WHERE program_id = $1 AND org_id = $2
          GROUP BY current_tier
        )
        SELECT
          s.*,
          jsonb_object_agg(
            COALESCE(td.tier, 'none'),
            COALESCE(td.count, 0)
          ) as tier_distribution
        FROM stats s
        LEFT JOIN tier_dist td ON true
        GROUP BY s.total_members, s.active_members, s.total_points_issued,
                 s.total_points_redeemed, s.total_points_outstanding
      `;

      const result = await query<{
        total_members: number;
        active_members: number;
        tier_distribution: Record<string, number>;
        total_points_issued: number;
        total_points_redeemed: number;
        total_points_outstanding: number;
      }>(sql, [programId, orgId]);

      if (result.rows.length === 0) {
        return {
          total_members: 0,
          active_members: 0,
          tier_distribution: {},
          total_points_issued: 0,
          total_points_redeemed: 0,
          total_points_outstanding: 0,
        };
      }

      return result.rows[0];
    } catch (error) {
      console.error(
        '[LoyaltyProgramService] Error fetching statistics:',
        error
      );
      throw new LoyaltyError(
        'Failed to fetch program statistics',
        'FETCH_STATISTICS_ERROR',
        500,
        { error }
      );
    }
  }
}
