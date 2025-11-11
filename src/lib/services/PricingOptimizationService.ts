/**
 * Pricing Optimization Service
 *
 * Orchestrates optimization runs, generates recommendations,
 * and applies pricing changes based on algorithmic analysis
 *
 * Author: Aster (Principal Full-Stack & Architecture Expert)
 * Date: 2025-11-02
 */

import { query, withTransaction } from '@/lib/database';
import type {
  OptimizationRun,
  OptimizationRecommendation,
  PriceChangeLog} from '@/lib/db/pricing-schema';
import {
  PRICING_TABLES,
  OptimizationStatus,
  RecommendationStatus,
  PricingStrategy
} from '@/lib/db/pricing-schema';
import { CORE_TABLES } from '@/lib/db/schema-contract';
import { v4 as uuidv4 } from 'uuid';

// Import optimization algorithms
import { CostPlusOptimizer } from '@/lib/pricing/algorithms/CostPlusOptimizer';
import { MarketBasedOptimizer } from '@/lib/pricing/algorithms/MarketBasedOptimizer';
import { DemandElasticityOptimizer } from '@/lib/pricing/algorithms/DemandElasticityOptimizer';
import { DynamicPricingOptimizer } from '@/lib/pricing/algorithms/DynamicPricingOptimizer';

export interface StartOptimizationInput {
  run_name: string;
  strategy: PricingStrategy;
  config: OptimizationRun['config'];
  scope: OptimizationRun['scope'];
  created_by?: string;
}

export interface ApplyRecommendationInput {
  recommendation_id: string;
  applied_by?: string;
  notes?: string;
}

export interface OptimizationProgress {
  run_id: string;
  status: OptimizationStatus;
  progress_percent: number;
  current_step: string;
  products_processed: number;
  total_products: number;
}

export class PricingOptimizationService {
  /**
   * Start a new optimization run
   */
  static async startOptimization(input: StartOptimizationInput): Promise<OptimizationRun> {
    const runId = uuidv4();

    // Create optimization run record
    const sql = `
      INSERT INTO ${PRICING_TABLES.OPTIMIZATION_RUNS} (
        run_id, run_name, strategy, status, config, scope, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query<OptimizationRun>(sql, [
      runId,
      input.run_name,
      input.strategy,
      OptimizationStatus.PENDING,
      JSON.stringify(input.config),
      JSON.stringify(input.scope),
      input.created_by || null,
    ]);

    const run = this.parseOptimizationRun(result.rows[0]);

    // Start optimization process asynchronously
    this.executeOptimization(run).catch(error => {
      console.error(`Optimization ${runId} failed:`, error);
      this.updateRunStatus(runId, OptimizationStatus.FAILED, error.message);
    });

    return run;
  }

  /**
   * Execute optimization analysis
   */
  private static async executeOptimization(run: OptimizationRun): Promise<void> {
    try {
      // Update status to running
      await this.updateRunStatus(run.run_id, OptimizationStatus.RUNNING);
      await this.updateRunField(run.run_id, 'started_at', 'NOW()');

      // Get products in scope
      const products = await this.getProductsInScope(run.scope);

      if (products.length === 0) {
        throw new Error('No products found in specified scope');
      }

      // Select appropriate optimizer based on strategy and config
      const optimizers = this.getOptimizers(run.strategy, run.config);

      const recommendations: OptimizationRecommendation[] = [];

      // Process each product
      for (let i = 0; i < products.length; i++) {
        const product = products[i];

        // Run each configured algorithm
        for (const optimizer of optimizers) {
          const recommendation = await optimizer.optimize(product, run);
          if (recommendation) {
            recommendations.push(recommendation);
          }
        }
      }

      // Save recommendations
      await this.saveRecommendations(run.run_id, recommendations);

      // Calculate impact estimates
      const impacts = this.calculateAggregateImpact(recommendations);

      // Update run with results
      await this.updateRunResults(run.run_id, {
        total_products_analyzed: products.length,
        recommendations_generated: recommendations.length,
        estimated_revenue_impact: impacts.revenue,
        estimated_profit_impact: impacts.profit,
      });

      // Mark as completed
      await this.updateRunStatus(run.run_id, OptimizationStatus.COMPLETED);
      await this.updateRunField(run.run_id, 'completed_at', 'NOW()');

    } catch (error: unknown) {
      await this.updateRunStatus(run.run_id, OptimizationStatus.FAILED, error.message);
      throw error;
    }
  }

  /**
   * Get all optimization runs with optional filtering
   */
  static async getAllRuns(limit = 50): Promise<OptimizationRun[]> {
    const sql = `
      SELECT * FROM ${PRICING_TABLES.OPTIMIZATION_RUNS}
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await query<OptimizationRun>(sql, [limit]);
    return result.rows.map(row => this.parseOptimizationRun(row));
  }

