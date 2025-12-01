// @ts-nocheck

import {
  AIServiceBase,
  type AIServiceRequestOptions,
  type AIServiceResponse,
} from '@/lib/ai/services/base';
import type { EnrichedProduct } from '@/lib/cmm/sip-product-enrichment';
import {
  enrichProductForCategorization,
  enrichProductsForCategorization,
} from '@/lib/cmm/sip-product-enrichment';
import {
  suggestTagsBatch as suggestTagsBatchAI,
  enrichProductsBatch as enrichProductsBatchAI,
} from './tag-ai';
import { listCoreTags } from './tag-service-core';
import { query as dbQuery } from '@/lib/database/unified-connection';
import type { TagSuggestion, ProductEnrichment } from './tag-ai/parser';

export interface TagSuggestionOptions extends AIServiceRequestOptions {
  orgId?: string | null;
  batchSize?: number;
  batchDelayMs?: number;
  timeoutMs?: number;
  webResearchEnabled?: boolean;
  webResearchProvider?: string;
}

export interface ProductEnrichmentOptions extends AIServiceRequestOptions {
  orgId?: string | null;
  batchSize?: number;
  batchDelayMs?: number;
  timeoutMs?: number;
  webResearchEnabled?: boolean;
  webResearchProvider?: string;
  applyChanges?: boolean; // Whether to apply changes to database
}

export interface EnrichmentResult {
  supplier_product_id: string;
  supplier_sku: string;
  product_name: string;
  short_description?: string;
  full_description?: string;
  suggested_tags: TagSuggestion[];
  metadata?: Record<string, unknown>;
  confidence: number;
  web_research_results?: unknown[];
  changes_applied?: Record<string, unknown>;
}

export class TagAIService extends AIServiceBase<TagSuggestionOptions> {
  constructor(options?: { defaultProvider?: string; enableNotifications?: boolean }) {
    super('TagAIService', {
      defaultProvider: options?.defaultProvider as any,
      enableNotifications: options?.enableNotifications !== false,
      tags: ['tagging', 'product-enrichment'],
    });
  }

  /**
   * Suggest tags for a batch of products
   */
  async suggestTagsBatch(
    productIds: string[],
    options?: TagSuggestionOptions
  ): Promise<AIServiceResponse<Map<string, TagSuggestion[]>>> {
    return this.executeOperation(
      'suggestTagsBatch',
      async () => {
        // Enrich products
        const enrichedProducts = await enrichProductsForCategorization(productIds);
        if (enrichedProducts.length === 0) {
          return new Map<string, TagSuggestion[]>();
        }

        // Get existing tags
        const existingTags = await listCoreTags();
        const tagsList = existingTags.map(t => ({
          tag_id: t.tag_id,
          name: t.name,
          type: t.type,
        }));

        // Call AI service
        const suggestions = await suggestTagsBatchAI(enrichedProducts, tagsList, options?.orgId, {
          batchSize: options?.batchSize,
          batchDelayMs: options?.batchDelayMs,
          timeoutMs: options?.timeoutMs,
          webResearchEnabled: options?.webResearchEnabled,
          webResearchProvider: options?.webResearchProvider,
        });

        return suggestions;
      },
      options,
      { productCount: productIds.length }
    );
  }

  /**
   * Suggest tags for a single product
   */
  async suggestTagsSingle(
    productId: string,
    options?: TagSuggestionOptions
  ): Promise<AIServiceResponse<TagSuggestion[]>> {
    return this.executeOperation(
      'suggestTagsSingle',
      async () => {
        const result = await this.suggestTagsBatch([productId], options);
        if (!result.success || !result.data) {
          return [];
        }
        return result.data.get(productId) || [];
      },
      options,
      { productId }
    );
  }

  /**
   * Enrich a single product: correct name, generate descriptions, suggest tags
   */
  async enrichProduct(
    productId: string,
    options?: ProductEnrichmentOptions
  ): Promise<AIServiceResponse<EnrichmentResult>> {
    return this.executeOperation(
      'enrichProduct',
      async () => {
        // Get product data
        const product = await enrichProductForCategorization(productId);
        if (!product) {
          throw new Error(`Product not found: ${productId}`);
        }

        // Get existing tags
        const existingTags = await listCoreTags();
        const tagsList = existingTags.map(t => ({
          tag_id: t.tag_id,
          name: t.name,
          type: t.type,
        }));

        // Enrich via AI
        const enrichments = await enrichProductsBatchAI([product], tagsList, options?.orgId, {
          batchSize: 1,
          timeoutMs: options?.timeoutMs,
          webResearchEnabled: options?.webResearchEnabled ?? true,
          webResearchProvider: options?.webResearchProvider,
        });

        const enrichment = enrichments.get(productId);
        if (!enrichment) {
          throw new Error('AI enrichment failed to return results');
        }

        // Validate product name is not SKU
        const correctedName = this.validateProductName(
          enrichment.product_name,
          product.supplier_sku
        );

        // Align descriptions
        const { shortDescription, fullDescription } = this.alignDescriptions(
          enrichment.short_description,
          enrichment.full_description
        );

        const result: EnrichmentResult = {
          supplier_product_id: productId,
          supplier_sku: product.supplier_sku,
          product_name: correctedName,
          short_description: shortDescription,
          full_description: fullDescription,
          suggested_tags: enrichment.suggested_tags || [],
          metadata: enrichment.metadata,
          confidence: enrichment.confidence || 0.8,
        };

        // Apply changes if requested
        if (options?.applyChanges) {
          const changes = await this.applyEnrichmentChanges(productId, result);
          result.changes_applied = changes;
        }

        return result;
      },
      options,
      { productId }
    );
  }

