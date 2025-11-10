/**
 * AI Categorization Service
 * Uses the "Product Categories" AI service configuration to categorize products
 */

import { query } from '@/lib/database';
import { resolveOrgId } from '@/lib/ai/model-utils';
import type { Product, Category } from '@/lib/cmm/types';
import type { EnrichedProduct, CategoryHierarchy } from './sip-product-enrichment';
import { extractSpecifications, getCategoryHierarchy } from './sip-product-enrichment';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';
import {
  estimateBatchPromptTokens,
  estimateProductTokens,
  estimateCategoryListTokens,
  calculateMaxProductsPerBatch,
  getProviderTokenLimits,
} from '@/lib/ai/token-counter';
import { getRateLimiter } from '@/lib/utils/rate-limiter';

// Local warning de-duplication to avoid noisy logs during large batch runs
const emittedWarnings = new Set<string>();
function warnOnce(key: string, message: string) {
  // Only emit when explicitly enabled
  const warnEnabled = process.env.AI_CATEGORIZATION_WARN_ON_FALLBACK === 'true';
  if (!warnEnabled) return;
  if (emittedWarnings.has(key)) return;
  emittedWarnings.add(key);
  console.warn(message);
}

// Timeout helpers to prevent hangs on slow model responses
const DEFAULT_AI_TIMEOUT_MS = Number(process.env.AI_CATEGORIZATION_TIMEOUT_MS || 45000);
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`AI request timeout: ${label} after ${ms}ms`)),
      ms
    );
    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Schema for batch category suggestion response - handles multiple products
const BatchCategorySuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      product_id: z.string().uuid().optional(),
      supplier_product_id: z.string().optional(),
      supplier_sku: z.string().optional(),
      suggested_category_id: z.preprocess(
        val => (val === null ? undefined : val),
        z.string().uuid().optional()
      ),
      categoryId: z.preprocess(
        val => (val === null ? undefined : val),
        z.string().uuid().optional()
      ),
      confidence: z.preprocess(
        val => (val === null ? undefined : val),
        z.number().min(0).max(1).optional()
      ),
      reasoning: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
      alternatives: z.preprocess(
        val => (val === null ? undefined : val),
        z
          .array(
            z.object({
              category_id: z.preprocess(
                val => (val === null ? undefined : val),
                z.string().uuid().optional()
              ),
              categoryId: z.preprocess(
                val => (val === null ? undefined : val),
                z.string().uuid().optional()
              ),
              confidence: z.preprocess(
                val => (val === null ? undefined : val),
                z.number().min(0).max(1).optional()
              ),
              reasoning: z.preprocess(
                val => (val === null ? undefined : val),
                z.string().optional()
              ),
            })
          )
          .optional()
      ),
    })
  ),
});

// Schema for category suggestion response - handle null values from AI
const CategorySuggestionSchema = z.object({
  suggested_category_id: z.preprocess(
    val => (val === null ? undefined : val),
    z.string().uuid().optional()
  ),
  categoryId: z.preprocess(val => (val === null ? undefined : val), z.string().uuid().optional()),
  confidence: z.preprocess(
    val => (val === null ? undefined : val),
    z.number().min(0).max(1).optional()
  ),
  reasoning: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  alternatives: z.preprocess(
    val => (val === null ? undefined : val),
    z
      .array(
        z.object({
          category_id: z.preprocess(
            val => (val === null ? undefined : val),
            z.string().uuid().optional()
          ),
          categoryId: z.preprocess(
            val => (val === null ? undefined : val),
            z.string().uuid().optional()
          ),
          confidence: z.preprocess(
            val => (val === null ? undefined : val),
            z.number().min(0).max(1).optional()
          ),
          reasoning: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
        })
      )
      .optional()
  ),
});

