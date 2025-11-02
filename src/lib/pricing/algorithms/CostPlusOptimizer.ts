/**
 * Cost-Plus Pricing Optimizer
 *
 * Calculates optimal prices based on cost plus desired margin
 *
 * Author: Aster (Principal Full-Stack & Architecture Expert)
 * Date: 2025-11-02
 */

import { BaseOptimizer, ProductData } from './BaseOptimizer';
import { OptimizationRun, OptimizationRecommendation } from '@/lib/db/pricing-schema';

export class CostPlusOptimizer extends BaseOptimizer {
  protected algorithmName = 'cost_plus';

  async optimize(product: ProductData, run: OptimizationRun): Promise<OptimizationRecommendation | null> {
    if (!this.validateProduct(product)) {
      return null;
    }

    const cost = product.cost || 0;
    const currentPrice = product.price || 0;

    // Can't do cost-plus without cost data
    if (cost <= 0) {
      return null;
    }

    // Get target margin from run config or use default
    const targetMarginPercent = run.config.target_margin_percent || 30;

    // Calculate recommended price: cost * (1 + margin%)
    let recommendedPrice = cost * (1 + targetMarginPercent / 100);

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

    const currentMargin = ((currentPrice - cost) / cost) * 100;
    const newMargin = ((recommendedPrice - cost) / cost) * 100;

    const reasoning = `Cost-plus pricing: Product cost is $${cost.toFixed(2)}. ` +
      `Current margin is ${currentMargin.toFixed(1)}%, target margin is ${targetMarginPercent}%. ` +
      `Recommended price of $${recommendedPrice.toFixed(2)} achieves ${newMargin.toFixed(1)}% margin.`;

    // Estimate profit impact (simplified - would use historical sales data in reality)
    const priceChange = recommendedPrice - currentPrice;
    const estimatedUnitsSold = 100; // Placeholder
    const currentProfit = (currentPrice - cost) * estimatedUnitsSold;
    const projectedProfit = (recommendedPrice - cost) * estimatedUnitsSold;
    const profitImpact = projectedProfit - currentProfit;

    const confidence = this.calculateConfidence(product, {
      hasCost: true,
      hasCompetitorData: false,
      hasHistoricalData: false,
      hasSalesData: false,
    });

    return this.createRecommendation(
      product,
      run,
      recommendedPrice,
      reasoning,
      confidence,
      {
        projectedProfitImpact: profitImpact,
      }
    );
  }
}