  /**
   * Enrich multiple products in batch
   */
  async enrichProductBatch(
    productIds: string[],
    options?: ProductEnrichmentOptions
  ): Promise<AIServiceResponse<Map<string, EnrichmentResult>>> {
    return this.executeOperation(
      'enrichProductBatch',
      async () => {
        // Enrich products
        const enrichedProducts = await enrichProductsForCategorization(productIds);
        if (enrichedProducts.length === 0) {
          return new Map<string, EnrichmentResult>();
        }

        // Get existing tags
        const existingTags = await listCoreTags();
        const tagsList = existingTags.map(t => ({
          tag_id: t.tag_id,
          name: t.name,
          type: t.type,
        }));

        // Enrich via AI
        const enrichments = await enrichProductsBatchAI(
          enrichedProducts,
          tagsList,
          options?.orgId,
          {
            batchSize: options?.batchSize,
            batchDelayMs: options?.batchDelayMs,
            timeoutMs: options?.timeoutMs,
            webResearchEnabled: options?.webResearchEnabled ?? true,
            webResearchProvider: options?.webResearchProvider,
          }
        );

        const results = new Map<string, EnrichmentResult>();

        for (const product of enrichedProducts) {
          const enrichment = enrichments.get(product.supplier_product_id);
          if (!enrichment) continue;

          const correctedName = this.validateProductName(
            enrichment.product_name,
            product.supplier_sku
          );
          const { shortDescription, fullDescription } = this.alignDescriptions(
            enrichment.short_description,
            enrichment.full_description
          );

          const result: EnrichmentResult = {
            supplier_product_id: product.supplier_product_id,
            supplier_sku: product.supplier_sku,
            product_name: correctedName,
            short_description: shortDescription,
            full_description: fullDescription,
            suggested_tags: enrichment.suggested_tags || [],
            metadata: enrichment.metadata,
            confidence: enrichment.confidence || 0.8,
          };

          // Apply changes if requested
          if (options?.applyChanges) {
            const changes = await this.applyEnrichmentChanges(product.supplier_product_id, result);
            result.changes_applied = changes;
          }

          results.set(product.supplier_product_id, result);
        }

        return results;
      },
      options,
      { productCount: productIds.length }
    );
  }

  /**
   * Validate that product name is not the same as SKU
   */
  validateProductName(name: string, sku: string): string {
    if (name === sku || name.trim() === sku.trim()) {
      // If name is SKU, try to extract from name or return a placeholder
      // In practice, AI should handle this, but we add a safety check
      return `Product ${sku}`; // Fallback - AI should have corrected this
    }
    return name.trim();
  }

  /**
   * Ensure short and full descriptions are aligned
   */
  alignDescriptions(
    shortDesc?: string,
    fullDesc?: string
  ): { shortDescription?: string; fullDescription?: string } {
    if (!shortDesc && !fullDesc) {
      return {};
    }

    // If only one exists, derive the other
    if (shortDesc && !fullDesc) {
      // Short description exists, expand it for full
      return {
        shortDescription: shortDesc,
        fullDescription:
          shortDesc.length < 100
            ? `${shortDesc}. Additional details available upon request.`
            : shortDesc,
      };
    }

    if (fullDesc && !shortDesc) {
      // Full description exists, create short version
      const short = fullDesc.length > 150 ? fullDesc.substring(0, 147) + '...' : fullDesc;
      return {
        shortDescription: short,
        fullDescription: fullDesc,
      };
    }

    // Both exist - ensure short is a subset of full (or at least consistent)
    if (shortDesc && fullDesc) {
      // If short is longer than 200 chars, truncate
      const trimmedShort = shortDesc.length > 200 ? shortDesc.substring(0, 197) + '...' : shortDesc;

      // Ensure full description contains key information from short
      if (!fullDesc.toLowerCase().includes(trimmedShort.toLowerCase().substring(0, 20))) {
        // Prepend short to full if they're too different
        return {
          shortDescription: trimmedShort,
          fullDescription: `${trimmedShort}\n\n${fullDesc}`,
        };
      }

      return {
        shortDescription: trimmedShort,
        fullDescription: fullDesc,
      };
    }

    return { shortDescription: shortDesc, fullDescription: fullDesc };
  }

