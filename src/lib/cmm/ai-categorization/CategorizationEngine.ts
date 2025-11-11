/**
 * Categorization Engine
 * Handles AI categorization with smart re-categorization logic
 */

import { query as dbQuery } from '@/lib/database/unified-connection';
import {
  suggestCategoriesBatch,
  type CategorySuggestion as ProviderCategorySuggestion,
} from '../category-ai';
import { recordProposedCategoryForProduct } from '../proposed-categories';
import type { EnrichedProduct } from '../sip-product-enrichment';
import type {
  BatchResult,
  CategorizationResult,
  CategorizationStatus,
  JobConfig} from './types';



export class CategorizationEngine {
  private confidenceThreshold: number;

  constructor(confidenceThreshold: number = 0.7) {
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Process a batch of products with AI categorization
   */
  async categorizeBatch(
    products: EnrichedProduct[],
    config: JobConfig = {},
    orgId?: string | null,
    jobId?: string
  ): Promise<BatchResult> {
    const startTime = Date.now();
    const results: CategorizationResult[] = [];
    const errors: Array<{ product_id: string; error: string }> = [];
    let pendingReviewCount = 0;

    const threshold = config.confidence_threshold || this.confidenceThreshold;
    const forceRecategorize = config.force_recategorize || false;

    try {
      const providerBatchSize = Math.min(config.provider_batch_size ?? 10, products.length);
      const providerTimeoutMs = config.provider_timeout_ms ?? config.timeout_ms ?? 60000;
      const overallTimeoutMs = config.overall_timeout_ms ?? providerTimeoutMs * 2;
      const maxBatches = config.max_batches;

      // Get AI suggestions for the batch
      console.log(
        `[CategorizationEngine] Requesting AI suggestions for ${products.length} products (provider batch size=${providerBatchSize}, timeout=${providerTimeoutMs}ms)`
      );
      const suggestions = await suggestCategoriesBatch(
        products,
        undefined,
        orgId,
        {
          batchSize: providerBatchSize,
          batchDelayMs: config.batch_delay_ms || 0,
          timeoutMs: providerTimeoutMs,
          overallTimeoutMs,
          maxBatches,
        }
      );
      console.log(`[CategorizationEngine] Received ${suggestions.size} AI suggestions`);

      // Process each product with smart re-categorization logic
      for (const product of products) {
        try {
          const suggestion = suggestions.get(product.supplier_product_id);
          const result = await this.processProduct(
            product,
            suggestion,
            threshold,
            forceRecategorize,
            jobId,
            orgId
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
            category_id: null,
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
      const tokensUsed = successful * 150; // Approximate tokens per successful categorization

      return {
        batch_number: 0, // Will be set by JobManager
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
          category_id: null,
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
   * Process a single product with smart re-categorization logic
   */
  private async processProduct(
    product: EnrichedProduct,
    suggestion: ProviderCategorySuggestion | undefined,
    threshold: number,
    forceRecategorize: boolean,
    jobId?: string,
    orgId?: string | null
  ): Promise<CategorizationResult> {
    // No AI suggestion available
    if (
      !suggestion ||
      (!suggestion.categoryId && !suggestion.proposedCategoryName && !suggestion.categoryName)
    ) {
      return {
        supplier_product_id: product.supplier_product_id,
        success: false,
        category_id: null,
        confidence: null,
        status: 'skipped',
        error_message: null,
        provider: null,
        reasoning: null,
        skipped_reason: 'no_suggestion',
      };
    }

    const newConfidence = suggestion.confidence;
    const categoryId = suggestion.categoryId || null;
    const provider = suggestion.provider ?? null;
    const reasoning = suggestion.reasoning ?? null;
    const proposedName = suggestion.proposedCategoryName || suggestion.categoryName || null;

    if (!categoryId && proposedName) {
      const proposal = await recordProposedCategoryForProduct({
        supplierProductId: product.supplier_product_id,
        proposedName,
        confidence: newConfidence,
        reasoning,
        provider,
        jobId,
        orgId,
      });

      return {
        supplier_product_id: product.supplier_product_id,
        success: false,
        category_id: null,
        confidence: newConfidence,
        status: proposal.nextStatus,
        error_message: null,
        provider,
        reasoning,
        proposed_category_id: proposal.proposedCategory.proposed_category_id,
        proposed_category_name: proposal.proposedCategory.display_name,
      };
    }

    if (!categoryId) {
      return {
        supplier_product_id: product.supplier_product_id,
        success: false,
        category_id: null,
        confidence: newConfidence,
        status: 'skipped',
        error_message: null,
        provider,
        reasoning,
        skipped_reason: 'no_suggestion',
      };
    }

    // Check if we should apply this categorization
    const shouldApply = await this.shouldRecategorize(
      product,
      newConfidence,
      threshold,
      forceRecategorize
    );

    if (!shouldApply.apply) {
      return {
        supplier_product_id: product.supplier_product_id,
        success: false,
        category_id: product.category_id,
        confidence: newConfidence,
        status: 'skipped',
        error_message: null,
        provider,
        reasoning,
        skipped_reason: shouldApply.reason as unknown,
      };
    }

    // Apply the categorization
    return {
      supplier_product_id: product.supplier_product_id,
      success: true,
      category_id: categoryId,
      confidence: newConfidence,
      status: 'completed',
      error_message: null,
      provider,
      reasoning,
    };
  }

  /**
   * Determine if a product should be (re)categorized based on smart logic
   * 
   * Re-categorization rules:
   * 1. If product has no category: always categorize
   * 2. If product has category and ai_confidence exists: only if newConfidence > ai_confidence
   * 3. If product has category but no ai_confidence: categorize if newConfidence >= threshold
   * 4. Force override bypasses all rules
   */
  async shouldRecategorize(
    product: EnrichedProduct,
    newConfidence: number,
    threshold: number,
    forceRecategorize: boolean = false
  ): Promise<{ apply: boolean; reason?: string }> {
    // Force override
    if (forceRecategorize) {
      return { apply: true };
    }

    // Check current confidence from database
    const sql = `
      SELECT ai_confidence, category_id
      FROM core.supplier_product
      WHERE supplier_product_id = $1
    `;

    const result = await dbQuery<{
      ai_confidence: number | null;
      category_id: string | null;
    }>(sql, [product.supplier_product_id]);

    if (result.rows.length === 0) {
      return { apply: false, reason: 'Product not found' };
    }

    const currentData = result.rows[0];
    const hasCategory = currentData.category_id !== null;
    const currentConfidence = currentData.ai_confidence;

    // Rule 1: No category - always categorize (if meets threshold)
    if (!hasCategory) {
      if (newConfidence >= threshold) {
        return { apply: true };
      }
      return { apply: false, reason: 'low_confidence' };
    }

    // Rule 2: Has category with confidence - only if new is better
    if (hasCategory && currentConfidence !== null) {
      if (newConfidence > currentConfidence) {
        return { apply: true };
      }
      return { apply: false, reason: 'already_categorized' };
    }

    // Rule 3: Has category but no confidence - categorize if meets threshold
    if (hasCategory && currentConfidence === null) {
      if (newConfidence >= threshold) {
        return { apply: true };
      }
      return { apply: false, reason: 'low_confidence' };
    }

    return { apply: false, reason: 'already_categorized' };
  }

  /**
   * Apply categorization results to database
   */
  async applyCategorizationResults(
    results: CategorizationResult[],
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
          await this.updateProductCategorizationStatus(
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
          await this.updateProductCategorizationStatus(
            result.supplier_product_id,
            'failed',
            result.error_message || 'Categorization failed'
          );
        } catch (e) {
          console.error('Failed to update failed status:', e);
        }
        failed++;
        continue;
      }

      // Handle successful categorizations
      if (result.status === 'completed' && result.success) {
        try {
          await this.updateProductCategorization({
            supplier_product_id: result.supplier_product_id,
            category_id: result.category_id!,
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
            await this.updateProductCategorizationStatus(
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
   * Update product with new categorization
   */
  private async updateProductCategorization(params: {
    supplier_product_id: string;
    category_id: string;
    confidence: number;
    provider: string | null;
    reasoning: string | null;
    status: CategorizationStatus;
  }): Promise<void> {
    const sql = `
      UPDATE core.supplier_product
      SET 
        previous_confidence = ai_confidence,
        category_id = $2,
        ai_confidence = $3,
        ai_provider = $4,
        ai_reasoning = $5,
        ai_categorization_status = $6,
        ai_categorized_at = NOW(),
        updated_at = NOW()
      WHERE supplier_product_id = $1
    `;

    await dbQuery(sql, [
      params.supplier_product_id,
      params.category_id,
      params.confidence,
      params.provider,
      params.reasoning,
      params.status,
    ]);
  }

  /**
   * Update product categorization status only
   */
  private async updateProductCategorizationStatus(
    supplierProductId: string,
    status: CategorizationStatus,
    errorMessage?: string
  ): Promise<void> {
    const sql = `
      UPDATE core.supplier_product
      SET 
        ai_categorization_status = $2,
        ai_reasoning = COALESCE($3, ai_reasoning),
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
      SET ai_categorization_status = 'processing'
      WHERE supplier_product_id = ANY($1::uuid[])
    `;

    await dbQuery(sql, [productIds]);
  }

  /**
   * Get products ready for categorization
   */
  async getProductsForCategorization(params: {
    limit: number;
    offset: number;
    supplier_id?: string;
    status?: CategorizationStatus[];
    exclude_categorized?: boolean;
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
      whereClauses.push(`sp.ai_categorization_status = ANY($${paramCounter}::varchar[])`);
      queryParams.push(params.status);
      paramCounter++;
    }

    if (params.exclude_categorized) {
      whereClauses.push(`sp.category_id IS NULL`);
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
export const categorizationEngine = new CategorizationEngine();

