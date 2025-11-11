import type { EnrichedProduct, CategoryHierarchy } from '@/lib/cmm/sip-product-enrichment';
import {
  getProviderTokenLimits,
  estimateCategoryListTokens,
  estimateProductTokens,
  calculateMaxProductsPerBatch,
} from '@/lib/ai/token-counter';
import type { ProviderConfig } from './resolver';
import { runProviderBatch } from './engine';
import type { z } from 'zod';
import type { BatchCategorySuggestionSchema } from './parser';
import type { CategorySuggestion } from './index';
import { mark } from './metrics';

export type BatcherOptions = {
  timeoutMs?: number;
  requestedBatchSize?: number;
  batchDelayMs?: number;
  // New caps to prevent long-running requests
  overallTimeoutMs?: number;
  maxBatches?: number;
  failFastOnFirstTimeout?: boolean;
};

const OUTPUT_SAFETY_MARGIN = 0.7;
const ESTIMATED_SUGGESTION_OUTPUT_TOKENS = 140;

export function computeOptimalBatchSize(
  products: EnrichedProduct[],
  categories: CategoryHierarchy[],
  provider: string,
  requestedBatchSize?: number
): number {
  const providerLimits = getProviderTokenLimits(provider);
  const categoryTokens = estimateCategoryListTokens(categories);

  const sampleSize = Math.min(products.length, 10);
  const sampleProducts = products.slice(0, sampleSize);
  const totalSampleTokens = sampleProducts.reduce((sum, p) => sum + estimateProductTokens(p), 0);
  const avgProductTokens = sampleSize > 0 ? totalSampleTokens / sampleSize : 200;

  const maxProductsContext = calculateMaxProductsPerBatch(
    providerLimits.contextWindow,
    categoryTokens,
    avgProductTokens,
    0.8
  );
  const maxByOutputTokens = Math.max(
    1,
    Math.floor(
      (providerLimits.outputLimit * OUTPUT_SAFETY_MARGIN) /
        Math.max(ESTIMATED_SUGGESTION_OUTPUT_TOKENS, 1)
    )
  );

  const contextConstrainedMax = Math.max(
    1,
    Math.min(providerLimits.recommendedBatchSize, maxProductsContext)
  );
  const safeMax = Math.max(1, Math.min(contextConstrainedMax, maxByOutputTokens));
  if (requestedBatchSize) return Math.max(1, Math.min(requestedBatchSize, safeMax));
  return safeMax;
}

export async function processBatchesAcrossProviders(
  providers: ProviderConfig[],
  products: EnrichedProduct[],
  categories: CategoryHierarchy[],
  options: BatcherOptions = {}
): Promise<
  Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      confidence: number;
      reasoning?: string;
      alternatives?: Array<{
        categoryId: string;
        categoryName: string;
        confidence: number;
        reasoning?: string;
      }>;
      provider?: string;
    }
  >
