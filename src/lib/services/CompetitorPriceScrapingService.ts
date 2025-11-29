/**
 * Competitor Price Scraping Service
 * 
 * Handles collection of competitor pricing data through various methods:
 * - Manual entry
 * - API integration
 * - Web scraping
 * - CSV/Excel import
 */

import { query } from '@/lib/database';
import { PRICING_TABLES } from '@/lib/db/pricing-schema';
import { v4 as uuidv4 } from 'uuid';

export interface CompetitorPriceInput {
  product_id: string;
  competitor_name: string;
  competitor_sku?: string;
  price: number;
  currency?: string;
  source_url?: string;
  source_type?: 'manual' | 'scraper' | 'api' | 'feed';
  in_stock?: boolean;
  stock_level?: 'low' | 'medium' | 'high' | 'out_of_stock';
  metadata?: Record<string, unknown>;
}

export interface ScrapingConfig {
  competitor_name: string;
  base_url: string;
  selectors?: {
    price?: string;
    sku?: string;
    stock?: string;
  };
  headers?: Record<string, string>;
  rate_limit_ms?: number;
}

export class CompetitorPriceScrapingService {
  /**
   * Save competitor price to database
   */
  static async saveCompetitorPrice(
    orgId: string,
    input: CompetitorPriceInput
  ): Promise<string> {
    const competitorPriceId = uuidv4();

    const result = await query<{ competitor_price_id: string }>(
      `
      INSERT INTO ${PRICING_TABLES.COMPETITOR_PRICES} (
        competitor_price_id,
        product_id,
        competitor_name,
        competitor_sku,
        price,
        currency,
        source_url,
        availability,
        last_checked,
        is_active,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
      ON CONFLICT (competitor_price_id) DO UPDATE SET
        price = EXCLUDED.price,
        availability = EXCLUDED.availability,
        last_checked = NOW(),
        is_active = true,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING competitor_price_id
      `,
      [
        competitorPriceId,
        input.product_id,
        input.competitor_name,
        input.competitor_sku || null,
        input.price,
        input.currency || 'ZAR',
        input.source_url || null,
        input.in_stock === false ? 'out_of_stock' : input.stock_level || 'unknown',
        true,
        JSON.stringify(input.metadata || {}),
      ]
    );

    return result.rows[0].competitor_price_id;
  }

  /**
   * Bulk import competitor prices from array
   */
  static async bulkImportPrices(
    orgId: string,
    prices: CompetitorPriceInput[]
  ): Promise<{ succeeded: number; failed: number; errors: string[] }> {
    const results = { succeeded: 0, failed: 0, errors: [] as string[] };

    for (const price of prices) {
      try {
        await this.saveCompetitorPrice(orgId, price);
        results.succeeded++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Failed to import price for ${price.competitor_name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return results;
  }

  /**
   * Get competitor prices for a product
   */
  static async getCompetitorPrices(productId: string): Promise<Array<{
    competitor_price_id: string;
    competitor_name: string;
    price: number;
    currency: string;
    availability: string;
    last_checked: Date;
  }>> {
    const result = await query(
      `
      SELECT 
        competitor_price_id,
        competitor_name,
        price,
        currency,
        availability,
        last_checked
      FROM ${PRICING_TABLES.COMPETITOR_PRICES}
      WHERE product_id = $1 AND is_active = true
      ORDER BY last_checked DESC
      `,
      [productId]
    );

    return result.rows.map(row => ({
      ...row,
      last_checked: new Date(row.last_checked),
    }));
  }

  /**
   * Mark competitor prices as inactive (soft delete)
   */
  static async deactivateCompetitorPrices(
    competitorPriceIds: string[]
  ): Promise<number> {
    if (competitorPriceIds.length === 0) return 0;

    const result = await query(
      `
      UPDATE ${PRICING_TABLES.COMPETITOR_PRICES}
      SET is_active = false, updated_at = NOW()
      WHERE competitor_price_id = ANY($1)
      `,
      [competitorPriceIds]
    );

    return result.rowCount || 0;
  }

  /**
   * Get all active competitors being tracked
   */
  static async getActiveCompetitors(): Promise<Array<{
    competitor_name: string;
    products_tracked: number;
    last_updated: Date;
  }>> {
    const result = await query(
      `
      SELECT 
        competitor_name,
        COUNT(DISTINCT product_id) as products_tracked,
        MAX(last_checked) as last_updated
      FROM ${PRICING_TABLES.COMPETITOR_PRICES}
      WHERE is_active = true
      GROUP BY competitor_name
      ORDER BY products_tracked DESC
      `
    );

    return result.rows.map(row => ({
      competitor_name: row.competitor_name,
      products_tracked: Number(row.products_tracked),
      last_updated: new Date(row.last_updated),
    }));
  }

  /**
   * Update prices for stale competitor data
   * Marks prices as inactive if not updated within specified days
   */
  static async cleanupStalePrices(staleDays = 30): Promise<number> {
    const result = await query(
      `
      UPDATE ${PRICING_TABLES.COMPETITOR_PRICES}
      SET is_active = false, updated_at = NOW()
      WHERE is_active = true
        AND last_checked < NOW() - INTERVAL '${staleDays} days'
      `
    );

    return result.rowCount || 0;
  }
}








