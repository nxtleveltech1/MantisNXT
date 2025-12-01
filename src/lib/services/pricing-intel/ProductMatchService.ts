import { query } from '@/lib/database';
import { PRICING_TABLES } from '@/lib/db/pricing-schema';
import { AIServiceConfigService } from '@/lib/ai/services/AIServiceConfigService';
import { generateText } from 'ai';

import type { CompetitorProductMatch } from './types';

const MATCH_TABLE = PRICING_TABLES.COMPETITOR_PRODUCT_MATCH;

export class ProductMatchService {
  private aiConfig = new AIServiceConfigService();

  async list(orgId: string, filters?: { status?: string; competitorId?: string }) {
    const conditions = ['org_id = $1'];
    const values: unknown[] = [orgId];
    if (filters?.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }
    if (filters?.competitorId) {
      values.push(filters.competitorId);
      conditions.push(`competitor_id = $${values.length}`);
    }

    const result = await query<CompetitorProductMatch>(
      `
        SELECT *
        FROM ${MATCH_TABLE}
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
      `,
      values
    );

    return result.rows;
  }

  async upsert(
    orgId: string,
    payload: Partial<CompetitorProductMatch>
  ): Promise<CompetitorProductMatch> {
    const result = await query<CompetitorProductMatch>(
      `
        INSERT INTO ${MATCH_TABLE} (
          match_id,
          org_id,
          competitor_id,
          competitor_product_id,
          competitor_sku,
          competitor_title,
          competitor_url,
          internal_product_id,
          internal_sku,
          upc,
          ean,
          asin,
          mpn,
          match_confidence,
          match_method,
          status,
          metadata
        )
        VALUES (
          COALESCE($2, gen_random_uuid()),
          $1,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          COALESCE($14, 0),
          COALESCE($15, 'manual'),
          COALESCE($16, 'pending'),
          COALESCE($17::jsonb, '{}'::jsonb)
        )
        ON CONFLICT (org_id, competitor_id, competitor_product_id)
        DO UPDATE SET
          competitor_sku = COALESCE(EXCLUDED.competitor_sku, ${MATCH_TABLE}.competitor_sku),
          competitor_title = COALESCE(EXCLUDED.competitor_title, ${MATCH_TABLE}.competitor_title),
          competitor_url = COALESCE(EXCLUDED.competitor_url, ${MATCH_TABLE}.competitor_url),
          internal_product_id = COALESCE(EXCLUDED.internal_product_id, ${MATCH_TABLE}.internal_product_id),
          internal_sku = COALESCE(EXCLUDED.internal_sku, ${MATCH_TABLE}.internal_sku),
          upc = COALESCE(EXCLUDED.upc, ${MATCH_TABLE}.upc),
          ean = COALESCE(EXCLUDED.ean, ${MATCH_TABLE}.ean),
          asin = COALESCE(EXCLUDED.asin, ${MATCH_TABLE}.asin),
          mpn = COALESCE(EXCLUDED.mpn, ${MATCH_TABLE}.mpn),
          match_confidence = EXCLUDED.match_confidence,
          match_method = EXCLUDED.match_method,
          status = EXCLUDED.status,
          metadata = COALESCE(EXCLUDED.metadata, ${MATCH_TABLE}.metadata),
          updated_at = NOW()
        RETURNING *
      `,
      [
        orgId,
        payload.match_id ?? null,
        payload.competitor_id,
        payload.competitor_product_id,
        payload.competitor_sku ?? null,
        payload.competitor_title ?? null,
        payload.competitor_url ?? null,
        payload.internal_product_id ?? null,
        payload.internal_sku ?? null,
        payload.upc ?? null,
        payload.ean ?? null,
        payload.asin ?? null,
        payload.mpn ?? null,
        payload.match_confidence ?? 0,
        payload.match_method ?? 'manual',
        payload.status ?? 'pending',
        payload.metadata ? JSON.stringify(payload.metadata) : null,
      ]
    );

    return result.rows[0];
  }

  async updateStatus(
    orgId: string,
    matchId: string,
    status: 'matched' | 'rejected',
    reviewerId?: string
  ): Promise<void> {
    await query(
      `
        UPDATE ${MATCH_TABLE}
        SET status = $3,
            reviewer_id = $4,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE org_id = $1 AND match_id = $2
      `,
      [orgId, matchId, status, reviewerId ?? null]
    );
  }

  async suggestMatches(
    orgId: string,
    product: { title: string; sku?: string; upc?: string },
    competitors: string[]
  ) {
    const aiConfig = await this.aiConfig.getConfig(orgId, 'competitive_intel_product_match');
    if (!aiConfig?.is_enabled) {
      return [];
    }

    const prompt = [
      'You are a product matching assistant.',
      'Return JSON array of potential competitor identifiers (sku/title/confidence).',
      `Product: ${product.title}`,
      product.sku ? `SKU: ${product.sku}` : '',
      product.upc ? `UPC: ${product.upc}` : '',
      `Competitors: ${competitors.join(', ')}`,
      'Response must be valid JSON.',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await generateText({
      model: aiConfig.model_name,
      prompt,
      temperature: 0.1,
      maxTokens: 800,
    });

    try {
      const parsed = JSON.parse(result.text);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      /* ignore parse error */
    }
    return [];
  }
}
