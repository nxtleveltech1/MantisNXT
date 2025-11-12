/**
 * Pricing Rule Service
 *
 * Handles CRUD operations for pricing rules, rule evaluation,
 * conflict detection, and rule application logic.
 */

import { query } from '@/lib/database';
import type { PricingRule } from '@/lib/db/pricing-schema';
import { PRICING_TABLES, PricingRuleType, PricingStrategy } from '@/lib/db/pricing-schema';
import { CORE_TABLES } from '@/lib/db/schema-contract';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';

type DbPricingRuleRow = {
  id: string;
  org_id: string | null;
  name: string;
  description: string | null;
  strategy: string;
  priority: number | null;
  is_active: boolean;
  markup_percentage: number | string | null;
  fixed_margin: number | string | null;
  min_price: number | string | null;
  max_price: number | string | null;
  conditions: unknown;
  category_id: string | null;
  brand_id: string | null;
  supplier_id: string | null;
  inventory_item_id: string | null;
  valid_from: string | null;
  valid_until: string | null;
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
    const dbStrategy = this.mapRuleTypeToDbStrategy(input.rule_type);
    const pricingStrategy = input.strategy ?? PricingStrategy.MAXIMIZE_PROFIT;

    const conditions = this.buildConditions({
      base: {},
      pricingStrategy,
      ruleType: input.rule_type,
      config: input.config,
      applies_to_categories: input.applies_to_categories,
      applies_to_brands: input.applies_to_brands,
      applies_to_suppliers: input.applies_to_suppliers,
      applies_to_products: input.applies_to_products,
    });

    const result = await query<DbPricingRuleRow>(
      `
        INSERT INTO ${PRICING_TABLES.PRICING_RULES} (
          org_id,
          name,
          description,
          strategy,
          inventory_item_id,
          category_id,
          supplier_id,
          brand_id,
          markup_percentage,
          fixed_margin,
          min_price,
          max_price,
          conditions,
          is_active,
          priority,
          valid_from,
          valid_until
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING *
      `,
      [
        DEFAULT_ORG_ID,
        input.name,
        input.description ?? null,
        dbStrategy,
        input.applies_to_products?.[0] ?? null,
        input.applies_to_categories?.[0] ?? null,
        input.applies_to_suppliers?.[0] ?? null,
        input.applies_to_brands?.[0] ?? null,
        input.config?.markup_percent ?? null,
        input.config?.margin_percent ?? null,
        input.config?.min_price ?? null,
        input.config?.max_price ?? null,
        JSON.stringify(conditions),
        true,
        input.priority,
        new Date(),
        null,
      ],
    );

    return this.parseRule(result.rows[0]);
  }

  /**
   * Get all pricing rules with optional filtering
   */
  static async getAllRules(filter?: PricingRuleFilter): Promise<PricingRule[]> {
    let sql = `
      SELECT
        id,
        org_id,
        name,
        description,
        strategy,
        priority,
        is_active,
        markup_percentage,
        fixed_margin,
        min_price,
        max_price,
        conditions,
        category_id,
        brand_id,
        supplier_id,
        inventory_item_id,
        valid_from,
        valid_until,
        created_at,
        updated_at
      FROM ${PRICING_TABLES.PRICING_RULES}
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramCount = 1;

    if (filter?.rule_type) {
      sql += ` AND strategy = $${paramCount++}`;
      params.push(this.mapRuleTypeToDbStrategy(filter.rule_type));
    }

    if (filter?.strategy) {
      sql += ` AND conditions ->> 'pricing_strategy' = $${paramCount++}`;
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

    sql += ` ORDER BY priority DESC NULLS LAST, created_at DESC`;

    const result = await query<DbPricingRuleRow>(sql, params);
    return result.rows.map(row => this.parseRule(row));
  }

  /**
   * Get a single pricing rule by ID
   */
  static async getRuleById(ruleId: string): Promise<PricingRule | null> {
    const result = await query<DbPricingRuleRow>(
      `
        SELECT
          id,
          org_id,
          name,
          description,
          strategy,
          priority,
          is_active,
          markup_percentage,
          fixed_margin,
          min_price,
          max_price,
          conditions,
          category_id,
          brand_id,
          supplier_id,
          inventory_item_id,
          valid_from,
          valid_until,
          created_at,
          updated_at
        FROM ${PRICING_TABLES.PRICING_RULES}
        WHERE id = $1
      `,
      [ruleId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseRule(result.rows[0]);
  }

  /**
   * Update a pricing rule
   */
  static async updateRule(ruleId: string, input: UpdatePricingRuleInput): Promise<PricingRule | null> {
    const existingResult = await query<DbPricingRuleRow>(
      `
        SELECT *
        FROM ${PRICING_TABLES.PRICING_RULES}
        WHERE id = $1
      `,
      [ruleId],
    );

    if (existingResult.rows.length === 0) {
      return null;
    }

    const existingRow = existingResult.rows[0];
    const existing = this.parseRule(existingRow);

    const updatedName = input.name ?? existing.name;
    const updatedDescription = input.description ?? existing.description ?? null;
    const updatedRuleType = input.rule_type ?? existing.rule_type;
    const updatedStrategy = input.strategy ?? existing.strategy ?? PricingStrategy.MAXIMIZE_PROFIT;
    const updatedPriority = input.priority ?? existing.priority ?? 0;
    const updatedConfig: PricingRule['config'] = input.config ?? existing.config ?? {};
    const updatedCategories = input.applies_to_categories ?? existing.applies_to_categories ?? [];
    const updatedBrands = input.applies_to_brands ?? existing.applies_to_brands ?? [];
    const updatedSuppliers = input.applies_to_suppliers ?? existing.applies_to_suppliers ?? [];
    const updatedProducts = input.applies_to_products ?? existing.applies_to_products ?? [];

    const mergedConditions = this.buildConditions({
      base: this.parseConditions(existingRow.conditions),
      pricingStrategy: updatedStrategy,
      ruleType: updatedRuleType,
      config: updatedConfig,
      applies_to_categories: updatedCategories,
      applies_to_brands: updatedBrands,
      applies_to_suppliers: updatedSuppliers,
      applies_to_products: updatedProducts,
    });

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramCount = 1;

    updates.push(`name = $${paramCount++}`);
    params.push(updatedName);

    updates.push(`description = $${paramCount++}`);
    params.push(updatedDescription);

    updates.push(`strategy = $${paramCount++}`);
    params.push(this.mapRuleTypeToDbStrategy(updatedRuleType));

    updates.push(`priority = $${paramCount++}`);
    params.push(updatedPriority);

    updates.push(`markup_percentage = $${paramCount++}`);
    params.push(updatedConfig?.markup_percent ?? null);

    updates.push(`fixed_margin = $${paramCount++}`);
    params.push(updatedConfig?.margin_percent ?? null);

    updates.push(`min_price = $${paramCount++}`);
    params.push(updatedConfig?.min_price ?? null);

    updates.push(`max_price = $${paramCount++}`);
    params.push(updatedConfig?.max_price ?? null);

    updates.push(`category_id = $${paramCount++}`);
    params.push(updatedCategories[0] ?? null);

    updates.push(`brand_id = $${paramCount++}`);
    params.push(updatedBrands[0] ?? null);

    updates.push(`supplier_id = $${paramCount++}`);
    params.push(updatedSuppliers[0] ?? null);

    updates.push(`inventory_item_id = $${paramCount++}`);
    params.push(updatedProducts[0] ?? null);

    updates.push(`conditions = $${paramCount++}`);
    params.push(JSON.stringify(mergedConditions));

    updates.push(`updated_at = NOW()`);

    params.push(ruleId);

    const result = await query<DbPricingRuleRow>(
      `
        UPDATE ${PRICING_TABLES.PRICING_RULES}
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `,
      params,
    );

    return this.parseRule(result.rows[0]);
  }

  /**
   * Delete a pricing rule
   */
  static async deleteRule(ruleId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM ${PRICING_TABLES.PRICING_RULES} WHERE id = $1`,
      [ruleId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Activate or deactivate a pricing rule
   */
  static async toggleRuleActivation(ruleId: string, isActive: boolean): Promise<PricingRule | null> {
    const result = await query<DbPricingRuleRow>(
      `
        UPDATE ${PRICING_TABLES.PRICING_RULES}
        SET is_active = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [isActive, ruleId],
    );

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

        if (rule1.priority === rule2.priority) {
          const hasOverlap = this.checkScopeOverlap(rule1, rule2);
          if (hasOverlap) {
            conflicts.push({
              rule1,
              rule2,
              conflict_type: 'priority',
              description: `Rules "${rule1.name}" and "${rule2.name}" share priority ${rule1.priority} with overlapping scope`,
              severity: 'high',
            });
          }
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
  static async calculateProductPrice(productId: string, baseCost?: number): Promise<ProductPriceCalculation> {
    const productResult = await query<unknown>(
      `
        SELECT p.*, sp.cost
        FROM ${CORE_TABLES.PRODUCT} p
        LEFT JOIN ${CORE_TABLES.SUPPLIER_PRODUCT} sp ON p.product_id = sp.product_id
        WHERE p.product_id = $1
        LIMIT 1
      `,
      [productId],
    );

    if (productResult.rows.length === 0) {
      throw new Error(`Product ${productId} not found`);
    }

    const product = productResult.rows[0];
    const cost = baseCost || product.cost || 0;
    const currentPrice = product.price || 0;

    const applicableRules = await this.getApplicableRules(product);

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
      if (rule.applies_to_categories?.length) {
        if (!product.category_id || !rule.applies_to_categories.includes(product.category_id)) {
          return false;
        }
      }

      if (rule.applies_to_brands?.length) {
        if (!product.brand_id || !rule.applies_to_brands.includes(product.brand_id)) {
          return false;
        }
      }

      if (rule.applies_to_suppliers?.length) {
        if (!product.supplier_id || !rule.applies_to_suppliers.includes(product.supplier_id)) {
          return false;
        }
      }

      if (rule.applies_to_products?.length) {
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

    if (rule1.applies_to_categories && rule2.applies_to_categories) {
      const overlap = rule1.applies_to_categories.some(cat => rule2.applies_to_categories!.includes(cat));
      if (overlap) return true;
    }

    if (rule1.applies_to_brands && rule2.applies_to_brands) {
      const overlap = rule1.applies_to_brands.some(brand => rule2.applies_to_brands!.includes(brand));
      if (overlap) return true;
    }

    if (rule1.applies_to_products && rule2.applies_to_products) {
      const overlap = rule1.applies_to_products.some(prod => rule2.applies_to_products!.includes(prod));
      if (overlap) return true;
    }

    return false;
  }

  /**
   * Check if two rules have contradictory configurations
   */
  private static hasContradictoryConfig(rule1: PricingRule, rule2: PricingRule): boolean {
    if (
      (rule1.strategy === PricingStrategy.MAXIMIZE_REVENUE && rule2.strategy === PricingStrategy.MAXIMIZE_VOLUME) ||
      (rule2.strategy === PricingStrategy.MAXIMIZE_REVENUE && rule1.strategy === PricingStrategy.MAXIMIZE_VOLUME)
    ) {
      return true;
    }

    if (
      (rule1.strategy === PricingStrategy.PREMIUM_POSITIONING && rule2.strategy === PricingStrategy.VALUE_POSITIONING) ||
      (rule2.strategy === PricingStrategy.PREMIUM_POSITIONING && rule1.strategy === PricingStrategy.VALUE_POSITIONING)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Parse a database row into a PricingRule
   */
  private static parseRule(row: DbPricingRuleRow): PricingRule {
    const conditions = this.parseConditions(row.conditions);
    const config = this.extractConfig(row, conditions);
    const applies = this.extractApplies(conditions, row);

    return {
      rule_id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      rule_type: this.mapDbStrategyToRuleType(row.strategy),
      priority: row.priority ?? 0,
      is_active: row.is_active ?? true,
      strategy: this.mapStoredStrategyToEnum(conditions.pricing_strategy),
      config,
      applies_to_categories: applies.categories,
      applies_to_brands: applies.brands,
      applies_to_suppliers: applies.suppliers,
      applies_to_products: applies.products,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      created_by: undefined,
      last_modified_by: undefined,
    };
  }

  private static parseConditions(value: unknown): Record<string, unknown> {
    if (!value) {
      return {};
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value) ?? {};
      } catch {
        return {};
      }
    }

    if (typeof value === 'object') {
      return { ...(value as Record<string, unknown>) };
    }

    return {};
  }

  private static buildConditions(options: {
    base: Record<string, unknown>;
    pricingStrategy: PricingStrategy;
    ruleType: PricingRuleType;
    config: PricingRule['config'];
    applies_to_categories?: string[];
    applies_to_brands?: string[];
    applies_to_suppliers?: string[];
    applies_to_products?: string[];
  }): Record<string, unknown> {
    const base = { ...(options.base ?? {}) };

    base.pricing_strategy = options.pricingStrategy;
    base.rule_type = options.ruleType;
    base.config = options.config ?? {};
    base.applies_to_categories = options.applies_to_categories ?? [];
    base.applies_to_brands = options.applies_to_brands ?? [];
    base.applies_to_suppliers = options.applies_to_suppliers ?? [];
    base.applies_to_products = options.applies_to_products ?? [];

    return base;
  }

  private static extractConfig(
    row: DbPricingRuleRow,
    conditions: Record<string, unknown>,
  ): PricingRule['config'] {
    const rawConfig =
      typeof conditions.config === 'object' && conditions.config !== null
        ? { ...(conditions.config as Record<string, unknown>) }
        : {};

    const config = rawConfig as PricingRule['config'];

    const markup = this.parseNumber(row.markup_percentage);
    if (markup !== undefined && config.markup_percent === undefined) {
      config.markup_percent = markup;
    }

    const margin = this.parseNumber(row.fixed_margin);
    if (margin !== undefined && config.margin_percent === undefined) {
      config.margin_percent = margin;
    }

    const minPrice = this.parseNumber(row.min_price);
    if (minPrice !== undefined && config.min_price === undefined) {
      config.min_price = minPrice;
    }

    const maxPrice = this.parseNumber(row.max_price);
    if (maxPrice !== undefined && config.max_price === undefined) {
      config.max_price = maxPrice;
    }

    return config;
  }

  private static extractApplies(
    conditions: Record<string, unknown>,
    row: DbPricingRuleRow,
  ): {
    categories: string[];
    brands: string[];
    suppliers: string[];
    products: string[];
  } {
    const toArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter(Boolean) : [];

    const categories = toArray(conditions.applies_to_categories);
    if (!categories.length && row.category_id) {
      categories.push(row.category_id);
    }

    const brands = toArray(conditions.applies_to_brands);
    if (!brands.length && row.brand_id) {
      brands.push(row.brand_id);
    }

    const suppliers = toArray(conditions.applies_to_suppliers);
    if (!suppliers.length && row.supplier_id) {
      suppliers.push(row.supplier_id);
    }

    const products = toArray(conditions.applies_to_products);
    if (!products.length && row.inventory_item_id) {
      products.push(row.inventory_item_id);
    }

    return { categories, brands, suppliers, products };
  }

  private static parseNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private static mapRuleTypeToDbStrategy(type: PricingRuleType): string {
    switch (type) {
      case PricingRuleType.COST_PLUS:
        return 'cost_plus';
      case PricingRuleType.MARKET_BASED:
        return 'market_based';
      case PricingRuleType.COMPETITIVE:
        return 'competitive';
      case PricingRuleType.DYNAMIC:
        return 'dynamic';
      case PricingRuleType.BUNDLE:
      case PricingRuleType.CLEARANCE:
      case PricingRuleType.PROMOTIONAL:
        return 'dynamic';
      default:
        return 'cost_plus';
    }
  }

  private static mapDbStrategyToRuleType(strategy: string): PricingRuleType {
    switch (strategy) {
      case 'cost_plus':
        return PricingRuleType.COST_PLUS;
      case 'market_based':
      case 'value_based':
        return PricingRuleType.MARKET_BASED;
      case 'competitive':
        return PricingRuleType.COMPETITIVE;
      case 'dynamic':
      case 'tiered':
        return PricingRuleType.DYNAMIC;
      default:
        return PricingRuleType.COST_PLUS;
    }
  }

  private static mapStoredStrategyToEnum(value: unknown): PricingStrategy {
    if (typeof value !== 'string') {
      return PricingStrategy.MAXIMIZE_PROFIT;
    }

    const normalised = value.toLowerCase();

    switch (normalised) {
      case PricingStrategy.MAXIMIZE_REVENUE:
        return PricingStrategy.MAXIMIZE_REVENUE;
      case PricingStrategy.MAXIMIZE_PROFIT:
        return PricingStrategy.MAXIMIZE_PROFIT;
      case PricingStrategy.MAXIMIZE_VOLUME:
        return PricingStrategy.MAXIMIZE_VOLUME;
      case PricingStrategy.MATCH_COMPETITION:
        return PricingStrategy.MATCH_COMPETITION;
      case PricingStrategy.PREMIUM_POSITIONING:
        return PricingStrategy.PREMIUM_POSITIONING;
      case PricingStrategy.VALUE_POSITIONING:
        return PricingStrategy.VALUE_POSITIONING;
      default:
        return PricingStrategy.MAXIMIZE_PROFIT;
    }
  }
}

