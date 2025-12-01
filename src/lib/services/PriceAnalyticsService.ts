// @ts-nocheck

/**
 * Price Analytics Service
 *
 * Provides analytics, elasticity calculations, performance metrics,
 * and competitor analysis for pricing optimization
 *
 * Author: Aster (Principal Full-Stack & Architecture Expert)
 * Date: 2025-11-02
 */

import { query } from '@/lib/database';
import type {
  PriceChangeLog,
  CompetitorPrice,
  PriceElasticity,
  PricePerformanceMetrics,
} from '@/lib/db/pricing-schema';
import { PRICING_TABLES } from '@/lib/db/pricing-schema';
import { CORE_TABLES } from '@/lib/db/schema-contract';

export interface PriceHistoryEntry {
  date: Date;
  price: number;
  change_percent?: number;
  change_reason?: string;
  volume_sold?: number;
}

export interface CompetitorComparison {
  product_id: string;
  our_price: number;
  competitors: Array<{
    name: string;
    price: number;
    price_diff: number;
    price_diff_percent: number;
    last_checked: Date;
  }>;
  market_position: 'lowest' | 'below_average' | 'average' | 'above_average' | 'highest';
  market_avg_price: number;
}

export interface ElasticityAnalysis {
  product_id: string;
  current_elasticity: number;
  confidence: number;
  optimal_price_range: {
    min: number;
    max: number;
    optimal: number;
  };
  price_sensitivity:
    | 'highly_elastic'
    | 'elastic'
    | 'unit_elastic'
    | 'inelastic'
    | 'highly_inelastic';
  historical_data_points: number;
}