> {
  const results = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      confidence: number;
      reasoning?: string;
      alternatives?: Array<{
        categoryId: string;
        categoryName: string;
        confidence: number;
        reasoning?: string;
      }>;
      provider?: string;
    }
  >();
  console.log(`[batcher] Starting batch process: providers=${providers.length}, products=${products.length}`);
  if (products.length === 0) {
    console.log('[batcher] No products supplied; returning empty result');
    return results;
  }

  // Guard rails: overall timeout and batch caps
  const startTime = Date.now();
  const baseTimeout =
    typeof options.timeoutMs === 'number' && options.timeoutMs > 0 ? options.timeoutMs : 45000;
  const overallTimeoutMs =
    typeof options.overallTimeoutMs === 'number' && options.overallTimeoutMs > 0
      ? options.overallTimeoutMs
      : Math.max(baseTimeout * 2, 60000);
  const deadline = startTime + overallTimeoutMs;
  const maxBatches =
    typeof options.maxBatches === 'number' && options.maxBatches > 0 ? options.maxBatches : 50;
  const failFastOnFirstTimeout = options.failFastOnFirstTimeout === true;

  // Per-request provider cooldown: if a provider times out once, skip remaining batches
  const unavailableProviders = new Set<string>();
  const isAvailable = (p: ProviderConfig) => !unavailableProviders.has(p.provider);

  // Determine minimal batch size across providers
  const providerBatchSizes = new Map<string, number>();
  for (const p of providers) {
    console.log(`[batcher] Computing batch size for provider ${p.provider} (model=${p.model})`);
    const size = computeOptimalBatchSize(
      products,
      categories,
      p.provider,
      options.requestedBatchSize
    );
    providerBatchSizes.set(p.provider, size);
    console.log(`[batcher] Provider ${p.provider} optimal batch size=${size}`);
  }
  const minBatchSize = Math.min(...Array.from(providerBatchSizes.values()));
  const batchSize = options.requestedBatchSize
    ? Math.min(options.requestedBatchSize, minBatchSize)
    : minBatchSize;

  // Split products into batches
  let batches: EnrichedProduct[][] = [];
  for (let i = 0; i < products.length; i += batchSize) {
    batches.push(products.slice(i, i + batchSize));
  }

  // Cap total batches
  if (batches.length > maxBatches) {
    batches = batches.slice(0, maxBatches);
  }

  // Distribute batches across providers in parallel (round-robin)
  const activeProviders = providers.filter(isAvailable);
  if (activeProviders.length === 0) {
    console.warn('[batcher] No active providers after filtering; returning empty result');
    return results;
  }

  // Assign batches to providers round-robin
  const providerBatches = new Map<ProviderConfig, EnrichedProduct[][]>();
  activeProviders.forEach((p, idx) => {
    const assignedBatches: EnrichedProduct[][] = [];
    for (let i = idx; i < batches.length; i += activeProviders.length) {
      assignedBatches.push(batches[i]);
    }
    if (assignedBatches.length > 0) {
      providerBatches.set(p, assignedBatches);
    }
  });

  // Process all provider batches in parallel
  const batchPromises: Promise<void>[] = [];
  for (const [provider, assignedBatches] of providerBatches.entries()) {
    for (const batch of assignedBatches) {
      // Check deadline before starting - need at least 4s buffer for parallel processing
      const timeUntilDeadline = deadline - Date.now();
      if (timeUntilDeadline < 4000) {
        break; // Not enough time left to start new batches
      }

      const batchPromise = (async () => {
        // Check deadline at start of async function
        if (Date.now() >= deadline) {
          console.warn(`[batcher] Deadline reached before processing batch for provider ${provider.provider}`);
          return;
        }

        try {
          const remaining = Math.max(500, deadline - Date.now());
          if (remaining < 3000) {
            // Less than 3s left, skip this batch
            return;
          }
          const providerTimeout =
            typeof options.timeoutMs === 'number' && options.timeoutMs > 0
              ? Math.min(options.timeoutMs, remaining)
              : Math.min(remaining, 3000); // Cap at 3s per provider

          console.log(
            `[batcher] Provider ${provider.provider} processing batch size ${batch.length} with timeout ${providerTimeout}ms (deadline in ${remaining}ms)`
          );
          const providerResult = await runProviderBatch(provider, batch, categories, {
            timeoutMs: providerTimeout,
          });

          // Check deadline after call
          if (Date.now() >= deadline) {
            return;
          }

          const parsed: z.infer<typeof BatchCategorySuggestionSchema> | null = providerResult;
          if (!parsed?.suggestions || parsed.suggestions.length === 0) {
            console.warn(`[batcher] Provider ${provider.provider} returned no suggestions for batch`);
            return;
          }

          mark('batchesSucceeded');
          for (const suggestion of parsed.suggestions) {
            const productId = suggestion.product_id || suggestion.supplier_product_id;
            const categoryId = suggestion.suggested_category_id || suggestion.categoryId;
            const proposedName =
              suggestion.proposed_category_name ||
              suggestion.proposedCategoryName ||
              suggestion.reasoning?.match(/Category:\s*([^\n]+)/)?.[1] ||
              null;

            if (!productId) continue;

            const category = categoryId
              ? categories.find(c => c.category_id === categoryId)
              : undefined;

            if (!category && !proposedName) continue;

            const existing = results.get(productId);
            const alternatives =
              category && suggestion.alternatives
                ? suggestion.alternatives
                    .map(alt => {
                      const altId = alt.category_id || alt.categoryId;
                      const altCat = altId ? categories.find(c => c.category_id === altId) : null;
                      return altCat
                        ? {
                            categoryId: altCat.category_id,
                            categoryName: altCat.name,
                            confidence: alt.confidence || 0.5,
                            reasoning: alt.reasoning ?? null,
                          }
                        : null;
                    })
                    .filter((x): x is NonNullable<typeof x> => !!x)
                : undefined;
            const nextConfidence = suggestion.confidence ?? 0.5;
            const next: CategorySuggestion = {
              supplier_product_id: productId,
              category_id: category?.category_id ?? null,
              category_name: category?.name ?? null,
              categoryId: category?.category_id ?? null,
              categoryName: category?.name ?? null,
              confidence: nextConfidence,
              reasoning: suggestion.reasoning ?? null,
              alternatives,
              provider: provider.provider ?? null,
              proposed_category_name: category ? null : proposedName ?? null,
              proposedCategoryName: category ? null : proposedName ?? null,
            };
            if (!existing || (existing.confidence ?? 0) < nextConfidence) {
              results.set(productId, next);
            }
          }
        } catch (e: unknown) {
          const msg = String(e?.message || '');
          const timedOut = msg.startsWith('AI request timeout:');
          console.error(`[batcher] Provider ${provider.provider} batch failed:`, e);
          if (timedOut) {
            mark('providerTimeouts');
            unavailableProviders.add(provider.provider);
          }
          mark('batchesFailed');
        }
      })();

      batchPromises.push(batchPromise);
      mark('batchesStarted');
    }
  }

  // Wait for all batches - they'll respect deadline internally
  await Promise.allSettled(batchPromises);
  console.log(`[batcher] Completed processing: suggestions count=${results.size}`);
  return results;
}
