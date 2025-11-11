/**
 * Pricing Rule Service
 *
 * Handles CRUD operations for pricing rules, rule evaluation,
 * conflict detection, and rule application logic
 *
 * Author: Aster (Principal Full-Stack & Architecture Expert)
 * Date: 2025-11-02
 */

import { query } from '@/lib/database';
import type { PricingRule} from '@/lib/db/pricing-schema';
import { PRICING_TABLES, PricingRuleType, PricingStrategy } from '@/lib/db/pricing-schema';
import { CORE_TABLES } from '@/lib/db/schema-contract';
import { v4 as uuidv4 } from 'uuid';

export interface CreatePricingRuleInput {
  name: string;
  description?: string;
  rule_type: PricingRuleType;
  priority: number;
  strategy: PricingStrategy;
  config: PricingRule['config'];
  applies_to_categories?: string[];
  applies_to_brands?: string[];
  applies_to_suppliers?: string[];
  applies_to_products?: string[];
  created_by?: string;
}

export interface UpdatePricingRuleInput extends Partial<CreatePricingRuleInput> {
  last_modified_by?: string;
}

export interface PricingRuleFilter {
  rule_type?: PricingRuleType;
  strategy?: PricingStrategy;
  is_active?: boolean;
  priority_min?: number;
  priority_max?: number;
  search?: string;
}