export class PriceAnalyticsService {
  /**
   * Get price history for a product
   */
  static async getPriceHistory(
    productId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PriceHistoryEntry[]> {
    let sql = `
      SELECT
        changed_at as date,
        new_price as price,
        price_change_percent as change_percent,
        change_reason
      FROM ${PRICING_TABLES.PRICE_CHANGE_LOG}
      WHERE product_id = $1
    `;

    const params: unknown[] = [productId];
    let paramCount = 2;

    if (startDate) {
      sql += ` AND changed_at >= $${paramCount++}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND changed_at <= $${paramCount++}`;
      params.push(endDate);
    }

    sql += ` ORDER BY changed_at ASC`;

    const result = await query<PriceHistoryEntry>(sql, params);

    return result.rows.map(row => ({
      ...row,
      date: new Date(row.date),
    }));
  }

  /**
   * Get recent price changes across all products (audit log)
   */
  static async getRecentPriceChanges(limit = 100): Promise<PriceChangeLog[]> {
    const sql = `
      SELECT pcl.*, p.name as product_name, p.sku
      FROM ${PRICING_TABLES.PRICE_CHANGE_LOG} pcl
      LEFT JOIN ${CORE_TABLES.PRODUCT} p ON pcl.product_id = p.product_id
      ORDER BY changed_at DESC
      LIMIT $1
    `;

    const result = await query<unknown>(sql, [limit]);

    return result.rows.map(row => ({
      ...row,
      changed_at: new Date(row.changed_at),
    }));
  }

  /**
   * Get price performance metrics for a product
   */
  static async getPerformanceMetrics(
    productId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PricePerformanceMetrics | null> {
    // This is a comprehensive query that would need actual sales data
    // For now, we'll provide a structure based on available data

    const sql = `
      SELECT
        p.product_id,
        sp.price as current_price,
        sp.cost as current_cost
      FROM ${CORE_TABLES.PRODUCT} p
      LEFT JOIN ${CORE_TABLES.SUPPLIER_PRODUCT} sp ON p.product_id = sp.product_id
      WHERE p.product_id = $1
      LIMIT 1
    `;

    const result = await query<unknown>(sql, [productId]);

    if (result.rows.length === 0) {
      return null;
    }

    const product = result.rows[0];

    // Get price history for the period
    const priceHistory = await this.getPriceHistory(productId, startDate, endDate);

    if (priceHistory.length === 0) {
      return null;
    }

    const prices = priceHistory.map(h => h.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Calculate price volatility (standard deviation)
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance);

    const currentMargin =
      product.current_cost > 0
        ? ((product.current_price - product.current_cost) / product.current_cost) * 100
        : 0;

    return {
      product_id: productId,
      time_period: {
        start_date: startDate,
        end_date: endDate,
      },
      units_sold: 0, // Would come from sales data
      revenue: 0, // Would come from sales data
      profit: 0, // Would come from sales data
      average_price: avgPrice,
      min_price: minPrice,
      max_price: maxPrice,
      price_volatility: volatility,
      market_position: 'unknown',
      price_vs_market_avg_percent: 0,
      margin_percent: currentMargin,
    };
  }

  /**
   * Get competitor price comparison
   */
  static async getCompetitorComparison(productId: string): Promise<CompetitorComparison | null> {
    // Get our price
    const ourPriceSql = `
      SELECT sp.price
      FROM ${CORE_TABLES.SUPPLIER_PRODUCT} sp
      WHERE sp.product_id = $1
      LIMIT 1
    `;

    const ourPriceResult = await query<{ price: number }>(ourPriceSql, [productId]);

    if (ourPriceResult.rows.length === 0) {
      return null;
    }

    const ourPrice = ourPriceResult.rows[0].price;

    // Get competitor prices
    const competitorSql = `
      SELECT
        competitor_name,
        price,
        last_checked
      FROM ${PRICING_TABLES.COMPETITOR_PRICES}
      WHERE product_id = $1 AND is_active = true
      ORDER BY last_checked DESC
    `;

    const competitorResult = await query<CompetitorPrice>(competitorSql, [productId]);

    if (competitorResult.rows.length === 0) {
      return {
        product_id: productId,
        our_price: ourPrice,
        competitors: [],
        market_position: 'average',
        market_avg_price: ourPrice,
      };
    }

    const competitors = competitorResult.rows.map(comp => ({
      name: comp.competitor_name,
      price: comp.price,
      price_diff: ourPrice - comp.price,
      price_diff_percent: ((ourPrice - comp.price) / comp.price) * 100,
      last_checked: new Date(comp.last_checked),
    }));

    const competitorPrices = competitors.map(c => c.price);
    const marketAvgPrice =
      competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length;

    // Determine market position
    let marketPosition: CompetitorComparison['market_position'] = 'average';
    const sortedPrices = [...competitorPrices, ourPrice].sort((a, b) => a - b);
    const ourIndex = sortedPrices.indexOf(ourPrice);
    const percentile = ourIndex / sortedPrices.length;

    if (percentile <= 0.2) marketPosition = 'lowest';
    else if (percentile <= 0.4) marketPosition = 'below_average';
    else if (percentile <= 0.6) marketPosition = 'average';
    else if (percentile <= 0.8) marketPosition = 'above_average';
    else marketPosition = 'highest';

    return {
      product_id: productId,
      our_price: ourPrice,
      competitors,
      market_position: marketPosition,
      market_avg_price: marketAvgPrice,
    };
  }

  /**
   * Calculate price elasticity for a product
   */
  static async calculateElasticity(productId: string): Promise<ElasticityAnalysis | null> {
    // Get existing elasticity data
    const elasticitySql = `
      SELECT *
      FROM ${PRICING_TABLES.PRICE_ELASTICITY}
      WHERE product_id = $1 AND is_current = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const elasticityResult = await query<PriceElasticity>(elasticitySql, [productId]);

    if (elasticityResult.rows.length === 0) {
      // No elasticity data available - would need to calculate from sales history
      return null;
    }

    const elasticity = elasticityResult.rows[0];

    // Determine price sensitivity based on elasticity coefficient
    let sensitivity: ElasticityAnalysis['price_sensitivity'];
    const absElasticity = Math.abs(elasticity.elasticity_coefficient);

    if (absElasticity > 2) sensitivity = 'highly_elastic';
    else if (absElasticity > 1.2) sensitivity = 'elastic';
    else if (absElasticity >= 0.8 && absElasticity <= 1.2) sensitivity = 'unit_elastic';
    else if (absElasticity >= 0.5) sensitivity = 'inelastic';
    else sensitivity = 'highly_inelastic';

    return {
      product_id: productId,
      current_elasticity: elasticity.elasticity_coefficient,
      confidence: elasticity.confidence_interval_upper - elasticity.confidence_interval_lower,
      optimal_price_range: {
        min: elasticity.price_range_analyzed.min_price,
        max: elasticity.price_range_analyzed.max_price,
        optimal: elasticity.optimal_price || elasticity.price_range_analyzed.max_price,
      },
      price_sensitivity: sensitivity,
      historical_data_points: elasticity.data_points_count,
    };
  }

  /**
   * Get overall pricing analytics dashboard metrics
   */
  static async getDashboardMetrics(days = 30): Promise<{
    total_products_tracked: number;
    recent_price_changes: number;
    avg_price_change_percent: number;
    products_above_market: number;
    products_below_market: number;
    active_competitors_tracked: number;
    optimization_opportunities: number;
    active_rules_count: number;
    recent_changes_list: Array<{
      product_id: string;
      product_name: string;
      sku: string;
      old_price: number;
      new_price: number;
      price_change_percent: number;
      changed_at: Date;
    }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total products with pricing data
    const totalProductsSql = `
      SELECT COUNT(DISTINCT pi.supplier_sku) as count
      FROM public.pricelist_items pi
      WHERE pi.unit_price IS NOT NULL
    `;
    const totalProductsResult = await query<{ count: number }>(totalProductsSql);

    // Recent price changes from price_history table
    const recentChangesSql = `
      SELECT COUNT(*) as count
      FROM core.price_history
      WHERE created_at >= $1
    `;
    const recentChangesResult = await query<{ count: number }>(recentChangesSql, [startDate]);

    // Calculate average price change from price_history
    const avgChangeSql = `
      SELECT
        AVG(ABS(
          (ph2.price - ph1.price) / NULLIF(ph1.price, 0) * 100
        )) as avg_change
      FROM core.price_history ph1
      JOIN core.price_history ph2 ON ph1.supplier_product_id = ph2.supplier_product_id
        AND ph2.valid_from > ph1.valid_from
      WHERE ph2.created_at >= $1
    `;
    const avgChangeResult = await query<{ avg_change: number }>(avgChangeSql, [startDate]);

    // Products with competitor data
    const competitorsSql = `
      SELECT COUNT(DISTINCT competitor_name) as count
      FROM public.competitor_pricing
      WHERE is_active = true
    `;
    const competitorsResult = await query<{ count: number }>(competitorsSql);

    // Get actual recent price changes with product details from price_history
    const recentChangesListSql = `
      SELECT
        ph2.supplier_product_id::text as product_id,
        COALESCE(i.name, sp.supplier_sku, sp.name_from_supplier) as product_name,
        sp.supplier_sku as sku,
        ph1.price as old_price,
        ph2.price as new_price,
        ((ph2.price - ph1.price) / NULLIF(ph1.price, 0) * 100) as price_change_percent,
        ph2.created_at as changed_at
      FROM core.price_history ph2
      JOIN core.price_history ph1 ON ph1.supplier_product_id = ph2.supplier_product_id
        AND ph1.valid_from < ph2.valid_from
        AND ph1.valid_to >= ph2.valid_from
      LEFT JOIN ${CORE_TABLES.SUPPLIER_PRODUCT} sp ON ph2.supplier_product_id = sp.supplier_product_id
      LEFT JOIN public.inventory_items i ON sp.supplier_sku = i.sku
      WHERE ph2.created_at >= $1
      ORDER BY ph2.created_at DESC
      LIMIT 10
    `;
    const recentChangesListResult = await query<unknown>(recentChangesListSql, [startDate]);

    // Count active pricing rules
    const activeRulesSql = `
      SELECT COUNT(*) as count
      FROM public.pricing_rule
      WHERE is_active = true
    `;
    const activeRulesResult = await query<{ count: number }>(activeRulesSql);

    return {
      total_products_tracked: Number(totalProductsResult.rows[0]?.count || 0),
      recent_price_changes: Number(recentChangesResult.rows[0]?.count || 0),
      avg_price_change_percent: Number(avgChangeResult.rows[0]?.avg_change || 0),
      products_above_market: 0, // Would require competitive analysis
      products_below_market: 0, // Would require competitive analysis
      active_competitors_tracked: Number(competitorsResult.rows[0]?.count || 0),
      optimization_opportunities: 0, // Would come from recommendation system
      active_rules_count: Number(activeRulesResult.rows[0]?.count || 0),
      recent_changes_list: recentChangesListResult.rows.map(row => ({
        ...row,
        changed_at: new Date(row.changed_at),
      })),
    };
  }

  /**
   * Get price trends over time
   */
  static async getPriceTrends(
    categoryId?: string,
    brandId?: string,
    days = 90
  ): Promise<
    Array<{
      date: Date;
      avg_price: number;
      min_price: number;
      max_price: number;
      products_count: number;
    }>
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let sql = `
      SELECT
        DATE(pcl.changed_at) as date,
        AVG(pcl.new_price) as avg_price,
        MIN(pcl.new_price) as min_price,
        MAX(pcl.new_price) as max_price,
        COUNT(DISTINCT pcl.product_id) as products_count
      FROM ${PRICING_TABLES.PRICE_CHANGE_LOG} pcl
      LEFT JOIN ${CORE_TABLES.PRODUCT} p ON pcl.product_id = p.product_id
      WHERE pcl.changed_at >= $1
    `;

    const params: unknown[] = [startDate];
    let paramCount = 2;

    if (categoryId) {
      sql += ` AND p.category_id = $${paramCount++}`;
      params.push(categoryId);
    }

    if (brandId) {
      sql += ` AND p.brand_id = $${paramCount++}`;
      params.push(brandId);
    }

    sql += `
      GROUP BY DATE(pcl.changed_at)
      ORDER BY DATE(pcl.changed_at) ASC
    `;

    const result = await query<unknown>(sql, params);

    return result.rows.map(row => ({
      date: new Date(row.date),
      avg_price: Number(row.avg_price),
      min_price: Number(row.min_price),
      max_price: Number(row.max_price),
      products_count: Number(row.products_count),
    }));
  }
}
