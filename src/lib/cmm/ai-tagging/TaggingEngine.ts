/**
 * Tagging Engine
 * Handles AI tagging with smart re-tagging logic
 * Mirrors: src/lib/cmm/ai-categorization/CategorizationEngine.ts
 */

import { query as dbQuery } from '@/lib/database/unified-connection';
import { suggestTagsBatch, type TagSuggestion as ProviderTagSuggestion } from '../tag-ai';
import { listCoreTags } from '../tag-service-core';
import { assignCoreTag } from '../tag-service-core';
import { recordProposedTagForProduct } from '../proposed-tags';
import type { EnrichedProduct } from '../sip-product-enrichment';
import type {
  BatchResult,
  TaggingResult,
  TaggingStatus,
  JobConfig} from './types';

export class TaggingEngine {
  private confidenceThreshold: number;

  constructor(confidenceThreshold: number = 0.7) {
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Process a batch of products with AI tagging
   */
  async tagBatch(
    products: EnrichedProduct[],
    config: JobConfig = {},
    orgId?: string | null,
    jobId?: string
  ): Promise<BatchResult> {
    const startTime = Date.now();
    const results: TaggingResult[] = [];
    const errors: Array<{ product_id: string; error: string }> = [];
    let pendingReviewCount = 0;

    const threshold = config.confidence_threshold || this.confidenceThreshold;
    const forceRetag = config.force_retag || false;

    try {
      const providerBatchSize = Math.min(config.provider_batch_size ?? 10, products.length);
      const providerTimeoutMs = config.provider_timeout_ms ?? config.timeout_ms ?? 60000;
      const overallTimeoutMs = config.overall_timeout_ms ?? providerTimeoutMs * 2;
      const maxBatches = config.max_batches;

      // Get existing tags for context
      const existingTags = await listCoreTags();
      const tagsList = existingTags.map(t => ({
        tag_id: t.tag_id,
        name: t.name,
        type: t.type,
      }));
      const existingTagIdSet = new Set(tagsList.map(t => t.tag_id.toLowerCase()));

      // Get AI suggestions for the batch
      console.log(
        `[TaggingEngine] Requesting AI tag suggestions for ${products.length} products (provider batch size=${providerBatchSize}, timeout=${providerTimeoutMs}ms)`
      );
      const suggestions = await suggestTagsBatch(
        products,
        tagsList,
        orgId,
        {
          batchSize: providerBatchSize,
          batchDelayMs: config.batch_delay_ms || 0,
          timeoutMs: providerTimeoutMs,
          overallTimeoutMs,
          maxBatches,
        }
      );
      console.log(`[TaggingEngine] Received ${suggestions.size} AI tag suggestions`);
      
      if (suggestions.size === 0) {
        console.warn(`[TaggingEngine] No AI suggestions received for ${products.length} products. This may indicate:
          - AI provider is not configured or not enabled
          - AI provider API call failed
          - All suggestions were filtered out
        `);
      }

      // Process each product with smart re-tagging logic
      for (const product of products) {
        try {
          const productSuggestions = suggestions.get(product.supplier_product_id) || [];
          if (productSuggestions.length === 0) {
            console.debug(`[TaggingEngine] No suggestions for product ${product.supplier_product_id} (${product.name_from_supplier})`);
          }
          const result = await this.processProduct(
            product,
            productSuggestions,
            threshold,
            forceRetag,
            jobId,
            orgId,
            existingTagIdSet
          );
          results.push(result);
          if (result.status === 'pending_review') {
            pendingReviewCount++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            product_id: product.supplier_product_id,
            error: errorMessage,
          });
          results.push({
            supplier_product_id: product.supplier_product_id,
            success: false,
            tag_ids: null,
            confidence: null,
            status: 'failed',
            error_message: errorMessage,
            provider: null,
            reasoning: null,
          });
        }
      }

      const duration = Date.now() - startTime;
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => r.status === 'failed').length;
      const skipped = results.filter(r => r.status === 'skipped').length;

      // Estimate tokens used (rough calculation)
      const tokensUsed = successful * 150; // Approximate tokens per successful tagging

      return {
        batch_number: 0, // Will be set by TagJobManager
        products_processed: products.length,
        successful,
        failed,
        skipped,
        pending_review: pendingReviewCount,
        duration_ms: duration,
        tokens_used: tokensUsed,
        results,
        errors,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Batch processing failed';

      // Mark all products as failed
      for (const product of products) {
        results.push({
          supplier_product_id: product.supplier_product_id,
          success: false,
          tag_ids: null,
          confidence: null,
          status: 'failed',
          error_message: errorMessage,
          provider: null,
          reasoning: null,
        });
        errors.push({
          product_id: product.supplier_product_id,
          error: errorMessage,
        });
      }

      return {
        batch_number: 0,
        products_processed: products.length,
        successful: 0,
        failed: products.length,
        skipped: 0,
        pending_review: 0,
        duration_ms: duration,
        tokens_used: 0,
        results,
        errors,
      };
    }
  }

