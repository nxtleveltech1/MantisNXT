/**
 * Pricing Rule Service
 *
 * Handles CRUD operations for pricing rules, rule evaluation,
 * conflict detection, and rule application logic.
 *
 * All methods require an authenticated org_id parameter.
 */

import { query } from '@/lib/database';
import type { PricingRule } from '@/lib/db/pricing-schema';
import { PRICING_TABLES, PricingRuleType, PricingStrategy } from '@/lib/db/pricing-schema';
import { CORE_TABLES } from '@/lib/db/schema-contract';

type DbPricingRuleRow = {
  rule_id: string;
  org_id: string;
  name: string;
  description: string | null;
  rule_type: string;
  strategy: string;
  priority: number;
  is_active: boolean;
  is_global: boolean;
  currency: string;
  markup_percentage: number | string | null;
  fixed_margin: number | string | null;
  min_price: number | string | null;
  max_price: number | string | null;
  config: unknown;
  conditions: unknown;
  category_id: string | null;
  brand_id: string | null;
  supplier_id: string | null;
  inventory_item_id: string | null;
  category_ids: string[] | null;
  brand_ids: string[] | null;
  supplier_ids: string[] | null;
  product_ids: string[] | null;
  valid_from: string | null;
  valid_until: string | null;
  created_by: string | null;
  last_modified_by: string | null;
  created_at: string;
  updated_at: string;
};

export interface CreatePricingRuleInput {
  name: string;
  description?: string;
  rule_type: PricingRuleType;
  priority: number;
  strategy: PricingStrategy;
  config: PricingRule['config'];
  currency?: string;
  applies_to_categories?: string[];
  applies_to_brands?: string[];
  applies_to_suppliers?: string[];
  applies_to_products?: string[];
  valid_from?: Date;
  valid_until?: Date;
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
  static async createRule(orgId: string, input: CreatePricingRuleInput): Promise<PricingRule> {
    const isGlobal =
      !input.applies_to_products?.length &&
      !input.applies_to_categories?.length &&
      !input.applies_to_suppliers?.length &&
      !input.applies_to_brands?.length;

    const result = await query<DbPricingRuleRow>(
      `
        INSERT INTO ${PRICING_TABLES.PRICING_RULES} (
          org_id, name, description, rule_type, strategy, priority,
          is_active, is_global, currency,
          inventory_item_id, category_id, supplier_id, brand_id,
          category_ids, brand_ids, supplier_ids, product_ids,
          markup_percentage, fixed_margin, min_price, max_price,
          config, conditions, valid_from, valid_until, created_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          true, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19, $20,
          $21, $22, $23, $24, $25
        )
        RETURNING *
      `,
      [
        orgId,
        input.name,
        input.description ?? null,
        input.rule_type,
        input.strategy ?? PricingStrategy.MAXIMIZE_PROFIT,
        input.priority,
        isGlobal,
        input.currency ?? 'ZAR',
        input.applies_to_products?.[0] ?? null,
        input.applies_to_categories?.[0] ?? null,
        input.applies_to_suppliers?.[0] ?? null,
        input.applies_to_brands?.[0] ?? null,
        input.applies_to_categories?.length ? input.applies_to_categories : null,
        input.applies_to_brands?.length ? input.applies_to_brands : null,
        input.applies_to_suppliers?.length ? input.applies_to_suppliers : null,
        input.applies_to_products?.length ? input.applies_to_products : null,
        input.config?.markup_percent ?? null,
        input.config?.margin_percent ?? null,
        input.config?.min_price ?? null,
        input.config?.max_price ?? null,
        JSON.stringify(input.config ?? {}),
        JSON.stringify({}),
        input.valid_from ?? new Date(),
        input.valid_until ?? null,
        input.created_by ?? null,
      ]
    );

    return this.parseRule(result.rows[0]);
  }