  /**
   * Get optimization run by ID
   */
  static async getRunById(runId: string): Promise<OptimizationRun | null> {
    const sql = `SELECT * FROM ${PRICING_TABLES.OPTIMIZATION_RUNS} WHERE run_id = $1`;
    const result = await query<OptimizationRun>(sql, [runId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseOptimizationRun(result.rows[0]);
  }

  /**
   * Get recommendations for an optimization run
   */
  static async getRecommendations(
    runId: string,
    filter?: {
      status?: RecommendationStatus;
      min_confidence?: number;
      min_impact?: number;
    }
  ): Promise<OptimizationRecommendation[]> {
    let sql = `SELECT * FROM ${PRICING_TABLES.OPTIMIZATION_RECOMMENDATIONS} WHERE run_id = $1`;
    const params: unknown[] = [runId];
    let paramCount = 2;

    if (filter?.status) {
      sql += ` AND status = $${paramCount++}`;
      params.push(filter.status);
    }

    if (filter?.min_confidence) {
      sql += ` AND confidence_score >= $${paramCount++}`;
      params.push(filter.min_confidence);
    }

    if (filter?.min_impact) {
      sql += ` AND ABS(projected_revenue_impact) >= $${paramCount++}`;
      params.push(filter.min_impact);
    }

    sql += ` ORDER BY confidence_score DESC, ABS(projected_revenue_impact) DESC`;

    const result = await query<OptimizationRecommendation>(sql, params);
    return result.rows.map(row => this.parseRecommendation(row));
  }

  /**
   * Get a single recommendation by ID
   */
  static async getRecommendationById(recommendationId: string): Promise<OptimizationRecommendation | null> {
    const sql = `
      SELECT * FROM ${PRICING_TABLES.OPTIMIZATION_RECOMMENDATIONS}
      WHERE recommendation_id = $1
    `;

    const result = await query<OptimizationRecommendation>(sql, [recommendationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseRecommendation(result.rows[0]);
  }

  /**
   * Apply a single recommendation
   */
  static async applyRecommendation(input: ApplyRecommendationInput): Promise<{
    success: boolean;
    priceChangeLog?: PriceChangeLog;
    error?: string;
  }> {
    const recommendation = await this.getRecommendationById(input.recommendation_id);

    if (!recommendation) {
      return { success: false, error: 'Recommendation not found' };
    }

    if (recommendation.status === RecommendationStatus.APPLIED) {
      return { success: false, error: 'Recommendation already applied' };
    }

    if (recommendation.status === RecommendationStatus.REJECTED) {
      return { success: false, error: 'Recommendation was rejected' };
    }

    if (recommendation.status === RecommendationStatus.EXPIRED) {
      return { success: false, error: 'Recommendation has expired' };
    }

    try {
      return await withTransaction(async (client) => {
        // Get current product price
        const productSql = `
          SELECT price FROM ${CORE_TABLES.SUPPLIER_PRODUCT}
          WHERE product_id = $1
          LIMIT 1
        `;
        const productResult = await client.query(productSql, [recommendation.product_id]);

        if (productResult.rows.length === 0) {
          throw new Error('Product not found');
        }

        const currentPrice = productResult.rows[0].price;

        // Update product price
        const updateSql = `
          UPDATE ${CORE_TABLES.SUPPLIER_PRODUCT}
          SET price = $1, updated_at = NOW()
          WHERE product_id = $2
        `;
        await client.query(updateSql, [recommendation.recommended_price, recommendation.product_id]);

        // Create price change log
        const logId = uuidv4();
        const logSql = `
          INSERT INTO ${PRICING_TABLES.PRICE_CHANGE_LOG} (
            log_id, product_id, supplier_product_id, old_price, new_price,
            price_change_percent, price_change_amount, change_reason,
            recommendation_id, changed_by, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;

        const logResult = await client.query<PriceChangeLog>(logSql, [
          logId,
          recommendation.product_id,
          recommendation.supplier_product_id || null,
          currentPrice,
          recommendation.recommended_price,
          recommendation.price_change_percent,
          recommendation.price_change_amount,
          'optimization',
          recommendation.recommendation_id,
          input.applied_by || null,
          input.notes || null,
        ]);

        // Update recommendation status
        const updateRecSql = `
          UPDATE ${PRICING_TABLES.OPTIMIZATION_RECOMMENDATIONS}
          SET status = $1, applied_at = NOW(), applied_by = $2
          WHERE recommendation_id = $3
        `;
        await client.query(updateRecSql, [
          RecommendationStatus.APPLIED,
          input.applied_by || null,
          recommendation.recommendation_id,
        ]);

        const priceChangeLog: PriceChangeLog = {
          ...logResult.rows[0],
          changed_at: new Date(logResult.rows[0].changed_at),
        };

        return { success: true, priceChangeLog };
      });
    } catch (error: unknown) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk apply recommendations
   */
  static async applyMultipleRecommendations(
    recommendationIds: string[],
    appliedBy?: string
  ): Promise<{
    succeeded: number;
    failed: number;
    results: Array<{ recommendation_id: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ recommendation_id: string; success: boolean; error?: string }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const recId of recommendationIds) {
      const result = await this.applyRecommendation({
        recommendation_id: recId,
        applied_by: appliedBy,
      });

      results.push({
        recommendation_id: recId,
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    return { succeeded, failed, results };
  }

  /**
   * Reject a recommendation
   */
  static async rejectRecommendation(
    recommendationId: string,
    reason: string,
    rejectedBy?: string
  ): Promise<boolean> {
    const sql = `
      UPDATE ${PRICING_TABLES.OPTIMIZATION_RECOMMENDATIONS}
      SET status = $1, rejection_reason = $2
      WHERE recommendation_id = $3 AND status = $4
    `;

    const result = await query(sql, [
      RecommendationStatus.REJECTED,
      reason,
      recommendationId,
      RecommendationStatus.PENDING,
    ]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get products in optimization scope
   */
  private static async getProductsInScope(scope: OptimizationRun['scope']): Promise<unknown[]> {
    let sql = `
      SELECT p.*, sp.cost, sp.price, sp.supplier_id, b.name as brand_name, c.name as category_name
      FROM ${CORE_TABLES.PRODUCT} p
      LEFT JOIN ${CORE_TABLES.SUPPLIER_PRODUCT} sp ON p.product_id = sp.product_id
      LEFT JOIN ${CORE_TABLES.BRAND} b ON p.brand_id = b.brand_id
      LEFT JOIN ${CORE_TABLES.CATEGORY} c ON p.category_id = c.category_id
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramCount = 1;

    if (scope.category_ids && scope.category_ids.length > 0) {
      sql += ` AND p.category_id = ANY($${paramCount++})`;
      params.push(scope.category_ids);
    }

    if (scope.brand_ids && scope.brand_ids.length > 0) {
      sql += ` AND p.brand_id = ANY($${paramCount++})`;
      params.push(scope.brand_ids);
    }

    if (scope.supplier_ids && scope.supplier_ids.length > 0) {
      sql += ` AND sp.supplier_id = ANY($${paramCount++})`;
      params.push(scope.supplier_ids);
    }

    if (scope.product_ids && scope.product_ids.length > 0) {
      sql += ` AND p.product_id = ANY($${paramCount++})`;
      params.push(scope.product_ids);
    }

    const result = await query<unknown>(sql, params);
    return result.rows;
  }

  /**
   * Get appropriate optimizers based on strategy
   */
  private static getOptimizers(strategy: PricingStrategy, config: OptimizationRun['config']): unknown[] {
    const optimizers: unknown[] = [];

    if (config.algorithms) {
      if (config.algorithms.includes('cost_plus')) {
        optimizers.push(new CostPlusOptimizer());
      }
      if (config.algorithms.includes('market_based')) {
        optimizers.push(new MarketBasedOptimizer());
      }
      if (config.algorithms.includes('elasticity')) {
        optimizers.push(new DemandElasticityOptimizer());
      }
      if (config.algorithms.includes('dynamic')) {
        optimizers.push(new DynamicPricingOptimizer());
      }
    } else {
      // Default optimizer based on strategy
      switch (strategy) {
        case PricingStrategy.MAXIMIZE_PROFIT:
          optimizers.push(new CostPlusOptimizer());
          break;
        case PricingStrategy.MATCH_COMPETITION:
          optimizers.push(new MarketBasedOptimizer());
          break;
        case PricingStrategy.MAXIMIZE_VOLUME:
          optimizers.push(new DemandElasticityOptimizer());
          break;
        default:
          optimizers.push(new CostPlusOptimizer());
      }
    }

    return optimizers;
  }

  /**
   * Save recommendations to database
   */
  private static async saveRecommendations(runId: string, recommendations: OptimizationRecommendation[]): Promise<void> {
    if (recommendations.length === 0) return;

    const values: string[] = [];
    const params: unknown[] = [];
    let paramCount = 1;

    for (const rec of recommendations) {
      values.push(`(
        $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++},
        $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++},
        $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++},
        $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++},
        $${paramCount++}
      )`);

      params.push(
        rec.recommendation_id,
        runId,
        rec.product_id,
        rec.supplier_product_id || null,
        rec.current_price,
        rec.current_cost || null,
        rec.current_margin_percent || null,
        rec.recommended_price,
        rec.recommended_margin_percent || null,
        rec.price_change_percent,
        rec.price_change_amount,
        rec.confidence_score,
        rec.reasoning,
        rec.algorithm_used,
        rec.projected_demand_change_percent || null,
        rec.projected_revenue_impact || null,
        rec.projected_profit_impact || null
      );
    }

    const sql = `
      INSERT INTO ${PRICING_TABLES.OPTIMIZATION_RECOMMENDATIONS} (
        recommendation_id, run_id, product_id, supplier_product_id,
        current_price, current_cost, current_margin_percent,
        recommended_price, recommended_margin_percent,
        price_change_percent, price_change_amount,
        confidence_score, reasoning, algorithm_used,
        projected_demand_change_percent, projected_revenue_impact, projected_profit_impact
      ) VALUES ${values.join(', ')}
    `;

    await query(sql, params);
  }

  /**
   * Calculate aggregate impact from recommendations
   */
  private static calculateAggregateImpact(recommendations: OptimizationRecommendation[]): {
    revenue: number;
    profit: number;
  } {
    let totalRevenue = 0;
    let totalProfit = 0;

    for (const rec of recommendations) {
      if (rec.projected_revenue_impact) {
        totalRevenue += rec.projected_revenue_impact;
      }
      if (rec.projected_profit_impact) {
        totalProfit += rec.projected_profit_impact;
      }
    }

    return { revenue: totalRevenue, profit: totalProfit };
  }

  /**
   * Update run status
   */
  private static async updateRunStatus(runId: string, status: OptimizationStatus, errorMessage?: string): Promise<void> {
    const sql = `
      UPDATE ${PRICING_TABLES.OPTIMIZATION_RUNS}
      SET status = $1, error_message = $2
      WHERE run_id = $3
    `;

    await query(sql, [status, errorMessage || null, runId]);
  }

  /**
   * Update run field
   */
  private static async updateRunField(runId: string, field: string, value: string): Promise<void> {
    const sql = `
      UPDATE ${PRICING_TABLES.OPTIMIZATION_RUNS}
      SET ${field} = ${value}
      WHERE run_id = $1
    `;

    await query(sql, [runId]);
  }

  /**
   * Update run results
   */
  private static async updateRunResults(runId: string, results: {
    total_products_analyzed: number;
    recommendations_generated: number;
    estimated_revenue_impact: number;
    estimated_profit_impact: number;
  }): Promise<void> {
    const sql = `
      UPDATE ${PRICING_TABLES.OPTIMIZATION_RUNS}
      SET
        total_products_analyzed = $1,
        recommendations_generated = $2,
        estimated_revenue_impact = $3,
        estimated_profit_impact = $4
      WHERE run_id = $5
    `;

    await query(sql, [
      results.total_products_analyzed,
      results.recommendations_generated,
      results.estimated_revenue_impact,
      results.estimated_profit_impact,
      runId,
    ]);
  }

  /**
   * Parse optimization run from database
   */
  private static parseOptimizationRun(row: unknown): OptimizationRun {
    return {
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      scope: typeof row.scope === 'string' ? JSON.parse(row.scope) : row.scope,
      created_at: new Date(row.created_at),
      started_at: row.started_at ? new Date(row.started_at) : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }

  /**
   * Parse recommendation from database
   */
  private static parseRecommendation(row: unknown): OptimizationRecommendation {
    return {
      ...row,
      competitor_prices: typeof row.competitor_prices === 'string'
        ? JSON.parse(row.competitor_prices)
        : row.competitor_prices,
      historical_performance: typeof row.historical_performance === 'string'
        ? JSON.parse(row.historical_performance)
        : row.historical_performance,
      created_at: new Date(row.created_at),
      applied_at: row.applied_at ? new Date(row.applied_at) : undefined,
      expires_at: row.expires_at ? new Date(row.expires_at) : undefined,
    };
  }
}
