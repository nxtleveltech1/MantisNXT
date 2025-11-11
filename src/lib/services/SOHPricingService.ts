/**
 * SOH Pricing Service - Rule-Based Pricing Calculator
 * Calculates selling prices for Stock-On-Hand items using pricing rules
 */

import { query } from '../../../lib/database/unified-connection';

export interface PricingRule {
  id: string;
  org_id: string;
  rule_name: string;
  strategy: 'cost_plus' | 'market_based' | 'competitive' | 'dynamic';
  min_margin_percent: number;
  target_margin_percent: number;
  max_price_increase_percent: number;
  is_active: boolean;
  priority: number;
}

export interface CalculatePriceInput {
  supplier_product_id: string;
  unit_cost: number;
  org_id: string;
  supplier_discounts?: number;
}

export interface CalculatePriceResult {
  selling_price: number;
  calculated_margin: number;
  calculated_margin_pct: number;
  pricing_rule_id: string | null;
  confidence: number;
  reasoning: string;
}

export class SOHPricingService {
  /**
   * Calculate selling price for a SOH item using pricing rules
   */
  async calculatePrice(input: CalculatePriceInput): Promise<CalculatePriceResult> {
    const { supplier_product_id, unit_cost, org_id, supplier_discounts = 0 } = input;

    // Get pricing automation config
    const config = await this.getPricingConfig(org_id);

    // Adjust cost by discounts
    const adjustedCost = unit_cost - supplier_discounts;

    // Get applicable pricing rules
    const rules = await this.getApplicablePricingRules(org_id, supplier_product_id);

    let selling_price: number;
    let pricing_rule_id: string | null = null;
    let reasoning: string;
    let confidence: number;

    if (rules.length > 0) {
      // Use the highest priority active rule
      const rule = rules[0];
      pricing_rule_id = rule.id;

      selling_price = this.applyPricingRule(adjustedCost, rule);
      reasoning = `Applied ${rule.strategy} rule: ${rule.rule_name} with ${rule.target_margin_percent}% target margin`;
      confidence = 85; // Rule-based pricing has high confidence
    } else {
      // Fall back to default margin
      selling_price = adjustedCost * (1 + config.default_margin_percent / 100);
      reasoning = `Applied default margin of ${config.default_margin_percent}%`;
      confidence = 75; // Lower confidence for default pricing
    }

    // Ensure minimum margin
    const minPrice = adjustedCost * (1 + config.min_margin_percent / 100);
    if (selling_price < minPrice) {
      selling_price = minPrice;
      reasoning += ` (adjusted to meet minimum ${config.min_margin_percent}% margin)`;
    }

    // Calculate margins
    const calculated_margin = selling_price - adjustedCost;
    const calculated_margin_pct = (calculated_margin / adjustedCost) * 100;

    return {
      selling_price,
      calculated_margin,
      calculated_margin_pct,
      pricing_rule_id,
      confidence,
      reasoning,
    };
  }

  /**
   * Apply specific pricing rule strategy
   */
  private applyPricingRule(cost: number, rule: PricingRule): number {
    switch (rule.strategy) {
      case 'cost_plus':
        return cost * (1 + rule.target_margin_percent / 100);

      case 'market_based':
        // In future, integrate with market data
        // For now, use target margin
        return cost * (1 + rule.target_margin_percent / 100);

      case 'competitive':
        // In future, integrate with competitor pricing
        // For now, use target margin
        return cost * (1 + rule.target_margin_percent / 100);

      case 'dynamic':
        // In future, integrate with demand/elasticity data
        // For now, use target margin
        return cost * (1 + rule.target_margin_percent / 100);

      default:
        return cost * (1 + rule.target_margin_percent / 100);
    }
  }

  /**
   * Get pricing automation config for organization
   */
  private async getPricingConfig(org_id: string) {
    const result = await query<{
      enable_auto_activation: boolean;
      auto_activation_confidence_threshold: number;
      default_margin_percent: number;
      min_margin_percent: number;
      max_price_increase_percent: number;
    }>(
      `SELECT * FROM get_pricing_automation_config($1)`,
      [org_id]
    );

    if (result.rows.length === 0) {
      // Return defaults if no config exists
      return {
        enable_auto_activation: false,
        auto_activation_confidence_threshold: 85.0,
        default_margin_percent: 30.0,
        min_margin_percent: 5.0,
        max_price_increase_percent: 50.0,
      };
    }

    return result.rows[0];
  }

  /**
   * Get applicable pricing rules for product
   */
  private async getApplicablePricingRules(
    org_id: string,
    supplier_product_id: string
  ): Promise<PricingRule[]> {
    const result = await query<PricingRule>(
      `
      SELECT pr.*
      FROM pricing_rule pr
      WHERE pr.org_id = $1
        AND pr.is_active = true
        AND (
          pr.applies_to_all_products = true
          OR EXISTS (
            SELECT 1 FROM pricing_rule_products prp
            WHERE prp.pricing_rule_id = pr.id
              AND prp.supplier_product_id = $2
          )
        )
      ORDER BY pr.priority DESC, pr.created_at DESC
      LIMIT 1
      `,
      [org_id, supplier_product_id]
    );

    return result.rows;
  }

  /**
   * Update SOH item with calculated price
   */
  async updateSOHPrice(
    supplier_product_id: string,
    priceResult: CalculatePriceResult
  ): Promise<void> {
    await query(
      `
      UPDATE core.stock_on_hand
      SET
        selling_price = $1,
        pricing_rule_id = $2,
        price_calculated_at = NOW(),
        price_calculation_confidence = $3,
        price_source = 'rule_based'
      WHERE supplier_product_id = $4
      `,
      [
        priceResult.selling_price,
        priceResult.pricing_rule_id,
        priceResult.confidence,
        supplier_product_id,
      ]
    );
  }

  /**
   * Bulk calculate prices for multiple SOH items
   */
  async bulkCalculatePrices(inputs: CalculatePriceInput[]): Promise<CalculatePriceResult[]> {
    const results: CalculatePriceResult[] = [];

    for (const input of inputs) {
      try {
        const result = await this.calculatePrice(input);
        results.push(result);
      } catch (error) {
        console.error(`Failed to calculate price for ${input.supplier_product_id}:`, error);
        // Continue with other items
      }
    }

    return results;
  }
}

// Export singleton instance
export const sohPricingService = new SOHPricingService();