  /**
   * Get all pricing rules for an org, with optional filtering.
   * Also returns global rules.
   */
  static async getAllRules(orgId: string, filter?: PricingRuleFilter): Promise<PricingRule[]> {
    let sql = `
      SELECT *
      FROM ${PRICING_TABLES.PRICING_RULES}
      WHERE (org_id = $1 OR is_global = true)
    `;
    const params: unknown[] = [orgId];
    let paramCount = 2;

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
      sql += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount + 1})`;
      params.push(`%${filter.search}%`, `%${filter.search}%`);
      paramCount += 2;
    }

    sql += ` ORDER BY priority DESC, created_at DESC`;

    const result = await query<DbPricingRuleRow>(sql, params);
    return result.rows.map(row => this.parseRule(row));
  }

  /**
   * Get a single pricing rule by ID, scoped to org
   */
  static async getRuleById(orgId: string, ruleId: string): Promise<PricingRule | null> {
    const result = await query<DbPricingRuleRow>(
      `SELECT * FROM ${PRICING_TABLES.PRICING_RULES} WHERE rule_id = $1 AND (org_id = $2 OR is_global = true)`,
      [ruleId, orgId]
    );
    if (result.rows.length === 0) return null;
    return this.parseRule(result.rows[0]);
  }

  /**
   * Update a pricing rule
   */
  static async updateRule(
    orgId: string,
    ruleId: string,
    input: UpdatePricingRuleInput
  ): Promise<PricingRule | null> {
    const existing = await this.getRuleById(orgId, ruleId);
    if (!existing) return null;

    const updatedName = input.name ?? existing.name;
    const updatedDescription = input.description ?? existing.description ?? null;
    const updatedRuleType = input.rule_type ?? existing.rule_type;
    const updatedStrategy = input.strategy ?? existing.strategy;
    const updatedPriority = input.priority ?? existing.priority;
    const updatedConfig = input.config ?? existing.config;
    const updatedCategories = input.applies_to_categories ?? existing.applies_to_categories ?? [];
    const updatedBrands = input.applies_to_brands ?? existing.applies_to_brands ?? [];
    const updatedSuppliers = input.applies_to_suppliers ?? existing.applies_to_suppliers ?? [];
    const updatedProducts = input.applies_to_products ?? existing.applies_to_products ?? [];

    const isGlobal =
      !updatedProducts.length &&
      !updatedCategories.length &&
      !updatedSuppliers.length &&
      !updatedBrands.length;

    const result = await query<DbPricingRuleRow>(
      `
        UPDATE ${PRICING_TABLES.PRICING_RULES}
        SET name = $1, description = $2, rule_type = $3, strategy = $4,
            priority = $5, is_global = $6,
            markup_percentage = $7, fixed_margin = $8, min_price = $9, max_price = $10,
            category_id = $11, brand_id = $12, supplier_id = $13, inventory_item_id = $14,
            category_ids = $15, brand_ids = $16, supplier_ids = $17, product_ids = $18,
            config = $19, updated_at = NOW(), last_modified_by = $20
        WHERE rule_id = $21 AND org_id = $22
        RETURNING *
      `,
      [
        updatedName,
        updatedDescription,
        updatedRuleType,
        updatedStrategy,
        updatedPriority,
        isGlobal,
        updatedConfig?.markup_percent ?? null,
        updatedConfig?.margin_percent ?? null,
        updatedConfig?.min_price ?? null,
        updatedConfig?.max_price ?? null,
        updatedCategories[0] ?? null,
        updatedBrands[0] ?? null,
        updatedSuppliers[0] ?? null,
        updatedProducts[0] ?? null,
        updatedCategories.length ? updatedCategories : null,
        updatedBrands.length ? updatedBrands : null,
        updatedSuppliers.length ? updatedSuppliers : null,
        updatedProducts.length ? updatedProducts : null,
        JSON.stringify(updatedConfig ?? {}),
        input.last_modified_by ?? null,
        ruleId,
        orgId,
      ]
    );

    if (result.rows.length === 0) return null;
    return this.parseRule(result.rows[0]);
  }

  /**
   * Delete a pricing rule
   */
  static async deleteRule(orgId: string, ruleId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM ${PRICING_TABLES.PRICING_RULES} WHERE rule_id = $1 AND org_id = $2`,
      [ruleId, orgId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Toggle rule activation
   */
  static async toggleRuleActivation(
    orgId: string,
    ruleId: string,
    isActive: boolean
  ): Promise<PricingRule | null> {
    const result = await query<DbPricingRuleRow>(
      `UPDATE ${PRICING_TABLES.PRICING_RULES} SET is_active = $1, updated_at = NOW() WHERE rule_id = $2 AND org_id = $3 RETURNING *`,
      [isActive, ruleId, orgId]
    );
    if (result.rows.length === 0) return null;
    return this.parseRule(result.rows[0]);
  }

  /**
   * Detect conflicts between active rules for an org
   */
  static async detectConflicts(orgId: string): Promise<RuleConflict[]> {
    const rules = await this.getAllRules(orgId, { is_active: true });
    const conflicts: RuleConflict[] = [];

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];

        if (rule1.priority === rule2.priority && this.checkScopeOverlap(rule1, rule2)) {
          conflicts.push({
            rule1,
            rule2,
            conflict_type: 'priority',
            description: `Rules "${rule1.name}" and "${rule2.name}" share priority ${rule1.priority} with overlapping scope`,
            severity: 'high',
          });
        }

        if (this.hasContradictoryConfig(rule1, rule2)) {
          conflicts.push({
            rule1,
            rule2,
            conflict_type: 'contradictory_config',
            description: `Rules "${rule1.name}" and "${rule2.name}" target opposing strategies`,
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
  static async calculateProductPrice(
    orgId: string,
    productId: string,
    baseCost?: number
  ): Promise<ProductPriceCalculation> {
    const productResult = await query<Record<string, unknown>>(
      `
        SELECT p.*, sp.cost
        FROM ${CORE_TABLES.PRODUCT} p
        LEFT JOIN ${CORE_TABLES.SUPPLIER_PRODUCT} sp ON p.product_id = sp.product_id
        WHERE p.product_id = $1
        LIMIT 1
      `,
      [productId]
    );

    if (productResult.rows.length === 0) {
      throw new Error(`Product ${productId} not found`);
    }

    const product = productResult.rows[0];
    const cost = baseCost || (product.cost as number) || 0;
    const currentPrice = (product.price as number) || 0;

    const allRules = await this.getAllRules(orgId, { is_active: true });
    const applicableRules = allRules.filter(rule => this.ruleAppliesToProduct(rule, product));

    let calculatedPrice = cost;
    const appliedRules: ProductPriceCalculation['applied_rules'] = [];

    for (const rule of applicableRules) {
      const adjustment = this.applyRule(rule, calculatedPrice, cost);
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

  // ─── Private helpers ───────────────────────────────────

  private static ruleAppliesToProduct(
    rule: PricingRule,
    product: Record<string, unknown>
  ): boolean {
    if (rule.is_global) return true;

    if (rule.applies_to_products?.length) {
      if (!rule.applies_to_products.includes(product.product_id as string)) return false;
    }
    if (rule.applies_to_categories?.length) {
      if (
        !product.category_id ||
        !rule.applies_to_categories.includes(product.category_id as string)
      )
        return false;
    }
    if (rule.applies_to_brands?.length) {
      if (!product.brand_id || !rule.applies_to_brands.includes(product.brand_id as string))
        return false;
    }
    if (rule.applies_to_suppliers?.length) {
      if (
        !product.supplier_id ||
        !rule.applies_to_suppliers.includes(product.supplier_id as string)
      )
        return false;
    }
    return true;
  }

  private static applyRule(rule: PricingRule, currentPrice: number, cost: number): number {
    const config = rule.config;

    switch (rule.rule_type) {
      case PricingRuleType.COST_PLUS:
        if (config.markup_percent) return cost * (config.markup_percent / 100);
        if (config.margin_percent) {
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

  private static checkScopeOverlap(rule1: PricingRule, rule2: PricingRule): boolean {
    const isEmpty = (r: PricingRule) =>
      !r.applies_to_categories?.length &&
      !r.applies_to_brands?.length &&
      !r.applies_to_suppliers?.length &&
      !r.applies_to_products?.length;

    if (isEmpty(rule1) && isEmpty(rule2)) return true;

    const arrayOverlap = (a?: string[], b?: string[]) =>
      a?.length && b?.length && a.some(v => b.includes(v));

    return !!(
      arrayOverlap(rule1.applies_to_categories, rule2.applies_to_categories) ||
      arrayOverlap(rule1.applies_to_brands, rule2.applies_to_brands) ||
      arrayOverlap(rule1.applies_to_products, rule2.applies_to_products)
    );
  }

  private static hasContradictoryConfig(rule1: PricingRule, rule2: PricingRule): boolean {
    const contradictions: [PricingStrategy, PricingStrategy][] = [
      [PricingStrategy.MAXIMIZE_REVENUE, PricingStrategy.MAXIMIZE_VOLUME],
      [PricingStrategy.PREMIUM_POSITIONING, PricingStrategy.VALUE_POSITIONING],
    ];
    return contradictions.some(
      ([a, b]) =>
        (rule1.strategy === a && rule2.strategy === b) ||
        (rule1.strategy === b && rule2.strategy === a)
    );
  }

  private static parseRule(row: DbPricingRuleRow): PricingRule {
    const configJson = this.parseJson(row.config);
    const config: PricingRule['config'] = {
      ...configJson,
      markup_percent: this.parseNumber(row.markup_percentage) ?? configJson.markup_percent,
      margin_percent: this.parseNumber(row.fixed_margin) ?? configJson.margin_percent,
      min_price: this.parseNumber(row.min_price) ?? configJson.min_price,
      max_price: this.parseNumber(row.max_price) ?? configJson.max_price,
    };

    return {
      rule_id: row.rule_id,
      org_id: row.org_id,
      name: row.name,
      description: row.description ?? undefined,
      rule_type: (row.rule_type as PricingRuleType) || PricingRuleType.COST_PLUS,
      priority: row.priority ?? 0,
      is_active: row.is_active,
      is_global: row.is_global,
      strategy: (row.strategy as PricingStrategy) || PricingStrategy.MAXIMIZE_PROFIT,
      currency: row.currency ?? 'ZAR',
      config,
      applies_to_categories: row.category_ids ?? (row.category_id ? [row.category_id] : []),
      applies_to_brands: row.brand_ids ?? (row.brand_id ? [row.brand_id] : []),
      applies_to_suppliers: row.supplier_ids ?? (row.supplier_id ? [row.supplier_id] : []),
      applies_to_products: row.product_ids ?? (row.inventory_item_id ? [row.inventory_item_id] : []),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      created_by: row.created_by ?? undefined,
      last_modified_by: row.last_modified_by ?? undefined,
    };
  }

  private static parseJson(value: unknown): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) ?? {};
      } catch {
        return {};
      }
    }
    if (typeof value === 'object') return { ...(value as Record<string, unknown>) };
    return {};
  }

  private static parseNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) return undefined;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
}