export interface CategorySuggestion {
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

interface AIServiceConfig {
  id: string;
  org_id: string;
  service_id: string;
  config: Record<string, any>;
  enabled: boolean;
}

// Category list cache (refresh on config change)
let cachedCategoryHierarchy: CategoryHierarchy[] | null = null;
let categoryCacheTimestamp: number = 0;
const CATEGORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get category hierarchy with caching
 */
async function getCachedCategoryHierarchy(): Promise<CategoryHierarchy[]> {
  const now = Date.now();
  if (cachedCategoryHierarchy && now - categoryCacheTimestamp < CATEGORY_CACHE_TTL) {
    return cachedCategoryHierarchy;
  }

  cachedCategoryHierarchy = await getCategoryHierarchy();
  categoryCacheTimestamp = now;
  return cachedCategoryHierarchy;
}

/**
 * Clear category cache (call when categories change)
 */
export function clearCategoryCache(): void {
  cachedCategoryHierarchy = null;
  categoryCacheTimestamp = 0;
}

/**
 * Get the "Product Categories" AI service configuration
 */
async function getProductCategoriesService(orgId?: string | null): Promise<AIServiceConfig | null> {
  const resolvedOrg = resolveOrgId(orgId);

  // First, find the service by label
  const serviceResult = await query<{ id: string; service_key: string }>(
    `
    SELECT id, service_key FROM ai_service 
    WHERE org_id = $1 AND service_label = $2 
    LIMIT 1
  `,
    [resolvedOrg, 'Product Categories']
  );

  if (serviceResult.rows.length === 0) {
    console.warn('Product Categories AI service not found');
    return null;
  }

  const serviceId = serviceResult.rows[0].id;

  // Get the config for this service
  const configResult = await query<AIServiceConfig>(
    `
    SELECT id, org_id, service_id, config, is_enabled as enabled
    FROM ai_service_config 
    WHERE org_id = $1 AND service_id = $2 
    LIMIT 1
  `,
    [resolvedOrg, serviceId]
  );

  if (configResult.rows.length === 0) {
    console.warn('Product Categories AI service config not found');
    return null;
  }

  return configResult.rows[0];
}

/**
 * Extract enabled AI providers from config
 */
function extractProviders(config: Record<string, any>): Array<{
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
}> {
  const providers: Array<{
    provider: string;
    apiKey: string;
    baseUrl?: string;
    model?: string;
    enabled: boolean;
  }> = [];

  // Check providers object
  if (config.providers) {
    for (const [providerKey, providerConfig] of Object.entries(config.providers)) {
      const prov = providerConfig as any;
      if (prov?.enabled && prov?.apiKey) {
        providers.push({
          provider: providerKey,
          apiKey: prov.apiKey,
          baseUrl: prov.baseUrl,
          model: prov.model || config.model ? String(prov.model || config.model).trim() : undefined,
          enabled: true,
        });
      }
    }
  }

  // Also check providerInstances array (newer format)
  if (Array.isArray(config.providerInstances)) {
    for (const instance of config.providerInstances) {
      if (instance?.enabled && instance?.apiKey) {
        providers.push({
          provider: instance.providerType || instance.provider || 'openai',
          apiKey: instance.apiKey,
          baseUrl: instance.baseUrl,
          model:
            instance.model || config.model
              ? String(instance.model || config.model).trim()
              : undefined,
          enabled: true,
        });
      }
    }
  }

  // Fallback to single provider config
  if (providers.length === 0 && config.apiKey) {
    const provider = config.activeProvider || config.provider || 'openai';
    providers.push({
      provider,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model ? String(config.model).trim() : undefined,
      enabled: true,
    });
  }

  return providers;
}

const ESTIMATED_SUGGESTION_OUTPUT_TOKENS = 140; // reasoning + JSON structure per product
const OUTPUT_SAFETY_MARGIN = 0.7; // leave headroom to prevent truncated responses

/**
 * Calculate optimal batch size for a provider based on prompt + response token limits
 */
function calculateOptimalBatchSize(
  products: EnrichedProduct[],
  categories: CategoryHierarchy[],
  provider: string,
  requestedBatchSize?: number
): number {
  const providerLimits = getProviderTokenLimits(provider);
  const categoryTokens = estimateCategoryListTokens(categories);

  // Calculate average product tokens
  const sampleSize = Math.min(products.length, 10);
  const sampleProducts = products.slice(0, sampleSize);
  const totalSampleTokens = sampleProducts.reduce((sum, p) => sum + estimateProductTokens(p), 0);
  const avgProductTokens = sampleSize > 0 ? totalSampleTokens / sampleSize : 200;

  // Calculate max products that fit
  const maxProducts = calculateMaxProductsPerBatch(
    providerLimits.contextWindow,
    categoryTokens,
    avgProductTokens,
    0.8 // 80% safety margin
  );

  // Output tokens add another hard cap: each suggestion contains structured JSON + reasoning
  const maxByOutputTokens = Math.max(
    1,
    Math.floor(
      (providerLimits.outputLimit * OUTPUT_SAFETY_MARGIN) /
        Math.max(ESTIMATED_SUGGESTION_OUTPUT_TOKENS, 1)
    )
  );

  // Respect provider recommended caps as an additional guardrail
  const contextConstrainedMax = Math.max(
    1,
    Math.min(providerLimits.recommendedBatchSize, maxProducts)
  );

  const safeMax = Math.max(1, Math.min(contextConstrainedMax, maxByOutputTokens));

  // Use requested batch size if provided and within limits
  if (requestedBatchSize) {
    return Math.max(1, Math.min(requestedBatchSize, safeMax));
  }

  // Use provider's recommended batch size, but cap at calculated max
  return safeMax;
}

/**
 * Attempt to parse model output as JSON, repairing minor formatting issues when needed
 */
function parseStructuredJsonResponse<T>(rawText: string, schema: z.ZodSchema<T>): T | null {
  if (!rawText) {
    return null;
  }

  const candidates = new Set<string>();
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (jsonMatch?.[0]) {
    candidates.add(jsonMatch[0]);
  }
  const trimmed = rawText.trim();
  if (trimmed.length > 0) {
    candidates.add(trimmed);
  }

  for (const candidate of candidates) {
    const parsed = tryParseCandidate(candidate, schema);
    if (parsed) {
      return parsed;
    }

    const repaired = repairCandidate(candidate);
    if (repaired) {
      const repairedResult = tryParseCandidate(repaired, schema);
      if (repairedResult) {
        return repairedResult;
      }
    }
  }

  return null;
}

function tryParseCandidate<T>(candidate: string, schema: z.ZodSchema<T>): T | null {
  try {
    const parsed = JSON.parse(candidate);
    const validation = schema.safeParse(parsed);
    return validation.success ? validation.data : null;
  } catch {
    return null;
  }
}

function repairCandidate(candidate: string): string | null {
  try {
    return jsonrepair(candidate);
  } catch {
    return null;
  }
}

/**
 * Generate category suggestions for multiple products in a single API call
 */
async function suggestCategoriesBatchWithAI(
  enrichedProducts: EnrichedProduct[],
  categories: CategoryHierarchy[],
  providerConfig: {
    provider: string;
    apiKey: string;
    baseUrl?: string;
    model?: string;
  },
  options?: {
    batchSize?: number;
    rateLimiter?: ReturnType<typeof getRateLimiter>;
  }
): Promise<Map<string, CategorySuggestion>> {
  const results = new Map<string, CategorySuggestion>();

  if (enrichedProducts.length === 0) {
    return results;
  }

  try {
    // Trim model name to prevent "model not found" errors from whitespace
    const modelName = providerConfig.model ? String(providerConfig.model).trim() : undefined;

    // Apply rate limiting if provided
    if (options?.rateLimiter) {
      await options.rateLimiter.consume(1);
    }

    // Build product contexts for all products
    const productContexts = enrichedProducts.map((product, index) => {
      const specifications = extractSpecifications(product.attrs_json);

      return {
        index,
        productId: product.supplier_product_id,
        sku: product.supplier_sku,
        context: `
Product ${index + 1}:
- Product ID: ${product.supplier_product_id}
- SKU: ${product.supplier_sku}
- Name: ${product.name_from_supplier}
- Brand: ${product.brand || 'Not specified'}
- Supplier: ${product.supplier_name}${product.supplier_code ? ` (${product.supplier_code})` : ''}
- Supplier's Suggested Category: ${product.category_raw || 'None'}
- Current Category: ${product.category_name || 'Uncategorized'}
- Unit of Measure: ${product.uom}
${product.pack_size ? `- Pack Size: ${product.pack_size}` : ''}
${product.barcode ? `- Barcode: ${product.barcode}` : ''}
${product.current_price ? `- Price: ${product.currency || ''} ${product.current_price}` : ''}
${product.qty_on_hand !== null ? `- Stock on Hand: ${product.qty_on_hand}` : ''}
${specifications.length > 0 ? `- Specifications:\n${specifications.map(s => `  • ${s}`).join('\n')}` : ''}
${product.attrs_json ? `- Additional Attributes: ${JSON.stringify(product.attrs_json, null, 2)}` : ''}
`,
      };
    });

    // Build comprehensive prompt for batch processing
    const productsText = productContexts.map(pc => pc.context).join('\n\n');

    const prompt = `You are categorizing ${enrichedProducts.length} products for an inventory management system. Analyze each product and suggest the most appropriate category from the available categories list.

${productsText}

Available Categories (hierarchical):
${categories.map(c => `- ${c.category_id}: ${c.name} (Path: ${c.path}, Level: ${c.level}${c.parent_id ? `, Parent: ${c.parent_id}` : ''})`).join('\n')}

Task: For EACH product, suggest the most appropriate category. Consider:
1. Product description and name
2. Brand positioning and typical product lines
3. Supplier's suggested category (if provided)
4. Existing category structure and hierarchy
5. Product specifications and attributes
6. Similar products that might be in the same category

Important:
- Return suggestions for ALL ${enrichedProducts.length} products
- For each product, return the exact category_id (UUID) from the available categories
- Provide a confidence score between 0 and 1 (where 1.0 is completely certain)
- Include a brief reasoning explanation
- If multiple categories could fit, list up to 3 alternatives with their confidence scores

Return ONLY valid JSON matching this exact schema:
{
  "suggestions": [
    {
      "product_id": "${enrichedProducts[0].supplier_product_id}",
      "supplier_product_id": "${enrichedProducts[0].supplier_product_id}",
      "supplier_sku": "${enrichedProducts[0].supplier_sku}",
      "suggested_category_id": "uuid-here",
      "confidence": 0.95,
      "reasoning": "Brief explanation",
      "alternatives": [{"category_id": "uuid", "confidence": 0.85, "reasoning": "text"}]
    },
    ... (repeat for all ${enrichedProducts.length} products)
  ]
}`;

    // Use AI SDK directly with proper schema for batch categorization
    let batchResult: z.infer<typeof BatchCategorySuggestionSchema> | null = null;

    if (providerConfig.provider === 'anthropic') {
      const anthropic = createAnthropic({
        apiKey: providerConfig.apiKey,
        ...(providerConfig.baseUrl ? { baseURL: providerConfig.baseUrl } : {}),
      });

      const model = anthropic(modelName || 'claude-3-5-sonnet-20241022');

      try {
        const generateOptions: any = {
          model,
          schema: BatchCategorySuggestionSchema,
          prompt,
        };
        if (!isReasoningModel(modelName)) {
          generateOptions.temperature = 0.1;
        }

        const aiResult = await generateObject(generateOptions);
        batchResult = aiResult.object;
      } catch (error: any) {
        // Handle "No object generated" error - fallback to generateText with JSON mode
        if (
          error?.message?.includes('No object generated') ||
          error?.message?.includes('did not return a response')
        ) {
          warnOnce(
            'batch-fallback',
            `⚠️ Model did not return structured output for batch, using JSON mode fallback`
          );
          try {
            const jsonPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON matching this exact schema:
{
  "suggestions": [
    {
      "product_id": "uuid",
      "supplier_product_id": "uuid",
      "supplier_sku": "string",
      "suggested_category_id": "uuid",
      "confidence": 0.95,
      "reasoning": "Brief explanation",
      "alternatives": [{"category_id": "uuid", "confidence": 0.85, "reasoning": "text"}]
    }
  ]
}

Return ONLY the JSON object, no other text.`;

            const textOptions: any = {
              model,
              prompt: jsonPrompt,
            };
            if (!isReasoningModel(modelName)) {
              textOptions.temperature = 0.1;
            }

            const textResult = await generateText(textOptions);
            const parsed = parseStructuredJsonResponse(
              textResult.text,
              BatchCategorySuggestionSchema
            );
            if (parsed) {
              batchResult = parsed;
            } else {
              console.error('Unable to parse structured batch response from JSON mode fallback');
              return results;
            }
          } catch (fallbackError) {
            console.error(`JSON mode fallback also failed for batch:`, fallbackError);
            return results;
          }
        } else if (error?.statusCode === 429 || error?.message?.includes('Rate limit')) {
          throw error;
        } else {
          console.error(`Anthropic batch categorization error:`, error);
          return results;
        }
      }
    } else if (
      providerConfig.provider === 'openai' ||
      providerConfig.provider === 'openai_compatible'
    ) {
      const openai = createOpenAI({
        apiKey: providerConfig.apiKey,
        ...(providerConfig.baseUrl ? { baseURL: providerConfig.baseUrl } : {}),
      });

      const compatibleModel = getCompatibleModel(modelName);
      const model = openai(compatibleModel);

      try {
        if (supportsJsonSchema(compatibleModel)) {
          const generateOptions: any = {
            model,
            schema: BatchCategorySuggestionSchema,
            prompt,
            // Cap tokens defensively to avoid long generations
            maxTokens: 1500,
          };
          if (!isReasoningModel(compatibleModel)) {
            generateOptions.temperature = 0.1;
          }
          const aiResult = await withTimeout(
            generateObject(generateOptions),
            DEFAULT_AI_TIMEOUT_MS,
            `openai batch generateObject (${compatibleModel})`
          );
          batchResult = aiResult.object;
        } else {
          // Honor configured model; use JSON-mode path directly
          warnOnce(
            'batch-fallback',
            `⚠️ Model does not support structured output, using JSON mode fallback`
          );
          const jsonPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON matching this exact schema:
{
  "suggestions": [
    {
      "product_id": "uuid",
      "supplier_product_id": "uuid",
      "supplier_sku": "string",
      "suggested_category_id": "uuid",
      "confidence": 0.95,
      "reasoning": "Brief explanation",
      "alternatives": [{"category_id": "uuid", "confidence": 0.85, "reasoning": "text"}]
    }
  ]
}

Return ONLY the JSON object, no other text.`;
          const textOptions: any = { model, prompt: jsonPrompt, maxTokens: 2000 };
          if (!isReasoningModel(compatibleModel)) {
            textOptions.temperature = 0.1;
          }
          const textResult = await withTimeout(
            generateText(textOptions),
            DEFAULT_AI_TIMEOUT_MS,
            `openai batch generateText JSON-mode (${compatibleModel})`
          );
          const parsed = parseStructuredJsonResponse(
            textResult.text,
            BatchCategorySuggestionSchema
          );
          if (parsed) {
            batchResult = parsed;
          } else {
            console.error('Unable to parse structured batch response from JSON mode fallback');
            return results;
          }
        }
      } catch (error: any) {
        // Handle "No object generated" error - fallback to generateText with JSON mode
        const msg = String(error?.message || '');
        const body = String(error?.responseBody || '');
        const isJsonSchemaUnsupported =
          msg.includes('text.format') ||
          body.includes('text.format') ||
          (msg.includes('json_schema') && msg.includes('not supported'));

        // Handle timeout explicitly
        if (msg.startsWith('AI request timeout:')) {
          console.error(`⏱️ ${msg}. Skipping this batch for provider ${providerConfig.provider}`);
          return results;
        }

        if (
          error?.message?.includes('No object generated') ||
          error?.message?.includes('did not return a response')
        ) {
          warnOnce(
            'batch-fallback',
            `⚠️ Model did not return structured output for batch, using JSON mode fallback`
          );
          try {
            const jsonPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON matching this exact schema:
{
  "suggestions": [
    {
      "product_id": "uuid",
      "supplier_product_id": "uuid",
      "supplier_sku": "string",
      "suggested_category_id": "uuid",
      "confidence": 0.95,
      "reasoning": "Brief explanation",
      "alternatives": [{"category_id": "uuid", "confidence": 0.85, "reasoning": "text"}]
    }
  ]
}

Return ONLY the JSON object, no other text.`;

            const textOptions: any = {
              model,
              prompt: jsonPrompt,
              maxTokens: 2000,
            };
            if (!isReasoningModel(compatibleModel)) {
              textOptions.temperature = 0.1;
            }

            const textResult = await withTimeout(
              generateText(textOptions),
              DEFAULT_AI_TIMEOUT_MS,
              `openai batch JSON-fallback generateText (${compatibleModel})`
            );
            const parsed = parseStructuredJsonResponse(
              textResult.text,
              BatchCategorySuggestionSchema
            );
            if (parsed) {
              batchResult = parsed;
            } else {
              console.error('Unable to parse structured batch response from JSON mode fallback');
              return results;
            }
          } catch (fallbackError) {
            console.error(`JSON mode fallback also failed for batch:`, fallbackError);
            return results;
          }
        } else if (isJsonSchemaUnsupported) {
          // Honor configured model; fallback directly to JSON-mode for this batch
          try {
            warnOnce(
              'batch-fallback',
              `⚠️ JSON schema unsupported by model; using JSON mode for provider ${providerConfig.provider}`
            );
            const jsonPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON matching this exact schema:
{
  "suggestions": [
    {
      "product_id": "uuid",
      "supplier_product_id": "uuid",
      "supplier_sku": "string",
      "suggested_category_id": "uuid",
      "confidence": 0.95,
      "reasoning": "Brief explanation",
      "alternatives": [{"category_id": "uuid", "confidence": 0.85, "reasoning": "text"}]
    }
  ]
}

Return ONLY the JSON object, no other text.`;
            const textOptions: any = { model, prompt: jsonPrompt, maxTokens: 2000 };
            if (!isReasoningModel(compatibleModel)) {
              textOptions.temperature = 0.1;
            }
            const textResult = await withTimeout(
              generateText(textOptions),
              DEFAULT_AI_TIMEOUT_MS,
              `openai batch JSON-mode (schema-unsupported) generateText (${compatibleModel})`
            );
            const parsed = parseStructuredJsonResponse(
              textResult.text,
              BatchCategorySuggestionSchema
            );
            if (parsed) {
              batchResult = parsed;
            } else {
              console.error('Unable to parse structured batch response from JSON mode fallback');
              return results;
            }
          } catch (retryOrFallbackError) {
            console.error(`OpenAI JSON mode fallback failed for batch:`, retryOrFallbackError);
            return results;
          }
        } else if (error?.statusCode === 429 || error?.message?.includes('Rate limit')) {
          throw error;
        } else {
          console.error(`OpenAI batch categorization error:`, error);
          return results;
        }
      }
    } else {
      console.warn(`Unsupported provider: ${providerConfig.provider}`);
      return results;
    }

    if (!batchResult || !batchResult.suggestions) {
      return results;
    }

    // Process each suggestion and map to product IDs
    for (const suggestion of batchResult.suggestions) {
      const productId = suggestion.product_id || suggestion.supplier_product_id;
      if (!productId) continue;

      const categoryId = suggestion.suggested_category_id || suggestion.categoryId;
      if (!categoryId) continue;

      const category = categories.find(c => c.category_id === categoryId);
      if (!category) {
        console.warn(`Category ${categoryId} not found for product ${productId}`);
        continue;
      }

      const categorySuggestion: CategorySuggestion = {
        categoryId: category.category_id,
        categoryName: category.name,
        confidence: suggestion.confidence || 0.5,
        reasoning: suggestion.reasoning,
        provider: providerConfig.provider,
      };

      if (suggestion.alternatives && suggestion.alternatives.length > 0) {
        categorySuggestion.alternatives = suggestion.alternatives
          .map(alt => {
            const altCategoryId = alt.category_id || alt.categoryId;
            const altCategory = altCategoryId
              ? categories.find(c => c.category_id === altCategoryId)
              : null;
            if (!altCategory) return null;
            return {
              categoryId: altCategory.category_id,
              categoryName: altCategory.name,
              confidence: alt.confidence || 0.5,
              reasoning: alt.reasoning,
            };
          })
          .filter((alt): alt is NonNullable<typeof alt> => alt !== null);
      }

      results.set(productId, categorySuggestion);
    }

    return results;
  } catch (error: any) {
    // Re-throw rate limit errors to be handled by caller
    if (error?.statusCode === 429 || error?.message?.includes('Rate limit')) {
      throw error;
    }
    console.error(
      `AI batch categorization failed with provider ${providerConfig.provider}:`,
      error
    );
    return results;
  }
}

/**
 * Generate category suggestion using AI with enriched product data (single product - legacy)
 */
async function suggestCategoryWithAI(
  enrichedProduct: EnrichedProduct,
  categories: CategoryHierarchy[],
  providerConfig: {
    provider: string;
    apiKey: string;
    baseUrl?: string;
    model?: string;
  }
): Promise<CategorySuggestion | null> {
  try {
    // Trim model name to prevent "model not found" errors from whitespace
    const modelName = providerConfig.model ? String(providerConfig.model).trim() : undefined;

    // Extract specifications from attrs_json
    const specifications = extractSpecifications(enrichedProduct.attrs_json);

    // Build comprehensive product context
    const productContext = `
Product Details:
- SKU: ${enrichedProduct.supplier_sku}
- Name: ${enrichedProduct.name_from_supplier}
- Brand: ${enrichedProduct.brand || 'Not specified'}
- Supplier: ${enrichedProduct.supplier_name}${enrichedProduct.supplier_code ? ` (${enrichedProduct.supplier_code})` : ''}
- Supplier's Suggested Category: ${enrichedProduct.category_raw || 'None'}
- Current Category: ${enrichedProduct.category_name || 'Uncategorized'}
- Unit of Measure: ${enrichedProduct.uom}
${enrichedProduct.pack_size ? `- Pack Size: ${enrichedProduct.pack_size}` : ''}
${enrichedProduct.barcode ? `- Barcode: ${enrichedProduct.barcode}` : ''}
${enrichedProduct.current_price ? `- Price: ${enrichedProduct.currency || ''} ${enrichedProduct.current_price}` : ''}
${enrichedProduct.qty_on_hand !== null ? `- Stock on Hand: ${enrichedProduct.qty_on_hand}` : ''}
${specifications.length > 0 ? `- Specifications:\n${specifications.map(s => `  • ${s}`).join('\n')}` : ''}
${enrichedProduct.attrs_json ? `- Additional Attributes: ${JSON.stringify(enrichedProduct.attrs_json, null, 2)}` : ''}

Available Categories (hierarchical):
${categories.map(c => `- ${c.category_id}: ${c.name} (Path: ${c.path}, Level: ${c.level}${c.parent_id ? `, Parent: ${c.parent_id}` : ''})`).join('\n')}
`;

    // Build comprehensive prompt
    const prompt = `You are categorizing products for an inventory management system. Analyze the product information and suggest the most appropriate category from the available categories list.

${productContext}

Task: Suggest the most appropriate category. Consider:
1. Product description and name
2. Brand positioning and typical product lines
3. Supplier's suggested category (if provided)
4. Existing category structure and hierarchy
5. Product specifications and attributes
6. Similar products that might be in the same category

Important:
- Return the exact category_id (UUID) from the available categories
- Provide a confidence score between 0 and 1 (where 1.0 is completely certain)
- Include a brief reasoning explanation
- If multiple categories could fit, list up to 3 alternatives with their confidence scores

Return ONLY valid JSON matching this schema:
{
  "suggested_category_id": "uuid-here",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this category fits",
  "alternatives": [
    {
      "category_id": "uuid-here",
      "confidence": 0.85,
      "reasoning": "Alternative explanation"
    }
  ]
}`;

    // Use AI SDK directly with proper schema for categorization
    let result: z.infer<typeof CategorySuggestionSchema> | null = null;

    if (providerConfig.provider === 'anthropic') {
      const anthropic = createAnthropic({
        apiKey: providerConfig.apiKey,
        ...(providerConfig.baseUrl ? { baseURL: providerConfig.baseUrl } : {}),
      });

      const model = anthropic(modelName || 'claude-3-5-sonnet-20241022');

      try {
        // Reasoning models don't support temperature
        const generateOptions: any = {
          model,
          schema: CategorySuggestionSchema,
          prompt,
        };
        if (!isReasoningModel(modelName)) {
          generateOptions.temperature = 0.1;
        }

        const aiResult = await generateObject(generateOptions);
        result = aiResult.object;
      } catch (error: any) {
        // Handle "No object generated" error - fallback to generateText with JSON mode
        if (
          error?.message?.includes('No object generated') ||
          error?.message?.includes('did not return a response')
        ) {
          warnOnce(
            'single-fallback',
            `⚠️ Model did not return structured output, using JSON mode fallback`
          );
          try {
            const jsonPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON matching this exact schema:
{
  "suggested_category_id": "uuid-here",
  "confidence": 0.95,
  "reasoning": "Brief explanation",
  "alternatives": [{"category_id": "uuid", "confidence": 0.85, "reasoning": "text"}]
}

Return ONLY the JSON object, no other text.`;

            const textOptions: any = {
              model,
              prompt: jsonPrompt,
            };
            if (!isReasoningModel(modelName)) {
              textOptions.temperature = 0.1;
            }

            const textResult = await generateText(textOptions);
            const parsed = parseStructuredJsonResponse(textResult.text, CategorySuggestionSchema);
            if (parsed) {
              result = parsed;
            } else {
              throw new Error('Unable to parse JSON response from fallback');
            }
          } catch (fallbackError) {
            console.error(`JSON mode fallback also failed:`, fallbackError);
            return null;
          }
        } else if (error?.statusCode === 429 || error?.message?.includes('Rate limit')) {
          throw error; // Re-throw to be caught by caller
        } else {
          console.error(`Anthropic categorization error:`, error);
          return null;
        }
      }
    } else if (
      providerConfig.provider === 'openai' ||
      providerConfig.provider === 'openai_compatible'
    ) {
      const openai = createOpenAI({
        apiKey: providerConfig.apiKey,
        ...(providerConfig.baseUrl ? { baseURL: providerConfig.baseUrl } : {}),
      });

      // Get compatible model (handles gpt-5-mini, etc.)
      const compatibleModel = getCompatibleModel(modelName);
      const model = openai(compatibleModel);

      try {
        // Reasoning models don't support temperature
        if (supportsJsonSchema(compatibleModel)) {
          const generateOptions: any = {
            model,
            schema: CategorySuggestionSchema,
            prompt,
            maxTokens: 800,
          };
          if (!isReasoningModel(compatibleModel)) {
            generateOptions.temperature = 0.1;
          }
          const aiResult = await withTimeout(
            generateObject(generateOptions),
            DEFAULT_AI_TIMEOUT_MS,
            `openai single generateObject (${compatibleModel})`
          );
          result = aiResult.object;
        } else {
          // Honor configured model; use JSON-mode path directly
          warnOnce(
            'single-fallback',
            `⚠️ Model does not support structured output, using JSON mode fallback`
          );
          const jsonPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON matching this exact schema:
{
  "suggested_category_id": "uuid-here",
  "confidence": 0.95,
  "reasoning": "Brief explanation",
  "alternatives": [{"category_id": "uuid", "confidence": 0.85, "reasoning": "text"}]
}

Return ONLY the JSON object, no other text.`;
          const textOptions: any = { model, prompt: jsonPrompt, maxTokens: 1200 };
          if (!isReasoningModel(compatibleModel)) {
            textOptions.temperature = 0.1;
          }
          const textResult = await withTimeout(
            generateText(textOptions),
            DEFAULT_AI_TIMEOUT_MS,
            `openai single JSON-mode generateText (${compatibleModel})`
          );
          const parsed = parseStructuredJsonResponse(textResult.text, CategorySuggestionSchema);
          if (parsed) {
            result = parsed;
          } else {
            throw new Error('Unable to parse JSON response from fallback');
          }
        }
      } catch (error: any) {
        // Handle "No object generated" error - fallback to generateText with JSON mode
        const msg = String(error?.message || '');
        const body = String(error?.responseBody || '');
        const isJsonSchemaUnsupported =
          msg.includes('text.format') ||
          body.includes('text.format') ||
          (msg.includes('json_schema') && msg.includes('not supported'));

        if (msg.startsWith('AI request timeout:')) {
          console.error(
            `⏱️ ${msg}. Skipping single suggestion for provider ${providerConfig.provider}`
          );
          return null;
        }

        if (
          error?.message?.includes('No object generated') ||
          error?.message?.includes('did not return a response')
        ) {
          warnOnce(
            'single-fallback',
            `⚠️ Model did not return structured output, using JSON mode fallback`
          );
          try {
            const jsonPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON matching this exact schema:
{
  "suggested_category_id": "uuid-here",
  "confidence": 0.95,
  "reasoning": "Brief explanation",
  "alternatives": [{"category_id": "uuid", "confidence": 0.85, "reasoning": "text"}]
}

Return ONLY the JSON object, no other text.`;

            const textOptions: any = {
              model,
              prompt: jsonPrompt,
              maxTokens: 1200,
            };
            if (!isReasoningModel(compatibleModel)) {
              textOptions.temperature = 0.1;
            }

            const textResult = await withTimeout(
              generateText(textOptions),
              DEFAULT_AI_TIMEOUT_MS,
              `openai single JSON-fallback generateText (${compatibleModel})`
            );
            const parsed = parseStructuredJsonResponse(textResult.text, CategorySuggestionSchema);
            if (parsed) {
              result = parsed;
            } else {
              throw new Error('Unable to parse JSON response from fallback');
            }
          } catch (fallbackError) {
            console.error(`JSON mode fallback also failed:`, fallbackError);
            return null;
          }
        } else if (isJsonSchemaUnsupported) {
          // Honor configured model; fallback directly to JSON-mode
          try {
            warnOnce(
              'single-fallback',
              `⚠️ JSON schema unsupported by model; using JSON mode for provider ${providerConfig.provider}`
            );
            const jsonPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON matching this exact schema:
{
  "suggested_category_id": "uuid-here",
  "confidence": 0.95,
  "reasoning": "Brief explanation",
  "alternatives": [{"category_id": "uuid", "confidence": 0.85, "reasoning": "text"}]
}

Return ONLY the JSON object, no other text.`;
            const textOptions: any = { model, prompt: jsonPrompt, maxTokens: 1200 };
            if (!isReasoningModel(compatibleModel)) {
              textOptions.temperature = 0.1;
            }
            const textResult = await withTimeout(
              generateText(textOptions),
              DEFAULT_AI_TIMEOUT_MS,
              `openai single JSON-mode (schema-unsupported) generateText (${compatibleModel})`
            );
            const parsed = parseStructuredJsonResponse(textResult.text, CategorySuggestionSchema);
            if (parsed) {
              result = parsed;
            } else {
              throw new Error('Unable to parse JSON response from fallback');
            }
          } catch (retryOrFallbackError) {
            console.error(`OpenAI JSON mode fallback failed:`, retryOrFallbackError);
            return null;
          }
        } else if (error?.statusCode === 429 || error?.message?.includes('Rate limit')) {
          throw error; // Re-throw to be caught by caller
        } else {
          console.error(`OpenAI categorization error:`, error);
          return null;
        }
      }
    } else {
      console.warn(`Unsupported provider: ${providerConfig.provider}`);
      return null;
    }

    if (!result) {
      return null;
    }

    // Extract category ID (handle both field names)
    const categoryId = result.suggested_category_id || result.categoryId;
    if (!categoryId) {
      console.warn(`No category ID in AI response for product ${enrichedProduct.supplier_sku}`);
      return null;
    }

    // Find the category
    const category = categories.find(c => c.category_id === categoryId);
    if (!category) {
      console.warn(`Category ${categoryId} not found in available categories`);
      return null;
    }

    // Build response
    const suggestion: CategorySuggestion = {
      categoryId: category.category_id,
      categoryName: category.name,
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning,
      provider: providerConfig.provider,
    };

    // Add alternatives if provided
    if (result.alternatives && result.alternatives.length > 0) {
      suggestion.alternatives = result.alternatives
        .map(alt => {
          const altCategoryId = alt.category_id || alt.categoryId;
          const altCategory = altCategoryId
            ? categories.find(c => c.category_id === altCategoryId)
            : null;
          if (!altCategory) return null;
          return {
            categoryId: altCategory.category_id,
            categoryName: altCategory.name,
            confidence: alt.confidence || 0.5,
            reasoning: alt.reasoning,
          };
        })
        .filter((alt): alt is NonNullable<typeof alt> => alt !== null);
    }

    return suggestion;
  } catch (error) {
    console.error(`AI categorization failed with provider ${providerConfig.provider}:`, error);
    return null;
  }
}

/**
 * Check if a model is a reasoning model (doesn't support temperature)
 */
function isReasoningModel(modelName?: string): boolean {
  if (!modelName) return false;
  const normalized = modelName.trim().toLowerCase();
  const reasoningPatterns = [/^o\d+/i, /^r1\b/i, /^deepseek-r1/i, /reasoning/i];
  return reasoningPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Get a compatible model that supports JSON schema
 */
function getCompatibleModel(requestedModel?: string): string {
  if (!requestedModel) {
    return 'gpt-4o-mini';
  }

  const trimmedModel = requestedModel.trim();

  // Normalize common mis-specifications:
  // - Some configs use "gpt-40" (zero) instead of "gpt-4o" (letter o).
  // - Preserve suffixes like "-mini" if present.
  if (/^gpt-40\b/i.test(trimmedModel)) {
    // Replace leading "gpt-40" with "gpt-4o"
    const normalized = trimmedModel.replace(/^gpt-40/i, 'gpt-4o');
    return normalized;
  }

  // Models that don't support JSON schema
  const unsupportedPatterns = [/gpt-5-mini/i, /gpt-5-chat/i, /^o1(-|$)/i, /^o3(-|$)/i];

  const supportsJsonSchema = !unsupportedPatterns.some(pattern => pattern.test(trimmedModel));

  if (supportsJsonSchema) {
    return trimmedModel;
  }

  return 'gpt-4o-mini';
}

/**
 * Detect if a model is known to support JSON Schema with the OpenAI Responses API.
 * We always honor the configured model; if unsupported, we avoid generateObject
 * and use JSON-mode text with schema parsing instead of substituting models.
 */
function supportsJsonSchema(modelName?: string): boolean {
  if (!modelName) return false;
  const m = modelName.trim().toLowerCase();
  // Known to support: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, etc.
  if (/(^gpt-4o(\b|-)|^gpt-4\.1(\b|-))/.test(m)) return true;
  // Explicitly mark gpt-4-mini as not supporting JSON Schema
  if (/^gpt-4-mini\b/.test(m)) return false;
  // Treat reasoning and experimental lines as unsupported for schema
  if (/^o1\b|^o3\b|reasoning|deepseek-r1/.test(m)) return false;
  return false;
}

/**
 * Generate category suggestions for multiple products using batch processing
 * Handles dynamic batch sizing, rate limiting, and partial failures
 */
export async function suggestCategoriesBatchWithAIService(
  enrichedProducts: EnrichedProduct[],
  categories: CategoryHierarchy[],
  orgId?: string | null,
  options?: {
    batchSize?: number;
    batchDelay?: number;
    maxRetries?: number;
  }
): Promise<Map<string, CategorySuggestion>> {
  const results = new Map<string, CategorySuggestion>();

  if (enrichedProducts.length === 0) {
    return results;
  }

  try {
    // Get the Product Categories AI service config
    const serviceConfig = await getProductCategoriesService(orgId);

    if (!serviceConfig || !serviceConfig.enabled) {
      console.warn('Product Categories AI service not configured or disabled');
      return results;
    }

    const config = serviceConfig.config || {};
    const providers = extractProviders(config);

    if (providers.length === 0) {
      console.warn('No enabled AI providers found in Product Categories service');
      return results;
    }

    // Use cached categories
    const categoryHierarchy = await getCachedCategoryHierarchy();

    // Calculate optimal batch size per provider
    const providerBatchSizes = new Map<string, number>();
    for (const provider of providers) {
      const optimalSize = calculateOptimalBatchSize(
        enrichedProducts,
        categoryHierarchy,
        provider.provider,
        options?.batchSize
      );
      providerBatchSizes.set(provider.provider, optimalSize);
    }

    // Use the smallest batch size to ensure all providers can handle it
    const minBatchSize = Math.min(...Array.from(providerBatchSizes.values()));
    const actualBatchSize = options?.batchSize
      ? Math.min(options.batchSize, minBatchSize)
      : minBatchSize;

    // Split products into batches
    const batches: EnrichedProduct[][] = [];
    for (let i = 0; i < enrichedProducts.length; i += actualBatchSize) {
      batches.push(enrichedProducts.slice(i, i + actualBatchSize));
    }

    console.log(
      `📦 Processing ${enrichedProducts.length} products in ${batches.length} batches (${actualBatchSize} products per batch)`
    );

    // Process batches sequentially with delays
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      // Process batch with all providers in parallel
      const providerPromises = providers.map(async providerConfig => {
        try {
          // Create rate limiter for this provider
          const providerLimits = getProviderTokenLimits(providerConfig.provider);
          const rateLimiter = getRateLimiter(
            `ai-categorization:${providerConfig.provider}`,
            providerLimits.contextWindow > 100000 ? 500 : 200, // Higher limit for larger context windows
            providerLimits.contextWindow > 100000 ? 8.33 : 3.33 // requests per second
          );

          const batchResults = await suggestCategoriesBatchWithAI(
            batch,
            categoryHierarchy,
            providerConfig,
            {
              batchSize: actualBatchSize,
              rateLimiter,
            }
          );

          return { provider: providerConfig.provider, results: batchResults };
        } catch (error: any) {
          const isRateLimitError =
            error?.statusCode === 429 ||
            error?.message?.includes('Rate limit') ||
            error?.message?.includes('rate limit');

          if (isRateLimitError) {
            console.warn(
              `⚠️ Provider ${providerConfig.provider} hit rate limit on batch ${batchIndex + 1}`
            );
            return {
              provider: providerConfig.provider,
              results: new Map<string, CategorySuggestion>(),
            };
          }

          console.error(
            `Provider ${providerConfig.provider} failed on batch ${batchIndex + 1}:`,
            error
          );
          return {
            provider: providerConfig.provider,
            results: new Map<string, CategorySuggestion>(),
          };
        }
      });

      const providerResults = await Promise.allSettled(providerPromises);

      // Aggregate results from all providers
      for (const result of providerResults) {
        if (result.status === 'fulfilled' && result.value) {
          const { results: batchResults } = result.value;
          for (const [productId, suggestion] of batchResults.entries()) {
            // If we already have a result for this product, prefer higher confidence
            const existing = results.get(productId);
            if (!existing || suggestion.confidence > existing.confidence) {
              results.set(productId, suggestion);
            }
          }
        }
      }

      // Delay between batches (except for last batch)
      if (batchIndex < batches.length - 1 && options?.batchDelay) {
        await new Promise(resolve => setTimeout(resolve, options.batchDelay));
      }
    }

    return results;
  } catch (error) {
    console.error('Batch categorization service error:', error);
    return results;
  }
}

/**
 * Generate category suggestions using all configured AI providers
 * Aggregates results from multiple providers (similar to supplier discovery pattern)
 *
 * Supports both legacy Product type and new EnrichedProduct type
 */
export async function suggestCategoryWithAIService(
  product: Product | EnrichedProduct,
  categories: Category[] | CategoryHierarchy[],
  orgId?: string | null
): Promise<CategorySuggestion | null> {
  try {
    // Get the Product Categories AI service config
    const serviceConfig = await getProductCategoriesService(orgId);

    if (!serviceConfig || !serviceConfig.enabled) {
      console.warn('Product Categories AI service not configured or disabled');
      return null;
    }

    const config = serviceConfig.config || {};
    const providers = extractProviders(config);

    if (providers.length === 0) {
      console.warn('No enabled AI providers found in Product Categories service');
      return null;
    }

    console.log(`🔍 Using ${providers.length} AI provider(s) for categorization`);

    // Convert legacy Product to EnrichedProduct format if needed
    let enrichedProduct: EnrichedProduct;
    let categoryHierarchy: CategoryHierarchy[];

    if ('supplier_product_id' in product) {
      // Already an EnrichedProduct
      enrichedProduct = product as EnrichedProduct;
    } else {
      // Legacy Product type - convert to minimal EnrichedProduct
      const legacyProduct = product as Product;
      enrichedProduct = {
        supplier_product_id: legacyProduct.sku,
        supplier_id: legacyProduct.supplierId,
        supplier_sku: legacyProduct.sku,
        name_from_supplier: legacyProduct.description,
        category_id: legacyProduct.categoryId || null,
        category_name: null,
        category_path: null,
        supplier_name: '',
        supplier_code: null,
        brand: legacyProduct.brand || null,
        uom: 'EACH',
        pack_size: null,
        barcode: null,
        attrs_json: legacyProduct.attributes || null,
        category_raw: null,
        current_price: legacyProduct.price || null,
        currency: null,
        qty_on_hand: null,
        qty_on_order: null,
        is_active: true,
        is_new: false,
        first_seen_at: new Date(),
        last_seen_at: null,
      };
    }

    // Convert categories to CategoryHierarchy format if needed
    // If categories not provided, use cached categories
    if (categories.length === 0) {
      categoryHierarchy = await getCachedCategoryHierarchy();
    } else if (categories.length > 0 && 'path' in categories[0]) {
      categoryHierarchy = categories as CategoryHierarchy[];
    } else {
      // Convert legacy Category[] to CategoryHierarchy[]
      categoryHierarchy = (categories as Category[]).map(cat => ({
        category_id: cat.id,
        name: cat.name,
        parent_id: cat.parentId || null,
        path: cat.path,
        level: cat.path.split('>').length - 1,
      }));
    }

    // Try all providers in parallel and aggregate results
    const providerPromises = providers.map(async providerConfig => {
      try {
        const suggestion = await suggestCategoryWithAI(
          enrichedProduct,
          categoryHierarchy,
          providerConfig
        );
        return suggestion;
      } catch (error: any) {
        // If it's a rate limit error, log and return null (other provider can still succeed)
        // Handle both direct rate limit errors and retry errors that contain rate limit errors
        const isRateLimitError =
          error?.statusCode === 429 ||
          error?.lastError?.statusCode === 429 ||
          error?.message?.includes('Rate limit') ||
          error?.message?.includes('rate limit') ||
          error?.lastError?.message?.includes('Rate limit') ||
          error?.lastError?.message?.includes('rate limit') ||
          error?.responseBody?.includes('Rate limit') ||
          error?.responseBody?.includes('rate limit') ||
          error?.lastError?.responseBody?.includes('Rate limit') ||
          error?.lastError?.responseBody?.includes('rate limit');

        if (isRateLimitError) {
          console.warn(
            `⚠️ Provider ${providerConfig.provider} hit rate limit, skipping for this request`
          );
          return null;
        }
        // For other errors, log and return null
        console.error(`Provider ${providerConfig.provider} failed:`, error);
        return null;
      }
    });

    // Wait for all providers to complete (in parallel)
    const providerResults = await Promise.allSettled(providerPromises);

    // Extract successful results
    const results: CategorySuggestion[] = [];
    for (const result of providerResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    }

    if (results.length === 0) {
      return null;
    }

    // Aggregate results - prefer higher confidence, or most common category
    if (results.length === 1) {
      return results[0];
    }

    // Group by categoryId and calculate average confidence
    const categoryMap = new Map<
      string,
      { count: number; totalConfidence: number; providers: string[]; reasoning: string[] }
    >();

    for (const result of results) {
      const existing = categoryMap.get(result.categoryId) || {
        count: 0,
        totalConfidence: 0,
        providers: [],
        reasoning: [],
      };
      categoryMap.set(result.categoryId, {
        count: existing.count + 1,
        totalConfidence: existing.totalConfidence + result.confidence,
        providers: [...existing.providers, result.provider || 'unknown'],
        reasoning: result.reasoning
          ? [...existing.reasoning, result.reasoning]
          : existing.reasoning,
      });
    }

    // Find the category with highest average confidence
    let bestCategory: string | null = null;
    let bestAvgConfidence = 0;

    for (const [categoryId, stats] of categoryMap.entries()) {
      const avgConfidence = stats.totalConfidence / stats.count;
      if (avgConfidence > bestAvgConfidence) {
        bestAvgConfidence = avgConfidence;
        bestCategory = categoryId;
      }
    }

    if (bestCategory) {
      const category = categoryHierarchy.find(c => c.category_id === bestCategory);
      if (category) {
        const stats = categoryMap.get(bestCategory)!;
        return {
          categoryId: bestCategory,
          categoryName: category.name,
          confidence: bestAvgConfidence,
          reasoning: stats.reasoning.join('; '),
          provider: `aggregated (${stats.providers.join(', ')})`,
        };
      }
    }

    // Fallback: return highest confidence single result
    return results.sort((a, b) => b.confidence - a.confidence)[0];
  } catch (error) {
    console.error('AI categorization service error:', error);
    return null;
  }
}
