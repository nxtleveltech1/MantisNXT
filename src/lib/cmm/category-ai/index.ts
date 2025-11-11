import type { EnrichedProduct, CategoryHierarchy } from '@/lib/cmm/sip-product-enrichment';
import { getCategoryHierarchy } from '@/lib/cmm/sip-product-enrichment';
import type { ProviderConfig } from './resolver';
import { loadCategoryAIConfig } from './resolver';
import { processBatchesAcrossProviders } from './batcher';
import { runProviderSingle } from './engine';

export type CategorySuggestion = {
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  reasoning: string | null;
  alternatives?: Array<{
    categoryId: string;
    categoryName: string;
    confidence: number;
    reasoning: string | null;
  }>;
  provider: string | null;
  proposedCategoryName: string | null;
};

export async function suggestCategoriesBatch(
  enrichedProducts: EnrichedProduct[],
  categories: CategoryHierarchy[] | undefined,
  orgId?: string | null,
  opts?: {
    batchSize?: number;
    batchDelayMs?: number;
    timeoutMs?: number;
    overallTimeoutMs?: number;
    maxBatches?: number;
  }
): Promise<Map<string, CategorySuggestion>> {
  console.log(
    `[suggestCategoriesBatch] ENTRY: ${enrichedProducts.length} products, orgId: ${orgId}`
  );

  let cfg;
  try {
    cfg = await loadCategoryAIConfig(orgId);
    console.log(`[suggestCategoriesBatch] Config loaded:`, cfg ? 'YES' : 'NULL');
  } catch (error) {
    console.error('[suggestCategoriesBatch] ERROR loading config:', error);
    return new Map();
  }

  if (!cfg) {
    console.warn('[suggestCategoriesBatch] No AI config found, returning empty suggestions');
    return new Map();
  }
  console.log(
    `[suggestCategoriesBatch] Found ${cfg.providers.length} providers for ${enrichedProducts.length} products`
  );

  const cats = categories && categories.length > 0 ? categories : await getCategoryHierarchy();
  const providers: ProviderConfig[] = cfg.providers;

  // Apply platform defaults; request opts win over platform defaults
  const effectiveTimeout = opts?.timeoutMs ?? cfg.defaults.timeoutMs;
  const effectiveBatchDelay = opts?.batchDelayMs ?? cfg.defaults.batchDelayMs;
  const effectiveBatchSize = opts?.batchSize ?? cfg.defaults.batchSize ?? 10; // larger batches = fewer API calls = faster
  const effectiveOverallTimeout =
    (opts as any)?.overallTimeoutMs ?? cfg.defaults.overallTimeoutMs ?? 12000; // 12s default for parallel processing
  const effectiveMaxBatches = (opts as any)?.maxBatches ?? undefined;
  const effectiveFailFast = (opts as any)?.failFastOnFirstTimeout ?? true;

  // Apply platform-level max item cap if configured
  const maxItems = cfg.defaults.maxItems;
  const inputProducts =
    typeof maxItems === 'number' && maxItems > 0
      ? enrichedProducts.slice(0, maxItems)
      : enrichedProducts;

  // Let batcher handle its own timeout - it has deadline checks built in
  const result = await processBatchesAcrossProviders(providers, inputProducts, cats, {
    requestedBatchSize: effectiveBatchSize,
    batchDelayMs: effectiveBatchDelay,
    timeoutMs: effectiveTimeout,
    overallTimeoutMs: opts?.overallTimeoutMs ?? effectiveOverallTimeout,
    maxBatches: opts?.maxBatches ?? effectiveMaxBatches,
    failFastOnFirstTimeout: effectiveFailFast,
  });
  console.log(
    `[suggestCategoriesBatch] Processed ${inputProducts.length} products -> ${result.size} suggestions`
  );
  return result;
}

export async function suggestCategorySingle(
  enrichedProduct: EnrichedProduct,
  categories: CategoryHierarchy[] | undefined,
  orgId?: string | null,
  opts?: { timeoutMs?: number }
): Promise<CategorySuggestion | null> {
  const cfg = await loadCategoryAIConfig(orgId);
  if (!cfg) return null;
  const cats = categories && categories.length > 0 ? categories : await getCategoryHierarchy();

  // Try every provider in parallel; pick the highest confidence
  const results = await Promise.all(
    cfg.providers.map(async p => {
      try {
        const res = await runProviderSingle(p, enrichedProduct, cats, {
          timeoutMs: opts?.timeoutMs,
        });
        return { provider: p.provider, res };
      } catch {
        return { provider: p.provider, res: null };
      }
    })
  );

  const valid = results
    .map(r => {
      const s = r.res;
      if (!s) return null;
      const categoryId = s.suggested_category_id || s.categoryId;
      if (!categoryId) return null;
      const cat = cats.find(c => c.category_id === categoryId);
      if (!cat) return null;
      return {
        categoryId: cat.category_id,
        categoryName: cat.name,
        confidence: s.confidence || 0.5,
        reasoning: s.reasoning ?? null,
        alternatives: s.alternatives
          ? s.alternatives
              .map(a => {
                const aid = a.category_id || a.categoryId;
                const ac = aid ? cats.find(c => c.category_id === aid) : null;
                return ac
                  ? {
                      categoryId: ac.category_id,
                      categoryName: ac.name,
                      confidence: a.confidence || 0.5,
                      reasoning: a.reasoning ?? null,
                    }
                  : null;
              })
              .filter((x): x is NonNullable<typeof x> => !!x)
          : undefined,
        provider: r.provider ?? null,
        proposedCategoryName: s.proposed_category_name ?? s.proposedCategoryName ?? null,
      } as CategorySuggestion;
    })
    .filter((x): x is CategorySuggestion => !!x);

  if (valid.length === 0) return null;
  return valid.sort((a, b) => b.confidence - a.confidence)[0];
}
