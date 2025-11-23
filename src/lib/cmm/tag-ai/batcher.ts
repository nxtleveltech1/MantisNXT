// @ts-nocheck

import type { EnrichedProduct } from '@/lib/cmm/sip-product-enrichment';
import {
  getProviderTokenLimits,
  estimateProductTokens,
  calculateMaxProductsPerBatch,
} from '@/lib/ai/token-counter';
import type { ProviderConfig } from './resolver';
import { suggestTagsBatch, enrichProductWithAI } from './engine';
import type { BatchTagSuggestionSchema, ProductEnrichmentSchema } from './parser';
import type { TagSuggestion, ProductEnrichment } from './parser';
import { mark } from './metrics';

export type BatcherOptions = {
  timeoutMs?: number;
  requestedBatchSize?: number;
  batchDelayMs?: number;
  overallTimeoutMs?: number;
  maxBatches?: number;
  failFastOnFirstTimeout?: boolean;
  webResearchEnabled?: boolean;
  webResearchProvider?: string;
  webResearchApiKey?: string;
  webResearchEngineId?: string;
};

const OUTPUT_SAFETY_MARGIN = 0.7;
const ESTIMATED_TAG_SUGGESTION_OUTPUT_TOKENS = 400; // Increased from 200 to account for larger responses
const ESTIMATED_ENRICHMENT_OUTPUT_TOKENS = 500;

