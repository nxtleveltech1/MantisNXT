// @ts-nocheck

/**
 * Demand Elasticity Pricing Optimizer
 *
 * Optimizes prices based on price elasticity of demand analysis
 *
 * Author: Aster (Principal Full-Stack & Architecture Expert)
 * Date: 2025-11-02
 */

import type { ProductData } from './BaseOptimizer';
import { BaseOptimizer } from './BaseOptimizer';
import type { OptimizationRun, OptimizationRecommendation } from '@/lib/db/pricing-schema';
import { query } from '@/lib/database';
import { PRICING_TABLES } from '@/lib/db/pricing-schema';

export class DemandElasticityOptimizer extends BaseOptimizer {
  protected algorithmName = 'demand_elasticity';

  async optimize(product: ProductData, run: OptimizationRun): Promise<OptimizationRecommendation | null> {
    if (!this.validateProduct(product)) {
      return null;
    }

    const currentPrice = product.price || 0;
    const cost = product.cost || 0;

    // Get elasticity data
    const elasticity = await this.getElasticityData(product.product_id);

    if (!elasticity) {
      return null; // Can't optimize without elasticity data
    }

    // Calculate optimal price based on elasticity
    let recommendedPrice: number;
    let reasoning: string;

    const elasticityCoef = elasticity.elasticity_coefficient;

    if (elasticity.optimal_price && elasticity.optimal_price > 0) {
      // Use pre-calculated optimal price
      recommendedPrice = elasticity.optimal_price;
      reasoning = `Elasticity-based pricing: Analysis shows optimal price of $${recommendedPrice.toFixed(2)} ` +
        `based on elasticity coefficient of ${elasticityCoef.toFixed(2)}. ` +
        `This maximizes total revenue given demand sensitivity.`;
    } else {
      // Calculate optimal price using elasticity formula
      // For profit maximization: P* = MC * (ε / (ε + 1))
      // where ε is absolute value of elasticity, MC is marginal cost

      const absElasticity = Math.abs(elasticityCoef);

      if (absElasticity <= 1) {
        // Inelastic demand - can increase price
        recommendedPrice = currentPrice * 1.10; // 10% increase
        reasoning = `Demand is inelastic (ε = ${elasticityCoef.toFixed(2)}). ` +
          `Customers are not highly price-sensitive, recommending 10% price increase to maximize revenue.`;
      } else if (absElasticity < 2) {
        // Moderately elastic - optimize based on cost
        if (cost > 0) {
          const optimalMarkup = absElasticity / (absElasticity - 1);
          recommendedPrice = cost * optimalMarkup;
          reasoning = `Moderate price elasticity (ε = ${elasticityCoef.toFixed(2)}). ` +
            `Optimal markup of ${((optimalMarkup - 1) * 100).toFixed(1)}% over cost.`;
        } else {
          recommendedPrice = currentPrice;
          reasoning = 'Insufficient cost data for elasticity-based optimization.';
        }
      } else {
        // Highly elastic - lower price to increase volume
        recommendedPrice = currentPrice * 0.95; // 5% decrease
        reasoning = `Demand is highly elastic (ε = ${elasticityCoef.toFixed(2)}). ` +
          `Customers are very price-sensitive, recommending 5% price decrease to maximize volume and revenue.`;
      }
    }

    // Apply constraints
    recommendedPrice = this.applyConstraints(
      recommendedPrice,
      currentPrice,
      cost,
      run.config.constraints
    );

    recommendedPrice = this.roundPrice(recommendedPrice);

    // If price is the same, no recommendation needed
    if (Math.abs(recommendedPrice - currentPrice) < 0.01) {
      return null;
    }

    // Calculate projected demand change using elasticity
    const priceChangePercent = ((recommendedPrice - currentPrice) / currentPrice) * 100;
    const demandChangePercent = -elasticityCoef * priceChangePercent;

    // Estimate revenue and profit impact
    const assumedCurrentUnits = 100; // Placeholder
    const projectedUnits = assumedCurrentUnits * (1 + demandChangePercent / 100);

    const currentRevenue = currentPrice * assumedCurrentUnits;
    const projectedRevenue = recommendedPrice * projectedUnits;
    const revenueImpact = projectedRevenue - currentRevenue;

    let profitImpact = 0;
    if (cost > 0) {
      const currentProfit = (currentPrice - cost) * assumedCurrentUnits;
      const projectedProfit = (recommendedPrice - cost) * projectedUnits;
      profitImpact = projectedProfit - currentProfit;
    }

    const confidence = this.calculateConfidence(product, {
      hasCost: cost > 0,
      hasCompetitorData: false,
      hasHistoricalData: true,
      hasSalesData: elasticity.data_points_count > 20,
    });

    return this.createRecommendation(
      product,
      run,
      recommendedPrice,
      reasoning,
      confidence,
      {
        elasticityEstimate: elasticityCoef,
        projectedDemandChange: demandChangePercent,
        projectedRevenueImpact: revenueImpact,
        projectedProfitImpact: profitImpact,
      }
    );
  }

  private async getElasticityData(productId: string): Promise<unknown | null> {
    const sql = `
      SELECT *
      FROM ${PRICING_TABLES.PRICE_ELASTICITY}
      WHERE product_id = $1 AND is_current = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await query<unknown>(sql, [productId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }
}