export interface RuleConflict {
  rule1: PricingRule;
  rule2: PricingRule;
  conflict_type: 'priority' | 'scope_overlap' | 'contradictory_config';
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ProductPriceCalculation {
  product_id: string;
  current_price?: number;
  calculated_price: number;
  applied_rules: Array<{
    rule_id: string;
    rule_name: string;
    rule_type: PricingRuleType;
    adjustment: number;
  }>;
  final_margin_percent?: number;
}

export class PricingRuleService {
  /**
   * Create a new pricing rule
   */
  static async createRule(input: CreatePricingRuleInput): Promise<PricingRule> {
    const ruleId = uuidv4();

    const sql = `
      INSERT INTO ${PRICING_TABLES.PRICING_RULES} (
        rule_id, name, description, rule_type, priority, is_active, strategy,
        config, applies_to_categories, applies_to_brands, applies_to_suppliers,
        applies_to_products, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await query<PricingRule>(sql, [
      ruleId,
      input.name,
      input.description || null,
      input.rule_type,
      input.priority,
      true, // is_active defaults to true
      input.strategy,
      JSON.stringify(input.config),
      input.applies_to_categories || null,
      input.applies_to_brands || null,
      input.applies_to_suppliers || null,
      input.applies_to_products || null,
      input.created_by || null,
    ]);

    return this.parseRule(result.rows[0]);
  }

  /**
   * Get all pricing rules with optional filtering
   */
  static async getAllRules(filter?: PricingRuleFilter): Promise<PricingRule[]> {
    let sql = `SELECT * FROM ${PRICING_TABLES.PRICING_RULES} WHERE 1=1`;
    const params: unknown[] = [];
    let paramCount = 1;

    if (filter?.rule_type) {
      sql += ` AND rule_type = $${paramCount++}`;
      params.push(filter.rule_type);
    }

    if (filter?.strategy) {
      sql += ` AND strategy = $${paramCount++}`;
      params.push(filter.strategy);
    }

    if (filter?.is_active !== undefined) {
      sql += ` AND is_active = $${paramCount++}`;
      params.push(filter.is_active);
    }

    if (filter?.priority_min !== undefined) {
      sql += ` AND priority >= $${paramCount++}`;
      params.push(filter.priority_min);
    }

    if (filter?.priority_max !== undefined) {
      sql += ` AND priority <= $${paramCount++}`;
      params.push(filter.priority_max);
    }

    if (filter?.search) {
      sql += ` AND (name ILIKE $${paramCount++} OR description ILIKE $${paramCount++})`;
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }

    sql += ` ORDER BY priority DESC, created_at DESC`;

    const result = await query<PricingRule>(sql, params);
    return result.rows.map(row => this.parseRule(row));
  }

  /**
   * Get a single pricing rule by ID
   */
  static async getRuleById(ruleId: string): Promise<PricingRule | null> {
    const sql = `SELECT * FROM ${PRICING_TABLES.PRICING_RULES} WHERE rule_id = $1`;
    const result = await query<PricingRule>(sql, [ruleId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseRule(result.rows[0]);
  }

  /**
   * Update a pricing rule
   */
  static async updateRule(ruleId: string, input: UpdatePricingRuleInput): Promise<PricingRule | null> {
    const existing = await this.getRuleById(ruleId);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(input.name);
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(input.description);
    }

    if (input.rule_type !== undefined) {
      updates.push(`rule_type = $${paramCount++}`);
      params.push(input.rule_type);
    }

    if (input.priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      params.push(input.priority);
    }

    if (input.strategy !== undefined) {
      updates.push(`strategy = $${paramCount++}`);
      params.push(input.strategy);
    }

    if (input.config !== undefined) {
      updates.push(`config = $${paramCount++}`);
      params.push(JSON.stringify(input.config));
    }

    if (input.applies_to_categories !== undefined) {
      updates.push(`applies_to_categories = $${paramCount++}`);
      params.push(input.applies_to_categories);
    }

    if (input.applies_to_brands !== undefined) {
      updates.push(`applies_to_brands = $${paramCount++}`);
      params.push(input.applies_to_brands);
    }

    if (input.applies_to_suppliers !== undefined) {
      updates.push(`applies_to_suppliers = $${paramCount++}`);
      params.push(input.applies_to_suppliers);
    }

    if (input.applies_to_products !== undefined) {
      updates.push(`applies_to_products = $${paramCount++}`);
      params.push(input.applies_to_products);
    }

    if (input.last_modified_by !== undefined) {
      updates.push(`last_modified_by = $${paramCount++}`);
      params.push(input.last_modified_by);
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at, no actual changes
      return existing;
    }

    params.push(ruleId);
    const sql = `
      UPDATE ${PRICING_TABLES.PRICING_RULES}
      SET ${updates.join(', ')}
      WHERE rule_id = $${paramCount}
      RETURNING *
    `;

    const result = await query<PricingRule>(sql, params);
    return this.parseRule(result.rows[0]);
  }

  /**
   * Delete a pricing rule
   */
  static async deleteRule(ruleId: string): Promise<boolean> {
    const sql = `DELETE FROM ${PRICING_TABLES.PRICING_RULES} WHERE rule_id = $1`;
    const result = await query(sql, [ruleId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Activate or deactivate a pricing rule
   */
  static async toggleRuleActivation(ruleId: string, isActive: boolean): Promise<PricingRule | null> {
    const sql = `
      UPDATE ${PRICING_TABLES.PRICING_RULES}
      SET is_active = $1, updated_at = NOW()
      WHERE rule_id = $2
      RETURNING *
    `;

    const result = await query<PricingRule>(sql, [isActive, ruleId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseRule(result.rows[0]);
  }

  /**
   * Detect conflicts between pricing rules
   */
  static async detectConflicts(): Promise<RuleConflict[]> {
    const rules = await this.getAllRules({ is_active: true });
    const conflicts: RuleConflict[] = [];

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];

        // Check for priority conflicts (same priority with overlapping scope)
        if (rule1.priority === rule2.priority) {
          const hasOverlap = this.checkScopeOverlap(rule1, rule2);
          if (hasOverlap) {
            conflicts.push({
              rule1,
              rule2,
              conflict_type: 'priority',
              description: `Rules "${rule1.name}" and "${rule2.name}" have the same priority (${rule1.priority}) and overlapping scope`,
              severity: 'high',
            });
          }
        }

        // Check for contradictory configurations
        if (this.hasContradictoryConfig(rule1, rule2)) {
          conflicts.push({
            rule1,
            rule2,
            conflict_type: 'contradictory_config',
            description: `Rules "${rule1.name}" and "${rule2.name}" have contradictory configurations`,
            severity: 'medium',
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Calculate price for a product based on applicable rules
   */
  static async calculateProductPrice(productId: string, baseCost?: number): Promise<ProductPriceCalculation> {
    // Get product details
    const productSql = `
      SELECT p.*, sp.cost
      FROM ${CORE_TABLES.PRODUCT} p
      LEFT JOIN ${CORE_TABLES.SUPPLIER_PRODUCT} sp ON p.product_id = sp.product_id
      WHERE p.product_id = $1
      LIMIT 1
    `;
    const productResult = await query<unknown>(productSql, [productId]);

    if (productResult.rows.length === 0) {
      throw new Error(`Product ${productId} not found`);
    }

    const product = productResult.rows[0];
    const cost = baseCost || product.cost || 0;
    const currentPrice = product.price || 0;

    // Get applicable rules
    const applicableRules = await this.getApplicableRules(product);

    // Apply rules in priority order
    let calculatedPrice = cost;
    const appliedRules: ProductPriceCalculation['applied_rules'] = [];

    for (const rule of applicableRules) {
      const adjustment = this.applyRule(rule, calculatedPrice, cost, product);
      if (adjustment !== 0) {
        calculatedPrice += adjustment;
        appliedRules.push({
          rule_id: rule.rule_id,
          rule_name: rule.name,
          rule_type: rule.rule_type,
          adjustment,
        });
      }
    }

    const finalMarginPercent = cost > 0 ? ((calculatedPrice - cost) / cost) * 100 : 0;

    return {
      product_id: productId,
      current_price: currentPrice,
      calculated_price: calculatedPrice,
      applied_rules: appliedRules,
      final_margin_percent: finalMarginPercent,
    };
  }

  /**
   * Get rules applicable to a specific product
   */
  private static async getApplicableRules(product: unknown): Promise<PricingRule[]> {
    const allRules = await this.getAllRules({ is_active: true });

    return allRules.filter(rule => {
      // Check category applicability
      if (rule.applies_to_categories && rule.applies_to_categories.length > 0) {
        if (!product.category_id || !rule.applies_to_categories.includes(product.category_id)) {
          return false;
        }
      }

      // Check brand applicability
      if (rule.applies_to_brands && rule.applies_to_brands.length > 0) {
        if (!product.brand_id || !rule.applies_to_brands.includes(product.brand_id)) {
          return false;
        }
      }

      // Check supplier applicability
      if (rule.applies_to_suppliers && rule.applies_to_suppliers.length > 0) {
        if (!product.supplier_id || !rule.applies_to_suppliers.includes(product.supplier_id)) {
          return false;
        }
      }

      // Check product-specific applicability
      if (rule.applies_to_products && rule.applies_to_products.length > 0) {
        if (!rule.applies_to_products.includes(product.product_id)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply a single pricing rule to calculate adjustment
   */
  private static applyRule(rule: PricingRule, currentPrice: number, cost: number, product: unknown): number {
    const config = rule.config;

    switch (rule.rule_type) {
      case PricingRuleType.COST_PLUS:
        if (config.markup_percent) {
          return cost * (config.markup_percent / 100);
        }
        if (config.margin_percent) {
          // margin = (price - cost) / price
          // price = cost / (1 - margin/100)
          const targetPrice = cost / (1 - config.margin_percent / 100);
          return targetPrice - currentPrice;
        }
        return 0;

      case PricingRuleType.COMPETITIVE:
        if (config.competitor_offset_percent) {
          return currentPrice * (config.competitor_offset_percent / 100);
        }
        return 0;

      case PricingRuleType.PROMOTIONAL:
        if (config.markup_percent && config.markup_percent < 0) {
          return currentPrice * (config.markup_percent / 100);
        }
        return 0;

      default:
        return 0;
    }
  }

  /**
   * Check if two rules have overlapping scope
   */
  private static checkScopeOverlap(rule1: PricingRule, rule2: PricingRule): boolean {
    // If both have no scope restrictions, they overlap
    if (
      (!rule1.applies_to_categories || rule1.applies_to_categories.length === 0) &&
      (!rule1.applies_to_brands || rule1.applies_to_brands.length === 0) &&
      (!rule1.applies_to_suppliers || rule1.applies_to_suppliers.length === 0) &&
      (!rule1.applies_to_products || rule1.applies_to_products.length === 0) &&
      (!rule2.applies_to_categories || rule2.applies_to_categories.length === 0) &&
      (!rule2.applies_to_brands || rule2.applies_to_brands.length === 0) &&
      (!rule2.applies_to_suppliers || rule2.applies_to_suppliers.length === 0) &&
      (!rule2.applies_to_products || rule2.applies_to_products.length === 0)
    ) {
      return true;
    }

    // Check category overlap
    if (rule1.applies_to_categories && rule2.applies_to_categories) {
      const overlap = rule1.applies_to_categories.some(cat =>
        rule2.applies_to_categories!.includes(cat)
      );
      if (overlap) return true;
    }

    // Check brand overlap
    if (rule1.applies_to_brands && rule2.applies_to_brands) {
      const overlap = rule1.applies_to_brands.some(brand =>
        rule2.applies_to_brands!.includes(brand)
      );
      if (overlap) return true;
    }

    // Check product overlap
    if (rule1.applies_to_products && rule2.applies_to_products) {
      const overlap = rule1.applies_to_products.some(prod =>
        rule2.applies_to_products!.includes(prod)
      );
      if (overlap) return true;
    }

    return false;
  }

  /**
   * Check if two rules have contradictory configurations
   */
  private static hasContradictoryConfig(rule1: PricingRule, rule2: PricingRule): boolean {
    // Example: One rule says maximize revenue, another says maximize volume
    if (rule1.strategy === PricingStrategy.MAXIMIZE_REVENUE &&
        rule2.strategy === PricingStrategy.MAXIMIZE_VOLUME) {
      return true;
    }

    if (rule1.strategy === PricingStrategy.PREMIUM_POSITIONING &&
        rule2.strategy === PricingStrategy.VALUE_POSITIONING) {
      return true;
    }

    return false;
  }

  /**
   * Parse database row to PricingRule object
   */
  private static parseRule(row: unknown): PricingRule {
    return {
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
