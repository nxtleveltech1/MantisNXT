/**
 * Discount Calculation Service
 * Handles priority-based discount rule matching and calculation
 */

import { query } from '@/lib/database';

export interface DiscountRule {
  discount_rule_id: string;
  supplier_id: string;
  rule_name: string;
  discount_percent: number;
  scope_type: 'supplier' | 'category' | 'brand' | 'sku';
  category_id?: string | null;
  brand_id?: string | null;
  supplier_sku?: string | null;
  priority: number;
  is_active: boolean;
  valid_from: Date | string;
  valid_until?: Date | string | null;
}

export interface EffectiveDiscountResult {
  discount_percent: number;
  rule_id: string | null;
  rule_name: string | null;
  scope_type: string | null;
  source: 'rule' | 'base_discount' | 'none';
}

export class DiscountCalculationService {
  /**
   * Get effective discount for a product based on applicable rules
   * Priority order: SKU > Brand > Category > Supplier (base discount)
   */
  static async getEffectiveDiscount(params: {
    supplierId: string;
    productId?: string;
    categoryId?: string | null;
    brandId?: string | null;
    supplierSku?: string | null;
  }): Promise<EffectiveDiscountResult> {
    const { supplierId, categoryId, brandId, supplierSku } = params;

    const now = new Date();

    // Query all active discount rules for this supplier, ordered by priority DESC
    // Then we'll match them in order: SKU > Brand > Category > Supplier
    const rulesSql = `
      SELECT 
        discount_rule_id,
        supplier_id,
        rule_name,
        discount_percent,
        scope_type,
        category_id,
        brand_id,
        supplier_sku,
        priority,
        is_active,
        valid_from,
        valid_until
      FROM core.supplier_discount_rules
      WHERE supplier_id = $1
        AND is_active = true
        AND valid_from <= $2
        AND (valid_until IS NULL OR valid_until >= $2)
      ORDER BY 
        CASE scope_type
          WHEN 'sku' THEN 4
          WHEN 'brand' THEN 3
          WHEN 'category' THEN 2
          WHEN 'supplier' THEN 1
        END DESC,
        priority DESC,
        created_at DESC
    `;

    const rulesResult = await query<DiscountRule>(rulesSql, [supplierId, now]);
    const rules = rulesResult.rows;

    // Match rules in priority order: SKU > Brand > Category > Supplier
    for (const rule of rules) {
      // SKU-level rule
      if (rule.scope_type === 'sku' && supplierSku && rule.supplier_sku === supplierSku) {
        return {
          discount_percent: Number(rule.discount_percent),
          rule_id: rule.discount_rule_id,
          rule_name: rule.rule_name,
          scope_type: rule.scope_type,
          source: 'rule',
        };
      }

      // Brand-level rule
      if (rule.scope_type === 'brand' && brandId && rule.brand_id === brandId) {
        return {
          discount_percent: Number(rule.discount_percent),
          rule_id: rule.discount_rule_id,
          rule_name: rule.rule_name,
          scope_type: rule.scope_type,
          source: 'rule',
        };
      }

      // Category-level rule
      if (rule.scope_type === 'category' && categoryId && rule.category_id === categoryId) {
        return {
          discount_percent: Number(rule.discount_percent),
          rule_id: rule.discount_rule_id,
          rule_name: rule.rule_name,
          scope_type: rule.scope_type,
          source: 'rule',
        };
      }

      // Supplier-level rule (fallback, lowest priority)
      if (rule.scope_type === 'supplier') {
        return {
          discount_percent: Number(rule.discount_percent),
          rule_id: rule.discount_rule_id,
          rule_name: rule.rule_name,
          scope_type: rule.scope_type,
          source: 'rule',
        };
      }
    }

    // Fallback to supplier's base_discount_percent if no rules match
    const baseDiscountSql = `
      SELECT base_discount_percent
      FROM core.supplier
      WHERE supplier_id = $1
    `;

    const baseResult = await query<{ base_discount_percent: number | null }>(
      baseDiscountSql,
      [supplierId]
    );

    const baseDiscount = baseResult.rows[0]?.base_discount_percent || 0;

    if (baseDiscount > 0) {
      return {
        discount_percent: Number(baseDiscount),
        rule_id: null,
        rule_name: null,
        scope_type: null,
        source: 'base_discount',
      };
    }

    return {
      discount_percent: 0,
      rule_id: null,
      rule_name: null,
      scope_type: null,
      source: 'none',
    };
  }

  /**
   * Get all applicable discount rules for a product (for display/debugging)
   */
  static async getApplicableRules(params: {
    supplierId: string;
    categoryId?: string | null;
    brandId?: string | null;
    supplierSku?: string | null;
  }): Promise<DiscountRule[]> {
    const { supplierId, categoryId, brandId, supplierSku } = params;
    const now = new Date();

    const sql = `
      SELECT 
        discount_rule_id,
        supplier_id,
        rule_name,
        discount_percent,
        scope_type,
        category_id,
        brand_id,
        supplier_sku,
        priority,
        is_active,
        valid_from,
        valid_until
      FROM core.supplier_discount_rules
      WHERE supplier_id = $1
        AND is_active = true
        AND valid_from <= $2
        AND (valid_until IS NULL OR valid_until >= $2)
        AND (
          scope_type = 'supplier' OR
          (scope_type = 'category' AND category_id = $3) OR
          (scope_type = 'brand' AND brand_id = $4) OR
          (scope_type = 'sku' AND supplier_sku = $5)
        )
      ORDER BY 
        CASE scope_type
          WHEN 'sku' THEN 4
          WHEN 'brand' THEN 3
          WHEN 'category' THEN 2
          WHEN 'supplier' THEN 1
        END DESC,
        priority DESC
    `;

    const result = await query<DiscountRule>(sql, [
      supplierId,
      now,
      categoryId || null,
      brandId || null,
      supplierSku || null,
    ]);

    return result.rows;
  }

  /**
   * Calculate discounted price from base cost
   */
  static calculateDiscountedPrice(
    costExVat: number,
    discountPercent: number
  ): {
    costAfterDiscount: number;
    discountAmount: number;
    costIncVat: number;
    vatAmount: number;
  } {
    const discountAmount = (costExVat * discountPercent) / 100;
    const costAfterDiscount = costExVat - discountAmount;
    const vatAmount = costAfterDiscount * 0.15; // 15% VAT
    const costIncVat = costAfterDiscount + vatAmount;

    return {
      costAfterDiscount: Math.round(costAfterDiscount * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      costIncVat: Math.round(costIncVat * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
    };
  }
}