  /**
   * Apply enrichment changes to database
   */
  private async applyEnrichmentChanges(
    productId: string,
    enrichment: EnrichmentResult
  ): Promise<Record<string, unknown>> {
    const changes: Record<string, unknown> = {};

    // Get current product state
    const current = await dbQuery<{
      name_from_supplier: string;
      short_description: string | null;
      attrs_json: Record<string, unknown> | null;
    }>(
      `SELECT name_from_supplier, short_description, attrs_json
       FROM core.supplier_product
       WHERE supplier_product_id = $1`,
      [productId]
    );

    if (current.rows.length === 0) {
      throw new Error(`Product not found: ${productId}`);
    }

    const currentData = current.rows[0];
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Update product name if changed
    if (enrichment.product_name !== currentData.name_from_supplier) {
      updates.push(`name_from_supplier = $${paramIndex++}`);
      params.push(enrichment.product_name);
      changes.name_from_supplier = enrichment.product_name;
    }

    // Update short description
    if (enrichment.short_description) {
      updates.push(`short_description = $${paramIndex++}`);
      params.push(enrichment.short_description);
      changes.short_description = enrichment.short_description;
    }

    // Update full description in attrs_json
    if (enrichment.full_description) {
      const attrs = currentData.attrs_json || {};
      attrs.full_description = enrichment.full_description;
      updates.push(`attrs_json = $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(attrs));
      changes.full_description = enrichment.full_description;
    }

    // Update metadata in attrs_json
    if (enrichment.metadata) {
      const attrs = currentData.attrs_json || {};
      attrs.metadata = {
        ...((attrs.metadata as Record<string, unknown>) || {}),
        ...enrichment.metadata,
      };
      if (!updates.some(u => u.includes('attrs_json'))) {
        updates.push(`attrs_json = $${paramIndex++}::jsonb`);
        params.push(JSON.stringify(attrs));
      } else {
        // Merge with existing attrs_json update
        const existingIndex = updates.findIndex(u => u.includes('attrs_json'));
        const existingAttrs = JSON.parse(params[existingIndex] as string) as Record<
          string,
          unknown
        >;
        Object.assign(existingAttrs, { metadata: attrs.metadata });
        params[existingIndex] = JSON.stringify(existingAttrs);
      }
      changes.metadata = enrichment.metadata;
    }

    // Apply updates
    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      params.push(productId);

      await dbQuery(
        `UPDATE core.supplier_product
         SET ${updates.join(', ')}
         WHERE supplier_product_id = $${paramIndex}`,
        params
      );

      // Log enrichment activity
      await dbQuery(
        `INSERT INTO core.product_enrichment_log (
          supplier_product_id,
          enrichment_type,
          source_data,
          changes_applied,
          confidence,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          productId,
          'full_enrichment',
          JSON.stringify(currentData),
          JSON.stringify(changes),
          enrichment.confidence,
          'ai_service',
        ]
      );
    }

    return changes;
  }

  /**
   * Validate tag suggestions for conflicts and confidence
   */
  async validateTagSuggestions(
    suggestions: TagSuggestion[]
  ): Promise<{
    valid: TagSuggestion[];
    invalid: Array<{ suggestion: TagSuggestion; reason: string }>;
  }> {
    const valid: TagSuggestion[] = [];
    const invalid: Array<{ suggestion: TagSuggestion; reason: string }> = [];

    for (const suggestion of suggestions) {
      // Check confidence threshold
      if (suggestion.confidence < 0.5) {
        invalid.push({ suggestion, reason: 'Confidence too low (< 0.5)' });
        continue;
      }

      // Check for duplicate tag IDs
      const duplicate = valid.some(t => t.tag_id === suggestion.tag_id);
      if (duplicate) {
        invalid.push({ suggestion, reason: 'Duplicate tag_id' });
        continue;
      }

      // Validate tag_id format
      if (!suggestion.tag_id || suggestion.tag_id.length < 3) {
        invalid.push({ suggestion, reason: 'Invalid tag_id format' });
        continue;
      }

      valid.push(suggestion);
    }

    return { valid, invalid };
  }

  /**
   * Extract metadata from product attributes
   */
  extractMetadata(product: EnrichedProduct): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    if (product.attrs_json) {
      // Extract known metadata fields
      const knownFields = ['dimensions', 'weight', 'material', 'color', 'size', 'specifications'];
      for (const field of knownFields) {
        if (product.attrs_json[field]) {
          metadata[field] = product.attrs_json[field];
        }
      }
    }

    // Extract from product fields
    if (product.brand) metadata.brand = product.brand;
    if (product.barcode) metadata.barcode = product.barcode;
    if (product.pack_size) metadata.pack_size = product.pack_size;
    if (product.uom) metadata.uom = product.uom;

    return metadata;
  }
}
