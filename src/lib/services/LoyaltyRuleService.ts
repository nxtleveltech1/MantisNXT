/**
 * Loyalty Rule Service
 *
 * Manages loyalty rules for automated points awards, including CRUD operations,
 * rule evaluation, testing, and priority management.
 *
 * Author: Backend System Architect
 * Date: 2025-11-02
 */

import { query, withTransaction } from '@/lib/database';
import type {
  LoyaltyRule,
  LoyaltyRuleInsert,
  LoyaltyRuleUpdate,
  LoyaltyRuleConditions,
  RuleTriggerType} from '@/types/loyalty';
import {
  LoyaltyError,
} from '@/types/loyalty';

// ============================================================================
// TYPES FOR SERVICE METHODS
// ============================================================================

export interface CreateRuleData extends LoyaltyRuleInsert {
  // All fields from LoyaltyRuleInsert
}

export interface UpdateRuleData extends LoyaltyRuleUpdate {
  // All fields from LoyaltyRuleUpdate
}

export interface RuleContext {
  orderAmount?: number;
  productCategories?: string[];
  productIds?: string[];
  customerTier?: string;
  customerSegment?: string;
  orderCount?: number;
  metadata?: Record<string, unknown>;
}

export interface RuleEvaluation {
  applicable: boolean;
  pointsMultiplier: number;
  bonusPoints: number;
  totalPoints?: number;
  rulesApplied: Array<{
    ruleId: string;
    ruleName: string;
    multiplier: number;
    bonusPoints: number;
  }>;
}

export interface RuleTestData {
  context: RuleContext;
  basePoints?: number;
}

