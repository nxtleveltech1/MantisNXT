/**
 * Base Optimizer Abstract Class
 *
 * Provides common interface and utilities for all pricing optimization algorithms
 *
 * Author: Aster (Principal Full-Stack & Architecture Expert)
 * Date: 2025-11-02
 */

import type { OptimizationRun, OptimizationRecommendation } from '@/lib/db/pricing-schema';
import { v4 as uuidv4 } from 'uuid';

export interface ProductData {
  product_id: string;
  sku?: string;
  name?: string;
  category_id?: string;
  brand_id?: string;
  supplier_id?: string;
  cost?: number;
  price?: number;
  brand_name?: string;
  category_name?: string;
}

export abstract class BaseOptimizer {
  protected abstract algorithmName: string;

  /**
   * Main optimization method - must be implemented by subclasses
   */
  abstract optimize(product: ProductData, run: OptimizationRun): Promise<OptimizationRecommendation | null>;

  /**
   * Calculate confidence score based on data quality and constraints
   */
  protected calculateConfidence(product: ProductData, dataQuality: {
    hasCost: boolean;
    hasCompetitorData: boolean;
    hasHistoricalData: boolean;
    hasSalesData: boolean;
  }): number {
    let confidence = 50; // Base confidence

    if (dataQuality.hasCost) confidence += 15;
    if (dataQuality.hasCompetitorData) confidence += 15;
    if (dataQuality.hasHistoricalData) confidence += 10;
    if (dataQuality.hasSalesData) confidence += 10;

    return Math.min(100, confidence);
  }

  /**
   * Apply constraints from optimization run configuration
   */
  protected applyConstraints(
    recommendedPrice: number,
    currentPrice: number,
    cost: number,
    constraints?: OptimizationRun['config']['constraints']
  ): number {
    if (!constraints) return recommendedPrice;

    let finalPrice = recommendedPrice;

    // Apply minimum margin constraint
    if (constraints.min_margin_percent && cost > 0) {
      const minPrice = cost * (1 + constraints.min_margin_percent / 100);
      finalPrice = Math.max(finalPrice, minPrice);
    }

    // Apply maximum price change constraint
    if (constraints.max_price_change_percent && currentPrice > 0) {
      const maxIncrease = currentPrice * (1 + constraints.max_price_change_percent / 100);
      const maxDecrease = currentPrice * (1 - constraints.max_price_change_percent / 100);
      finalPrice = Math.min(maxIncrease, Math.max(maxDecrease, finalPrice));
    }

    // Apply price ending preservation (e.g., .99, .95)
    if (constraints.preserve_price_endings) {
      finalPrice = this.preservePriceEnding(finalPrice, currentPrice);
    }

    return finalPrice;
  }

  /**
   * Preserve psychological pricing endings (.99, .95, .00)
   */
  protected preservePriceEnding(price: number, referencePrice: number): number {
    const referenceCents = Math.round((referencePrice % 1) * 100);

    // Common psychological price endings
    const commonEndings = [0, 95, 99];

    // Find the closest common ending to the reference price
    let closestEnding = commonEndings[0];
    let minDiff = Math.abs(referenceCents - closestEnding);

    for (const ending of commonEndings) {
      const diff = Math.abs(referenceCents - ending);
      if (diff < minDiff) {
        minDiff = diff;
        closestEnding = ending;
      }
    }

    // Apply the ending to the new price
    const wholeDollars = Math.floor(price);
    return wholeDollars + (closestEnding / 100);
  }

  /**
   * Create a recommendation object
   */
  protected createRecommendation(
    product: ProductData,
    run: OptimizationRun,
    recommendedPrice: number,
    reasoning: string,
    confidence: number,
    additionalData?: {
      projectedDemandChange?: number;
      projectedRevenueImpact?: number;
      projectedProfitImpact?: number;
      competitorPrices?: unknown[];
      elasticityEstimate?: number;
    }
  ): OptimizationRecommendation {
    const currentPrice = product.price || 0;
    const currentCost = product.cost || 0;

    const priceChangeAmount = recommendedPrice - currentPrice;
    const priceChangePercent = currentPrice > 0
      ? (priceChangeAmount / currentPrice) * 100
      : 0;

    const currentMarginPercent = currentCost > 0
      ? ((currentPrice - currentCost) / currentCost) * 100
      : 0;

    const recommendedMarginPercent = currentCost > 0
      ? ((recommendedPrice - currentCost) / currentCost) * 100
      : 0;

    return {
      recommendation_id: uuidv4(),
      run_id: run.run_id,
      product_id: product.product_id,
      supplier_product_id: undefined,

      current_price: currentPrice,
      current_cost: currentCost > 0 ? currentCost : undefined,
      current_margin_percent: currentCost > 0 ? currentMarginPercent : undefined,

      recommended_price: recommendedPrice,
      recommended_margin_percent: currentCost > 0 ? recommendedMarginPercent : undefined,
      price_change_percent: priceChangePercent,
      price_change_amount: priceChangeAmount,

      confidence_score: confidence,
      reasoning,
      algorithm_used: this.algorithmName,

      projected_demand_change_percent: additionalData?.projectedDemandChange,
      projected_revenue_impact: additionalData?.projectedRevenueImpact,
      projected_profit_impact: additionalData?.projectedProfitImpact,

      competitor_prices: additionalData?.competitorPrices,
      elasticity_estimate: additionalData?.elasticityEstimate,

      status: 'pending' as const,
      created_at: new Date(),
    };
  }

  /**
   * Round price to 2 decimal places
   */
  protected roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  /**
   * Validate that product has minimum required data
   */
  protected validateProduct(product: ProductData): boolean {
    return !!(product.product_id && product.price && product.price > 0);
  }
}
