import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  enrichProductsForCategorization,
  getUncategorizedProducts,
} from '@/lib/cmm/sip-product-enrichment';
import { suggestCategoriesBatch } from '@/lib/cmm/category-ai';
import { resolveOrgId } from '@/lib/ai/model-utils';

/**
 * Process products in batches with delays to respect rate limits
 * NOTE: This function is deprecated - batch processing now happens at the API level
 * Keeping for backwards compatibility but not used in new batch flow
 */
async function processInBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 50, // Updated default to match new batch size
  delayBetweenBatches: number = 2000 // 2 seconds default
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);

    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)`);

    // Process batch in parallel
    const batchResults = await Promise.allSettled(batch.map(item => processor(item)));

    // Collect successful results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value !== null) {
        results.push(result.value);
      } else if (result.status === 'rejected') {
        console.error(`Failed to process item in batch ${batchNumber}:`, result.reason);
      }
    });

    // Add delay between batches (except after the last batch)
    if (i + batchSize < items.length) {
      console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

/**
 * GET /api/category/suggestions
 * Get AI category suggestions for products without assigning them
 *
 * Query params:
 * - product_ids: comma-separated list of supplier_product_ids
 * - supplier_id: filter by supplier
 * - uncategorized_only: only suggest for uncategorized products (default: true)
 * - limit: max number of products to process (default: 100)
 * - batch_size: suggested batch size (service will calculate optimal size based on provider limits)
 * - batch_delay: delay in ms between batches (default: 2000)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdsParam = searchParams.get('product_ids');
    const supplierId = searchParams.get('supplier_id');
    const uncategorizedOnly = searchParams.get('uncategorized_only') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const requestedBatchSize = searchParams.get('batch_size')
      ? parseInt(searchParams.get('batch_size')!, 10)
      : undefined;
    const batchDelay = parseInt(searchParams.get('batch_delay') || '0', 10);

    const orgId = resolveOrgId(null);

    let validProducts: Awaited<ReturnType<typeof enrichProductsForCategorization>> = [];

    if (productIdsParam) {
      const productIds = productIdsParam.split(',').map(id => id.trim());
      const enriched = await enrichProductsForCategorization(productIds);
      validProducts = uncategorizedOnly ? enriched.filter(p => !p.category_id) : enriched;
    } else {
      // This already returns enriched products (uncategorized set)
      const result = await getUncategorizedProducts({
        supplier_id: supplierId || undefined,
        limit,
      });
      validProducts = result.products;
    }

    if (validProducts.length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        total: 0,
      });
    }

    // New category AI module handles dynamic batch sizing, timeouts, and batching internally
    const batchResults = await suggestCategoriesBatch(validProducts, undefined, orgId, {
      batchSize: requestedBatchSize ?? undefined,
      batchDelayMs: batchDelay || undefined,
      timeoutMs: undefined,
    });

    // Convert results to response format
    const suggestions = validProducts.map(product => {
      const suggestion = batchResults.get(product.supplier_product_id);

      if (!suggestion) {
        return {
          supplier_product_id: product.supplier_product_id,
          supplier_sku: product.supplier_sku,
          product_name: product.name_from_supplier,
          suggestion: null,
        };
      }

      return {
        supplier_product_id: product.supplier_product_id,
        supplier_sku: product.supplier_sku,
        product_name: product.name_from_supplier,
        current_category_id: product.category_id,
        current_category_name: product.category_name,
        suggestion: {
          category_id: suggestion.categoryId,
          category_name: suggestion.categoryName,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning,
          alternatives: suggestion.alternatives,
          provider: suggestion.provider,
        },
      };
    });

    return NextResponse.json({
      success: true,
      suggestions,
      total: suggestions.length,
    });
  } catch (error) {
    console.error('Suggestions API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get suggestions',
        suggestions: [],
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/category/suggestions
 * Get suggestions for specific products (bulk)
 *
 * Body:
 * {
 *   "product_ids": ["uuid1", "uuid2", ...],
 *   "preview": true,  // if true, don't assign, just return suggestions
 *   "batch_size": 50,  // suggested batch size (service calculates optimal based on provider limits)
 *   "batch_delay": 2000  // delay in ms between batches (default: 2000)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const t0 = Date.now();
    const body = await request.json();
    const requestedBatchSize = body.batch_size
      ? typeof body.batch_size === 'number'
        ? body.batch_size
        : parseInt(String(body.batch_size), 10)
      : undefined;
    const { product_ids, preview = true, batch_delay = 0 } = body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'product_ids array is required',
        },
        { status: 400 }
      );
    }

    const orgId = resolveOrgId(null);

    // Enrich all products in a single query
    const bulkEnriched = await enrichProductsForCategorization(product_ids);
    const foundIds = new Set(bulkEnriched.map(p => p.supplier_product_id));
    const missingIds = product_ids.filter(id => !foundIds.has(id));
    const validProducts = bulkEnriched;

    if (validProducts.length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: product_ids.map((id: string) => ({
          supplier_product_id: id,
          error: 'Product not found',
        })),
        preview_mode: preview,
      });
    }

    // New category AI module handles dynamic batch sizing, timeouts, and batching internally
    const batchResults = await suggestCategoriesBatch(validProducts, undefined, orgId, {
      batchSize: requestedBatchSize ?? undefined,
      batchDelayMs: batch_delay || undefined,
      timeoutMs: undefined,
    });

    // Convert results to response format
    const suggestions = validProducts.map(product => {
      const suggestion = batchResults.get(product.supplier_product_id);

      return {
        supplier_product_id: product.supplier_product_id,
        supplier_sku: product.supplier_sku,
        product_name: product.name_from_supplier,
        current_category_id: product.category_id,
        current_category_name: product.category_name,
        suggestion: suggestion
          ? {
              category_id: suggestion.categoryId,
              category_name: suggestion.categoryName,
              confidence: suggestion.confidence,
              reasoning: suggestion.reasoning,
              alternatives: suggestion.alternatives,
              provider: suggestion.provider,
            }
          : null,
      };
    });

    // Add products that weren't found
    for (const id of missingIds) {
      suggestions.push({
        supplier_product_id: id,
        supplier_sku: '',
        product_name: '',
        current_category_id: null,
        current_category_name: null,
        suggestion: null,
      });
    }

    const duration = Date.now() - t0;
    console.log(
      `[category/suggestions] processed=${validProducts.length} missing=${missingIds.length} durationMs=${duration}`
    );

    return NextResponse.json({
      success: true,
      suggestions,
      preview_mode: preview,
    });
  } catch (error) {
    console.error('Suggestions POST API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get suggestions',
        suggestions: [],
      },
      { status: 500 }
    );
  }
}