export interface RuleTestResult {
  conditionsMet: boolean;
  pointsMultiplier: number;
  bonusPoints: number;
  totalPoints: number;
  evaluationDetails: Record<string, unknown>;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class LoyaltyRuleService {
  /**
   * Create a new loyalty rule
   */
  static async createRule(
    data: CreateRuleData,
    orgId: string
  ): Promise<LoyaltyRule> {
    try {
      return await withTransaction(async (client) => {
        // Verify program exists and belongs to org
        const programCheck = await client.query(
          `SELECT id FROM loyalty_program
           WHERE id = $1 AND org_id = $2`,
          [data.program_id, orgId]
        );

        if (programCheck.rows.length === 0) {
          throw new LoyaltyError(
            'Loyalty program not found',
            'PROGRAM_NOT_FOUND',
            404
          );
        }

        // Validate conditions
        this.validateConditions(data.conditions || {});

        const sql = `
          INSERT INTO loyalty_rule (
            org_id,
            program_id,
            name,
            description,
            trigger_type,
            conditions,
            points_multiplier,
            bonus_points,
            is_active,
            priority,
            valid_from,
            valid_until
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING
            id,
            org_id,
            program_id,
            name,
            description,
            trigger_type,
            conditions,
            points_multiplier,
            bonus_points,
            is_active,
            priority,
            valid_from,
            valid_until,
            created_at,
            updated_at
        `;

        const result = await client.query<LoyaltyRule>(sql, [
          orgId,
          data.program_id,
          data.name,
          data.description || null,
          data.trigger_type,
          JSON.stringify(data.conditions || {}),
          data.points_multiplier ?? 1.0,
          data.bonus_points ?? 0,
          data.is_active ?? true,
          data.priority ?? 0,
          data.valid_from || new Date(),
          data.valid_until || null,
        ]);

        return result.rows[0];
      });
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[LoyaltyRuleService] Error creating rule:', error);
      throw new LoyaltyError(
        'Failed to create loyalty rule',
        'CREATE_RULE_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Update an existing loyalty rule
   */
  static async updateRule(
    ruleId: string,
    data: UpdateRuleData,
    orgId: string
  ): Promise<LoyaltyRule> {
    try {
      // Validate conditions if provided
      if (data.conditions) {
        this.validateConditions(data.conditions);
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

      if (data.trigger_type !== undefined) {
        setClauses.push(`trigger_type = $${paramIndex}`);
        values.push(data.trigger_type);
        paramIndex++;
      }

      if (data.conditions !== undefined) {
        setClauses.push(`conditions = $${paramIndex}`);
        values.push(JSON.stringify(data.conditions));
        paramIndex++;
      }

      if (data.points_multiplier !== undefined) {
        setClauses.push(`points_multiplier = $${paramIndex}`);
        values.push(data.points_multiplier);
        paramIndex++;
      }

      if (data.bonus_points !== undefined) {
        setClauses.push(`bonus_points = $${paramIndex}`);
        values.push(data.bonus_points);
        paramIndex++;
      }

      if (data.is_active !== undefined) {
        setClauses.push(`is_active = $${paramIndex}`);
        values.push(data.is_active);
        paramIndex++;
      }

      if (data.priority !== undefined) {
        setClauses.push(`priority = $${paramIndex}`);
        values.push(data.priority);
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

      if (setClauses.length === 0) {
        throw new LoyaltyError('No fields to update', 'NO_UPDATES', 400);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(ruleId, orgId);

      const sql = `
        UPDATE loyalty_rule
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}
        RETURNING
          id,
          org_id,
          program_id,
          name,
          description,
          trigger_type,
          conditions,
          points_multiplier,
          bonus_points,
          is_active,
          priority,
          valid_from,
          valid_until,
          created_at,
          updated_at
      `;

      const result = await query<LoyaltyRule>(sql, values);

      if (result.rows.length === 0) {
        throw new LoyaltyError('Rule not found', 'RULE_NOT_FOUND', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[LoyaltyRuleService] Error updating rule:', error);
      throw new LoyaltyError(
        'Failed to update loyalty rule',
        'UPDATE_RULE_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Delete a loyalty rule
   */
  static async deleteRule(ruleId: string, orgId: string): Promise<void> {
    try {
      const result = await query(
        `DELETE FROM loyalty_rule WHERE id = $1 AND org_id = $2`,
        [ruleId, orgId]
      );

      if (result.rowCount === 0) {
        throw new LoyaltyError('Rule not found', 'RULE_NOT_FOUND', 404);
      }
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[LoyaltyRuleService] Error deleting rule:', error);
      throw new LoyaltyError(
        'Failed to delete loyalty rule',
        'DELETE_RULE_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get a loyalty rule by ID
   */
  static async getRule(ruleId: string, orgId: string): Promise<LoyaltyRule> {
    try {
      const sql = `
        SELECT
          id,
          org_id,
          program_id,
          name,
          description,
          trigger_type,
          conditions,
          points_multiplier,
          bonus_points,
          is_active,
          priority,
          valid_from,
          valid_until,
          created_at,
          updated_at
        FROM loyalty_rule
        WHERE id = $1 AND org_id = $2
      `;

      const result = await query<LoyaltyRule>(sql, [ruleId, orgId]);

      if (result.rows.length === 0) {
        throw new LoyaltyError('Rule not found', 'RULE_NOT_FOUND', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[LoyaltyRuleService] Error fetching rule:', error);
      throw new LoyaltyError(
        'Failed to fetch loyalty rule',
        'FETCH_RULE_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * List all rules for a program
   */
  static async listRules(
    programId: string,
    orgId: string
  ): Promise<LoyaltyRule[]> {
    try {
      const sql = `
        SELECT
          id,
          org_id,
          program_id,
          name,
          description,
          trigger_type,
          conditions,
          points_multiplier,
          bonus_points,
          is_active,
          priority,
          valid_from,
          valid_until,
          created_at,
          updated_at
        FROM loyalty_rule
        WHERE program_id = $1 AND org_id = $2
        ORDER BY priority DESC, created_at DESC
      `;

      const result = await query<LoyaltyRule>(sql, [programId, orgId]);
      return result.rows;
    } catch (error) {
      console.error('[LoyaltyRuleService] Error listing rules:', error);
      throw new LoyaltyError(
        'Failed to list loyalty rules',
        'LIST_RULES_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get active rules for a program
   */
  static async getActiveRules(
    programId: string,
    orgId: string,
    triggerType?: RuleTriggerType
  ): Promise<LoyaltyRule[]> {
    try {
      const conditions: string[] = [
        'program_id = $1',
        'org_id = $2',
        'is_active = true',
        '(valid_from IS NULL OR valid_from <= NOW())',
        '(valid_until IS NULL OR valid_until > NOW())',
      ];
      const params: unknown[] = [programId, orgId];

      if (triggerType) {
        conditions.push('trigger_type = $3');
        params.push(triggerType);
      }

      const sql = `
        SELECT
          id,
          org_id,
          program_id,
          name,
          description,
          trigger_type,
          conditions,
          points_multiplier,
          bonus_points,
          is_active,
          priority,
          valid_from,
          valid_until,
          created_at,
          updated_at
        FROM loyalty_rule
        WHERE ${conditions.join(' AND ')}
        ORDER BY priority DESC
      `;

      const result = await query<LoyaltyRule>(sql, params);
      return result.rows;
    } catch (error) {
      console.error('[LoyaltyRuleService] Error fetching active rules:', error);
      throw new LoyaltyError(
        'Failed to fetch active rules',
        'FETCH_ACTIVE_RULES_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Activate a rule
   */
  static async activateRule(ruleId: string, orgId: string): Promise<void> {
    try {
      const result = await query(
        `UPDATE loyalty_rule
         SET is_active = true, updated_at = NOW()
         WHERE id = $1 AND org_id = $2`,
        [ruleId, orgId]
      );

      if (result.rowCount === 0) {
        throw new LoyaltyError('Rule not found', 'RULE_NOT_FOUND', 404);
      }
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[LoyaltyRuleService] Error activating rule:', error);
      throw new LoyaltyError(
        'Failed to activate rule',
        'ACTIVATE_RULE_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Deactivate a rule
   */
  static async deactivateRule(ruleId: string, orgId: string): Promise<void> {
    try {
      const result = await query(
        `UPDATE loyalty_rule
         SET is_active = false, updated_at = NOW()
         WHERE id = $1 AND org_id = $2`,
        [ruleId, orgId]
      );

      if (result.rowCount === 0) {
        throw new LoyaltyError('Rule not found', 'RULE_NOT_FOUND', 404);
      }
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[LoyaltyRuleService] Error deactivating rule:', error);
      throw new LoyaltyError(
        'Failed to deactivate rule',
        'DEACTIVATE_RULE_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Evaluate rules for a given context
   */
  static async evaluateRules(
    programId: string,
    context: RuleContext,
    orgId: string,
    triggerType: RuleTriggerType = 'order_placed'
  ): Promise<RuleEvaluation> {
    try {
      const activeRules = await this.getActiveRules(
        programId,
        orgId,
        triggerType
      );

      let totalMultiplier = 1.0;
      let totalBonusPoints = 0;
      const rulesApplied: RuleEvaluation['rulesApplied'] = [];

      for (const rule of activeRules) {
        const conditionsMet = this.checkConditions(rule.conditions, context);

        if (conditionsMet) {
          totalMultiplier *= rule.points_multiplier;
          totalBonusPoints += rule.bonus_points;
          rulesApplied.push({
            ruleId: rule.id,
            ruleName: rule.name,
            multiplier: rule.points_multiplier,
            bonusPoints: rule.bonus_points,
          });
        }
      }

      return {
        applicable: rulesApplied.length > 0,
        pointsMultiplier: totalMultiplier,
        bonusPoints: totalBonusPoints,
        rulesApplied,
      };
    } catch (error) {
      console.error('[LoyaltyRuleService] Error evaluating rules:', error);
      throw new LoyaltyError(
        'Failed to evaluate rules',
        'EVALUATE_RULES_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Test a rule with sample data
   */
  static async testRule(
    ruleId: string,
    testData: RuleTestData,
    orgId: string
  ): Promise<RuleTestResult> {
    try {
      const rule = await this.getRule(ruleId, orgId);
      const basePoints = testData.basePoints || 100;

      const conditionsMet = this.checkConditions(
        rule.conditions,
        testData.context
      );

      let totalPoints = basePoints;
      if (conditionsMet) {
        totalPoints = Math.floor(basePoints * rule.points_multiplier);
        totalPoints += rule.bonus_points;
      }

      const evaluationDetails = this.getEvaluationDetails(
        rule.conditions,
        testData.context
      );

      return {
        conditionsMet,
        pointsMultiplier: rule.points_multiplier,
        bonusPoints: rule.bonus_points,
        totalPoints,
        evaluationDetails,
      };
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[LoyaltyRuleService] Error testing rule:', error);
      throw new LoyaltyError(
        'Failed to test rule',
        'TEST_RULE_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Update rule priority
   */
  static async updatePriority(
    ruleId: string,
    priority: number,
    orgId: string
  ): Promise<void> {
    try {
      const result = await query(
        `UPDATE loyalty_rule
         SET priority = $1, updated_at = NOW()
         WHERE id = $2 AND org_id = $3`,
        [priority, ruleId, orgId]
      );

      if (result.rowCount === 0) {
        throw new LoyaltyError('Rule not found', 'RULE_NOT_FOUND', 404);
      }
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[LoyaltyRuleService] Error updating priority:', error);
      throw new LoyaltyError(
        'Failed to update rule priority',
        'UPDATE_PRIORITY_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Reorder rules by setting new priorities
   */
  static async reorderRules(
    programId: string,
    ruleOrder: string[],
    orgId: string
  ): Promise<void> {
    try {
      await withTransaction(async (client) => {
        for (let i = 0; i < ruleOrder.length; i++) {
          const priority = ruleOrder.length - i; // Higher index = higher priority
          await client.query(
            `UPDATE loyalty_rule
             SET priority = $1, updated_at = NOW()
             WHERE id = $2 AND program_id = $3 AND org_id = $4`,
            [priority, ruleOrder[i], programId, orgId]
          );
        }
      });
    } catch (error) {
      console.error('[LoyaltyRuleService] Error reordering rules:', error);
      throw new LoyaltyError(
        'Failed to reorder rules',
        'REORDER_RULES_ERROR',
        500,
        { error }
      );
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate rule conditions structure
   */
  private static validateConditions(conditions: LoyaltyRuleConditions): void {
    // Validate min/max order amounts
    if (
      conditions.min_order_amount !== undefined &&
      conditions.max_order_amount !== undefined
    ) {
      if (conditions.min_order_amount > conditions.max_order_amount) {
        throw new LoyaltyError(
          'min_order_amount cannot be greater than max_order_amount',
          'INVALID_CONDITIONS',
          400
        );
      }
    }

    // Validate order count
    if (
      conditions.order_count_min !== undefined &&
      conditions.order_count_max !== undefined
    ) {
      if (conditions.order_count_min > conditions.order_count_max) {
        throw new LoyaltyError(
          'order_count_min cannot be greater than order_count_max',
          'INVALID_CONDITIONS',
          400
        );
      }
    }
  }

  /**
   * Check if all conditions are met
   */
  private static checkConditions(
    conditions: LoyaltyRuleConditions,
    context: RuleContext
  ): boolean {
    // Check min order amount
    if (
      conditions.min_order_amount !== undefined &&
      context.orderAmount !== undefined
    ) {
      if (context.orderAmount < conditions.min_order_amount) {
        return false;
      }
    }

    // Check max order amount
    if (
      conditions.max_order_amount !== undefined &&
      context.orderAmount !== undefined
    ) {
      if (context.orderAmount > conditions.max_order_amount) {
        return false;
      }
    }

    // Check product categories
    if (
      conditions.product_categories &&
      conditions.product_categories.length > 0
    ) {
      if (!context.productCategories || context.productCategories.length === 0) {
        return false;
      }
      const hasMatch = conditions.product_categories.some((cat) =>
        context.productCategories!.includes(cat)
      );
      if (!hasMatch) {
        return false;
      }
    }

    // Check product IDs
    if (conditions.product_ids && conditions.product_ids.length > 0) {
      if (!context.productIds || context.productIds.length === 0) {
        return false;
      }
      const hasMatch = conditions.product_ids.some((id) =>
        context.productIds!.includes(id)
      );
      if (!hasMatch) {
        return false;
      }
    }

    // Check customer tier
    if (conditions.customer_tier && conditions.customer_tier.length > 0) {
      if (!context.customerTier) {
        return false;
      }
      if (!conditions.customer_tier.includes(context.customerTier as unknown)) {
        return false;
      }
    }

    // Check customer segment
    if (
      conditions.customer_segment &&
      conditions.customer_segment.length > 0
    ) {
      if (!context.customerSegment) {
        return false;
      }
      if (!conditions.customer_segment.includes(context.customerSegment)) {
        return false;
      }
    }

    // Check order count
    if (
      conditions.order_count_min !== undefined &&
      context.orderCount !== undefined
    ) {
      if (context.orderCount < conditions.order_count_min) {
        return false;
      }
    }

    if (
      conditions.order_count_max !== undefined &&
      context.orderCount !== undefined
    ) {
      if (context.orderCount > conditions.order_count_max) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get detailed evaluation information for testing
   */
  private static getEvaluationDetails(
    conditions: LoyaltyRuleConditions,
    context: RuleContext
  ): Record<string, unknown> {
    const details: Record<string, unknown> = {};

    if (conditions.min_order_amount !== undefined) {
      details.minOrderAmount = {
        required: conditions.min_order_amount,
        actual: context.orderAmount,
        met:
          context.orderAmount !== undefined &&
          context.orderAmount >= conditions.min_order_amount,
      };
    }

    if (conditions.max_order_amount !== undefined) {
      details.maxOrderAmount = {
        required: conditions.max_order_amount,
        actual: context.orderAmount,
        met:
          context.orderAmount !== undefined &&
          context.orderAmount <= conditions.max_order_amount,
      };
    }

    if (conditions.customer_tier && conditions.customer_tier.length > 0) {
      details.customerTier = {
        required: conditions.customer_tier,
        actual: context.customerTier,
        met:
          context.customerTier !== undefined &&
          conditions.customer_tier.includes(context.customerTier as unknown),
      };
    }

    return details;
  }
}
