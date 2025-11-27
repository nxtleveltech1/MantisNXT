// @ts-nocheck

import type { EnrichedProduct } from '@/lib/cmm/sip-product-enrichment';
import type { ProviderConfig } from './resolver';
import { loadTagAIConfig } from './resolver';
import { processTagBatchesAcrossProviders, processEnrichmentBatches } from './batcher';
import type { TagSuggestion, ProductEnrichment } from './parser';

export type TagSuggestionResult = {
  supplier_product_id: string;
  suggested_tags: TagSuggestion[];
  confidence?: number;
};

export async function suggestTagsBatch(
  enrichedProducts: EnrichedProduct[],
  existingTags: Array<{ tag_id: string; name: string; type: string }> = [],
  orgId?: string | null,
  opts?: {
    batchSize?: number;
    batchDelayMs?: number;
    timeoutMs?: number;
    overallTimeoutMs?: number;
    maxBatches?: number;
    webResearchEnabled?: boolean;
    webResearchProvider?: string;
    webResearchApiKey?: string;
    webResearchEngineId?: string;
  }
): Promise<Map<string, TagSuggestion[]>> {
  console.log(
    `[suggestTagsBatch] ENTRY: ${enrichedProducts.length} products, orgId: ${orgId}`
  );

  let cfg;
  try {
    cfg = await loadTagAIConfig(orgId);
    console.log(`[suggestTagsBatch] Config loaded:`, cfg ? 'YES' : 'NULL');
  } catch (error) {
    console.error('[suggestTagsBatch] ERROR loading config:', error);
    return new Map();
  }

  if (!cfg) {
    console.warn('[suggestTagsBatch] No AI config found, returning empty suggestions');
    return new Map();
  }
  console.log(
    `[suggestTagsBatch] Found ${cfg.providers.length} providers for ${enrichedProducts.length} products`
  );

  const providers: ProviderConfig[] = cfg.providers;
  const effectiveTimeout = opts?.timeoutMs ?? cfg.defaults.timeoutMs;
  const effectiveBatchDelay = opts?.batchDelayMs ?? cfg.defaults.batchDelayMs;
  const effectiveBatchSize = opts?.batchSize ?? cfg.defaults.batchSize ?? 10;
  const effectiveOverallTimeout = opts?.overallTimeoutMs ?? cfg.defaults.overallTimeoutMs ?? 12000;
  const effectiveMaxBatches = opts?.maxBatches ?? cfg.defaults.maxBatches;
  const effectiveFailFast = cfg.defaults.failFastOnFirstTimeout ?? true;
  const webResearchEnabled = opts?.webResearchEnabled ?? cfg.defaults.webResearchEnabled ?? false;
  const webResearchProvider = opts?.webResearchProvider ?? cfg.defaults.webResearchProvider;
  const webResearchApiKey = opts?.webResearchApiKey ?? cfg.defaults.webResearchApiKey;
  const webResearchEngineId = opts?.webResearchEngineId ?? cfg.defaults.webResearchEngineId;

  const maxItems = cfg.defaults.maxItems;
  const inputProducts =
    typeof maxItems === 'number' && maxItems > 0
      ? enrichedProducts.slice(0, maxItems)
      : enrichedProducts;

  const result = await processTagBatchesAcrossProviders(providers, inputProducts, existingTags, {
    requestedBatchSize: effectiveBatchSize,
    batchDelayMs: effectiveBatchDelay,
    timeoutMs: effectiveTimeout,
    overallTimeoutMs: effectiveOverallTimeout,
    maxBatches: effectiveMaxBatches,
    failFastOnFirstTimeout: effectiveFailFast,
    webResearchEnabled,
    webResearchProvider,
    webResearchApiKey,
    webResearchEngineId,
  });

  console.log(
    `[suggestTagsBatch] Processed ${inputProducts.length} products -> ${result.size} suggestions`
  );
  return result;
}

export async function enrichProductsBatch(
  enrichedProducts: EnrichedProduct[],
  existingTags: Array<{ tag_id: string; name: string; type: string }> = [],
  orgId?: string | null,
  opts?: {
    batchSize?: number;
    batchDelayMs?: number;
    timeoutMs?: number;
    overallTimeoutMs?: number;
    webResearchEnabled?: boolean;
    webResearchProvider?: string;
    webResearchApiKey?: string;
    webResearchEngineId?: string;
  }
): Promise<Map<string, ProductEnrichment>> {
  console.log(
    `[enrichProductsBatch] ENTRY: ${enrichedProducts.length} products, orgId: ${orgId}`
  );

  let cfg;
  try {
    cfg = await loadTagAIConfig(orgId);
  } catch (error) {
    console.error('[enrichProductsBatch] ERROR loading config:', error);
    return new Map();
  }

  if (!cfg) {
    console.warn('[enrichProductsBatch] No AI config found');
    return new Map();
  }

  const providers: ProviderConfig[] = cfg.providers || [];
  
  // Check if we have any LLM providers (not just web search providers)
  if (providers.length === 0) {
    console.error('[enrichProductsBatch] No LLM providers available. Please configure at least one LLM provider (OpenAI, Anthropic, or Google) in AI Services.');
    throw new Error(
      'No LLM providers configured. Please add at least one LLM provider (OpenAI Codex CLI, Anthropic, or Google Gemini) in AI Services configuration. ' +
      'Note: Web search providers (Tavily, Serper, etc.) cannot be used as LLM providers.'
    );
  }
  
  const effectiveTimeout = opts?.timeoutMs ?? cfg.defaults.timeoutMs ?? 60000;
  const effectiveBatchDelay = opts?.batchDelayMs ?? cfg.defaults.batchDelayMs ?? 2000;
  const effectiveBatchSize = opts?.batchSize ?? 3; // Smaller for enrichment
  const effectiveOverallTimeout = opts?.overallTimeoutMs ?? 300000; // 5min default
  const webResearchEnabled = opts?.webResearchEnabled ?? cfg.defaults.webResearchEnabled ?? false;
  const webResearchProvider = opts?.webResearchProvider ?? cfg.defaults.webResearchProvider;
  const webResearchApiKey = opts?.webResearchApiKey ?? cfg.defaults.webResearchApiKey;
  const webResearchEngineId = opts?.webResearchEngineId ?? cfg.defaults.webResearchEngineId;

  const maxItems = cfg.defaults.maxItems;
  const inputProducts =
    typeof maxItems === 'number' && maxItems > 0
      ? enrichedProducts.slice(0, maxItems)
      : enrichedProducts;

  const result = await processEnrichmentBatches(providers, inputProducts, existingTags, {
    requestedBatchSize: effectiveBatchSize,
    batchDelayMs: effectiveBatchDelay,
    timeoutMs: effectiveTimeout,
    overallTimeoutMs: effectiveOverallTimeout,
    webResearchEnabled,
    webResearchProvider,
    webResearchApiKey,
    webResearchEngineId,
  });

  console.log(
    `[enrichProductsBatch] Processed ${inputProducts.length} products -> ${result.size} enrichments`
  );
  return result;
}