  /**
   * Process a single product with smart re-tagging logic
   */
  private async processProduct(
    product: EnrichedProduct,
    suggestions: ProviderTagSuggestion[],
    threshold: number,
    forceRetag: boolean,
    jobId?: string,
    orgId?: string | null,
    existingTagIds?: Set<string>
  ): Promise<TaggingResult> {
    // No AI suggestions available
    if (!suggestions || suggestions.length === 0) {
      return {
        supplier_product_id: product.supplier_product_id,
        success: false,
        tag_ids: null,
        confidence: null,
        status: 'skipped',
        error_message: null,
        provider: null,
        reasoning: null,
        skipped_reason: 'no_suggestion',
      };
    }

    // Filter suggestions by confidence threshold
    const validSuggestions = suggestions.filter(s => (s.confidence || 0) >= threshold);
    
    if (validSuggestions.length === 0) {
      return {
        supplier_product_id: product.supplier_product_id,
        success: false,
        tag_ids: null,
        confidence: null,
        status: 'skipped',
        error_message: null,
        provider: suggestions[0]?.provider || null,
        reasoning: null,
        skipped_reason: 'low_confidence',
      };
    }

    // Get average confidence from valid suggestions
    const avgConfidence = validSuggestions.reduce((sum, s) => sum + (s.confidence || 0), 0) / validSuggestions.length;
    const provider = validSuggestions[0]?.provider ?? null;
    const reasoning = validSuggestions.map(s => s.reasoning).filter(Boolean).join('; ') || null;

    const knownIdSet = existingTagIds ?? new Set<string>();
    const knownSuggestions = validSuggestions.filter(
      s => s.tag_id && knownIdSet.has(s.tag_id.toLowerCase())
    );
    const recognizedTagIds = Array.from(
      new Set(
        knownSuggestions
          .map(s => s.tag_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const newSuggestions = validSuggestions.filter(
      s => !s.tag_id || !knownIdSet.has(s.tag_id.toLowerCase())
    );

    if (newSuggestions.length > 0) {
      const recordedNames = new Set<string>();
      for (const suggestion of newSuggestions) {
        const proposedName = suggestion.tag_name?.trim();
        if (!proposedName || recordedNames.has(proposedName.toLowerCase())) {
          continue;
        }
        recordedNames.add(proposedName.toLowerCase());
        try {
          await recordProposedTagForProduct({
            supplierProductId: product.supplier_product_id,
            proposedName,
            tagType: suggestion.type ?? 'custom',
            confidence: suggestion.confidence ?? avgConfidence,
            reasoning: suggestion.reason,
            provider: suggestion.provider ?? provider ?? null,
            jobId: jobId ?? null,
            orgId: orgId ?? null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown database error';

          // Structured error logging for debugging
          console.error('[TaggingEngine] Failed to record tag proposal', {
            jobId: jobId ?? 'unknown',
            productId: product.supplier_product_id,
            productName: product.name_from_supplier,
            provider: suggestion.provider ?? provider ?? 'unknown',
            model: suggestion.model ?? 'unknown',
            proposedTag: proposedName,
            confidence: suggestion.confidence ?? avgConfidence,
            dbError: errorMessage,
            timestamp: new Date().toISOString(),
          });

          // Mark product as failed to prevent silent failures
          try {
            await this.updateProductTaggingStatus(
              product.supplier_product_id,
              'failed',
              `Proposal recording failed: ${errorMessage}`
            );
          } catch (statusUpdateError) {
            console.error('[TaggingEngine] Failed to update product status after proposal error', {
              productId: product.supplier_product_id,
              originalError: errorMessage,
              statusUpdateError: statusUpdateError instanceof Error ? statusUpdateError.message : 'Unknown error',
            });
          }

          // Continue processing other products - don't crash the entire batch
        }
      }
    }

    if (recognizedTagIds.length === 0) {
      return {
        supplier_product_id: product.supplier_product_id,
        success: false,
        tag_ids: null,
        confidence: avgConfidence,
        status: 'pending_review',
        error_message: null,
        provider,
        reasoning,
        skipped_reason: 'pending_review',
      };
    }

    // Check if we should apply these tags
    const shouldApply = await this.shouldRetag(
      product,
      avgConfidence,
      threshold,
      forceRetag
    );

    if (!shouldApply.apply) {
      return {
        supplier_product_id: product.supplier_product_id,
        success: false,
        tag_ids: null,
        confidence: avgConfidence,
        status: 'skipped',
        error_message: null,
        provider,
        reasoning,
        skipped_reason: shouldApply.reason as unknown,
      };
    }

    // Apply the tags
    return {
      supplier_product_id: product.supplier_product_id,
      success: true,
      tag_ids: recognizedTagIds,
      confidence: avgConfidence,
      status: 'completed',
      error_message: null,
      provider,
      reasoning,
    };
  }

  /**
   * Determine if a product should be (re)tagged based on smart logic
   * 
   * Re-tagging rules:
   * 1. If product has no tags: always tag
   * 2. If product has tags and ai_tag_confidence exists: only if newConfidence > ai_tag_confidence
   * 3. If product has tags but no ai_tag_confidence: tag if newConfidence >= threshold
   * 4. Force override bypasses all rules
   */
  async shouldRetag(
    product: EnrichedProduct,
    newConfidence: number,
    threshold: number,
    forceRetag: boolean = false
  ): Promise<{ apply: boolean; reason?: string }> {
    // Force override
    if (forceRetag) {
      return { apply: true };
    }

    // Check current confidence and existing tags from database
    const sql = `
      SELECT 
        sp.ai_tag_confidence,
        COUNT(ata.tag_id) as tag_count
      FROM core.supplier_product sp
      LEFT JOIN core.ai_tag_assignment ata ON ata.supplier_product_id = sp.supplier_product_id
      WHERE sp.supplier_product_id = $1
      GROUP BY sp.supplier_product_id, sp.ai_tag_confidence
    `;

    const result = await dbQuery<{
      ai_tag_confidence: number | null;
      tag_count: number;
    }>(sql, [product.supplier_product_id]);

    if (result.rows.length === 0) {
      return { apply: false, reason: 'Product not found' };
    }

    const currentData = result.rows[0];
    const hasTags = Number(currentData.tag_count) > 0;
    const currentConfidence = currentData.ai_tag_confidence;

    // Rule 1: No tags - always tag (if meets threshold)
    if (!hasTags) {
      if (newConfidence >= threshold) {
        return { apply: true };
      }
      return { apply: false, reason: 'low_confidence' };
    }

    // Rule 2: Has tags with confidence - only if new is better
    if (hasTags && currentConfidence !== null) {
      if (newConfidence > currentConfidence) {
        return { apply: true };
      }
      return { apply: false, reason: 'already_tagged' };
    }

    // Rule 3: Has tags but no confidence - tag if meets threshold
    if (hasTags && currentConfidence === null) {
      if (newConfidence >= threshold) {
        return { apply: true };
      }
      return { apply: false, reason: 'low_confidence' };
    }

    return { apply: false, reason: 'already_tagged' };
  }

  /**
   * Apply tagging results to database
   */
  async applyTaggingResults(
    results: TaggingResult[],
    jobId?: string
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ product_id: string; error: string }>;
  }> {
    let successful = 0;
    let failed = 0;
    const errors: Array<{ product_id: string; error: string }> = [];

    for (const result of results) {
      // Handle skipped products - update their status back to pending
      if (result.status === 'skipped') {
        try {
          await this.updateProductTaggingStatus(
            result.supplier_product_id,
            'pending',
            result.error_message || `Skipped: ${result.skipped_reason || 'unknown'}`
          );
        } catch (e) {
          console.error('Failed to update skipped status:', e);
        }
        continue;
      }

      // Handle failed products
      if (result.status === 'pending_review') {
        // Status already set by proposal workflow
        continue;
      }

      if (result.status === 'failed' || !result.success) {
        try {
          await this.updateProductTaggingStatus(
            result.supplier_product_id,
            'failed',
            result.error_message || 'Tagging failed'
          );
        } catch (e) {
          console.error('Failed to update failed status:', e);
        }
        failed++;
        continue;
      }

      // Handle successful taggings
      if (result.status === 'completed' && result.success && result.tag_ids && result.tag_ids.length > 0) {
        try {
          await this.updateProductTagging({
            supplier_product_id: result.supplier_product_id,
            tag_ids: result.tag_ids,
            confidence: result.confidence!,
            provider: result.provider,
            reasoning: result.reasoning,
            status: 'completed',
          });
          successful++;
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : 'Update failed';
          errors.push({
            product_id: result.supplier_product_id,
            error: errorMessage,
          });

          // Update product with failed status
          try {
            await this.updateProductTaggingStatus(
              result.supplier_product_id,
              'failed',
              errorMessage
            );
          } catch (e) {
            console.error('Failed to update failed status:', e);
          }
        }
      }
    }

    return { successful, failed, errors };
  }

  /**
   * Update product with new tags
   */
  private async updateProductTagging(params: {
    supplier_product_id: string;
    tag_ids: string[];
    confidence: number;
    provider: string | null;
    reasoning: string | null;
    status: TaggingStatus;
  }): Promise<void> {
    // First, get current tags to preserve them (unless force_retag)
    // For now, we'll add new tags without removing existing ones
    // (This can be made configurable later)
    
    // Update product tagging metadata
    const sql = `
      UPDATE core.supplier_product
      SET 
        previous_tag_confidence = ai_tag_confidence,
        ai_tag_confidence = $2,
        ai_tag_provider = $3,
        ai_tag_reasoning = $4,
        ai_tagging_status = $5,
        ai_tagged_at = NOW(),
        updated_at = NOW()
      WHERE supplier_product_id = $1
    `;

    await dbQuery(sql, [
      params.supplier_product_id,
      params.confidence,
      params.provider,
      params.reasoning,
      params.status,
    ]);

    // Assign tags to product
    for (const tagId of params.tag_ids) {
      try {
        await assignCoreTag(params.supplier_product_id, tagId, { assignedBy: 'ai_tagging' });
      } catch (error) {
        console.error(`Failed to assign tag ${tagId} to product ${params.supplier_product_id}:`, error);
        // Continue with other tags even if one fails
      }
    }
  }

  /**
   * Update product tagging status only
   */
  private async updateProductTaggingStatus(
    supplierProductId: string,
    status: TaggingStatus,
    errorMessage?: string
  ): Promise<void> {
    const sql = `
      UPDATE core.supplier_product
      SET 
        ai_tagging_status = $2,
        ai_tag_reasoning = COALESCE($3, ai_tag_reasoning),
        updated_at = NOW()
      WHERE supplier_product_id = $1
    `;

    await dbQuery(sql, [supplierProductId, status, errorMessage || null]);
  }

  /**
   * Mark products as processing
   */
  async markProductsAsProcessing(productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;

    const sql = `
      UPDATE core.supplier_product
      SET ai_tagging_status = 'processing'
      WHERE supplier_product_id = ANY($1::uuid[])
    `;

    await dbQuery(sql, [productIds]);
  }

  /**
   * Get products ready for tagging
   */
  async getProductsForTagging(params: {
    limit: number;
    offset: number;
    supplier_id?: string;
    status?: TaggingStatus[];
    exclude_tagged?: boolean;
  }): Promise<EnrichedProduct[]> {
    const whereClauses: string[] = [];
    const queryParams: unknown[] = [];
    let paramCounter = 1;

    if (params.supplier_id) {
      whereClauses.push(`sp.supplier_id = $${paramCounter}`);
      queryParams.push(params.supplier_id);
      paramCounter++;
    }

    if (params.status && params.status.length > 0) {
      whereClauses.push(`sp.ai_tagging_status = ANY($${paramCounter}::varchar[])`);
      queryParams.push(params.status);
      paramCounter++;
    }

    if (params.exclude_tagged) {
      whereClauses.push(`sp.supplier_product_id NOT IN (
        SELECT DISTINCT supplier_product_id FROM core.ai_tag_assignment
      )`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    queryParams.push(params.limit);
    queryParams.push(params.offset);

    const sql = `
      SELECT 
        sp.supplier_product_id,
        sp.supplier_id,
        sp.supplier_sku,
        sp.name_from_supplier,
        sp.category_id,
        c.name AS category_name,
        c.path AS category_path,
        s.name AS supplier_name,
        s.code AS supplier_code,
        sp.uom,
        sp.pack_size,
        sp.barcode,
        sp.attrs_json,
        sp.is_active,
        sp.is_new,
        sp.first_seen_at,
        sp.last_seen_at,
        NULL::varchar AS brand,
        NULL::varchar AS category_raw,
        NULL::numeric AS current_price,
        NULL::varchar AS currency,
        NULL::int AS qty_on_hand,
        NULL::int AS qty_on_order
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN core.category c ON c.category_id = sp.category_id
      ${whereClause}
      ORDER BY sp.created_at ASC
      LIMIT $${paramCounter}
      OFFSET $${paramCounter + 1}
    `;

    const result = await dbQuery<EnrichedProduct>(sql, queryParams);
    return result.rows;
  }
}

// Singleton instance
export const taggingEngine = new TaggingEngine();