export function computeOptimalBatchSize(
  products: EnrichedProduct[],
  provider: string,
  requestedBatchSize?: number,
  isEnrichment = false
): number {
  const providerLimits = getProviderTokenLimits(provider);
  
  const sampleSize = Math.min(products.length, 10);
  const sampleProducts = products.slice(0, sampleSize);
  const totalSampleTokens = sampleProducts.reduce((sum, p) => sum + estimateProductTokens(p), 0);
  const avgProductTokens = sampleSize > 0 ? totalSampleTokens / sampleSize : 300;

  // For enrichment, we need more tokens due to web research context and longer output
  const contextMultiplier = isEnrichment ? 1.5 : 1.0;
  const outputTokens = isEnrichment ? ESTIMATED_ENRICHMENT_OUTPUT_TOKENS : ESTIMATED_TAG_SUGGESTION_OUTPUT_TOKENS;

  const maxProductsContext = calculateMaxProductsPerBatch(
    providerLimits.contextWindow,
    0, // No category list for tags
    avgProductTokens * contextMultiplier,
    0.8
  );
  const maxByOutputTokens = Math.max(
    1,
    Math.floor(
      (providerLimits.outputLimit * OUTPUT_SAFETY_MARGIN) / Math.max(outputTokens, 1)
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

export async function processTagBatchesAcrossProviders(
  providers: ProviderConfig[],
  products: EnrichedProduct[],
  existingTags: Array<{ tag_id: string; name: string; type: string }> = [],
  options: BatcherOptions = {}
): Promise<Map<string, TagSuggestion[]>> {
  const results = new Map<string, TagSuggestion[]>();
  console.log(`[batcher] Starting tag batch process: providers=${providers.length}, products=${products.length}`);
  
  if (products.length === 0) {
    return results;
  }

  const startTime = Date.now();
  const baseTimeout = options.timeoutMs ?? 45000;
  const overallTimeoutMs = options.overallTimeoutMs ?? Math.max(baseTimeout * 2, 60000);
  const deadline = startTime + overallTimeoutMs;
  const maxBatches = options.maxBatches ?? 50;
  const failFastOnFirstTimeout = options.failFastOnFirstTimeout === true;

  const unavailableProviders = new Set<string>();
  const isAvailable = (p: ProviderConfig) => !unavailableProviders.has(p.provider);

  // Determine batch sizes - cap at 5 products per batch to avoid truncation
  const providerBatchSizes = new Map<string, number>();
  for (const p of providers) {
    const size = computeOptimalBatchSize(products, p.provider, options.requestedBatchSize, false);
    // Cap at 5 to prevent token limit issues
    providerBatchSizes.set(p.provider, Math.min(size, 5));
  }
  const minBatchSize = Math.min(...Array.from(providerBatchSizes.values()));
  const batchSize = options.requestedBatchSize
    ? Math.min(options.requestedBatchSize, minBatchSize, 5) // Hard cap at 5
    : Math.min(minBatchSize, 5); // Hard cap at 5

  // Split into batches
  let batches: EnrichedProduct[][] = [];
  for (let i = 0; i < products.length; i += batchSize) {
    batches.push(products.slice(i, i + batchSize));
  }
  if (batches.length > maxBatches) {
    batches = batches.slice(0, maxBatches);
  }

  // Distribute across providers
  const activeProviders = providers.filter(isAvailable);
  if (activeProviders.length === 0) {
    return results;
  }

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

  // Process batches in parallel
  const batchPromises: Promise<void>[] = [];
  for (const [provider, assignedBatches] of providerBatches.entries()) {
    for (const batch of assignedBatches) {
      const timeUntilDeadline = deadline - Date.now();
      if (timeUntilDeadline < 4000) break;

      const batchPromise = (async () => {
        if (Date.now() >= deadline) return;

        try {
          const remaining = Math.max(500, deadline - Date.now());
          if (remaining < 3000) return;
          const providerTimeout = Math.min(options.timeoutMs ?? baseTimeout, remaining);

          let providerResult = await suggestTagsBatch(provider, batch, existingTags, {
            timeoutMs: providerTimeout,
            webResearchEnabled: options.webResearchEnabled,
            webResearchProvider: options.webResearchProvider,
            webResearchApiKey: options.webResearchApiKey,
            webResearchEngineId: options.webResearchEngineId,
          });

          // If result is null and batch size > 1, try splitting the batch
          if (!providerResult && batch.length > 1) {
            console.warn(
              `[batcher] Batch failed, splitting into smaller batches. Original size: ${batch.length}`
            );
            const midPoint = Math.ceil(batch.length / 2);
            const batch1 = batch.slice(0, midPoint);
            const batch2 = batch.slice(midPoint);
            
            // Retry with smaller batches
            try {
              const result1 = await suggestTagsBatch(provider, batch1, existingTags, {
                timeoutMs: providerTimeout,
                webResearchEnabled: options.webResearchEnabled,
                webResearchProvider: options.webResearchProvider,
                webResearchApiKey: options.webResearchApiKey,
                webResearchEngineId: options.webResearchEngineId,
              });
              if (result1) providerResult = result1;
            } catch (e1) {
              console.error(`[batcher] Split batch 1 failed:`, e1);
            }
            
            try {
              const result2 = await suggestTagsBatch(provider, batch2, existingTags, {
                timeoutMs: providerTimeout,
                webResearchEnabled: options.webResearchEnabled,
                webResearchProvider: options.webResearchProvider,
                webResearchApiKey: options.webResearchApiKey,
                webResearchEngineId: options.webResearchEngineId,
              });
              // Merge results if both succeeded
              if (result2 && providerResult) {
                providerResult.suggestions = [
                  ...(providerResult.suggestions || []),
                  ...(result2.suggestions || []),
                ];
              } else if (result2) {
                providerResult = result2;
              }
            } catch (e2) {
              console.error(`[batcher] Split batch 2 failed:`, e2);
            }
          }

          if (Date.now() >= deadline) return;

          if (!providerResult?.suggestions || providerResult.suggestions.length === 0) {
            return;
          }

          mark('batchesSucceeded');
          for (const suggestion of providerResult.suggestions) {
            const productId = suggestion.supplier_product_id;
            if (!productId || !suggestion.suggested_tags) continue;

            const existing = results.get(productId) || [];
            const newTags = suggestion.suggested_tags.filter(
              tag => !existing.some(t => t.tag_id === tag.tag_id)
            );
            results.set(productId, [...existing, ...newTags]);
          }
        } catch (e: unknown) {
          const msg = String(e?.message || '');
          const timedOut = msg.startsWith('AI request timeout:');
          const isTruncation = msg.includes('truncated') || msg.includes('length');
          console.error(`[batcher] Provider ${provider.provider} batch failed:`, e);
          
          if (timedOut) {
            mark('providerTimeouts');
            if (failFastOnFirstTimeout) {
              unavailableProviders.add(provider.provider);
            }
          } else if (isTruncation && batch.length > 1) {
            // Retry with smaller batch on truncation
            console.warn(
              `[batcher] Truncation detected, will retry with smaller batch size. Current: ${batch.length}`
            );
            mark('truncationRetries');
          }
          
          mark('batchesFailed');
        }
      })();

      batchPromises.push(batchPromise);
      mark('batchesStarted');
    }
  }

  await Promise.allSettled(batchPromises);
  console.log(`[batcher] Completed tag processing: suggestions count=${results.size}`);
  return results;
}

/**
 * Process product enrichment in batches
 */
export async function processEnrichmentBatches(
  providers: ProviderConfig[],
  products: EnrichedProduct[],
  existingTags: Array<{ tag_id: string; name: string; type: string }> = [],
  options: BatcherOptions = {}
): Promise<Map<string, ProductEnrichment>> {
  const results = new Map<string, ProductEnrichment>();
  console.log(`[batcher] Starting enrichment batch process: providers=${providers.length}, products=${products.length}`);

  if (products.length === 0) {
    return results;
  }

  // For enrichment, process products individually or in very small batches due to web research overhead
  const batchSize = Math.min(options.requestedBatchSize ?? 3, 5); // Smaller batches for enrichment
  const batches: EnrichedProduct[][] = [];
  for (let i = 0; i < products.length; i += batchSize) {
    batches.push(products.slice(i, i + batchSize));
  }

  const startTime = Date.now();
  const baseTimeout = options.timeoutMs ?? 60000; // Longer timeout for enrichment
  const overallTimeoutMs = options.overallTimeoutMs ?? Math.max(baseTimeout * batches.length, 300000); // 5min max
  const deadline = startTime + overallTimeoutMs;

  // Process batches sequentially with delay (enrichment is more resource-intensive)
  for (let i = 0; i < batches.length; i++) {
    if (Date.now() >= deadline) {
      console.warn('[batcher] Enrichment deadline reached');
      break;
    }

    const batch = batches[i];
    const provider = providers[i % providers.length]; // Round-robin providers

    try {
      // Process each product in batch individually (enrichment is complex)
      for (const product of batch) {
        if (Date.now() >= deadline) break;

        const remaining = Math.max(500, deadline - Date.now());
        const providerTimeout = Math.min(baseTimeout, remaining);

        const enrichment = await enrichProductWithAI(provider, product, existingTags, {
          timeoutMs: providerTimeout,
          webResearchEnabled: options.webResearchEnabled,
          webResearchProvider: options.webResearchProvider,
          webResearchApiKey: options.webResearchApiKey,
          webResearchEngineId: options.webResearchEngineId,
        });

        if (enrichment) {
          results.set(product.supplier_product_id, enrichment);
          mark('enrichmentOperations');
        }
      }

      // Delay between batches
      if (i < batches.length - 1 && options.batchDelayMs) {
        await new Promise(resolve => setTimeout(resolve, options.batchDelayMs));
      }
    } catch (e: unknown) {
      console.error(`[batcher] Enrichment batch ${i} failed:`, e);
      mark('batchesFailed');
    }
  }

  console.log(`[batcher] Completed enrichment processing: results count=${results.size}`);
  return results;
}

