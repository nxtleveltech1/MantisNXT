/**
 * Token Estimation Utility
 * Provides approximate token counting for AI prompts
 * Uses rule of thumb: ~4 characters ≈ 1 token for English text
 */

import type { EnrichedProduct, CategoryHierarchy } from '@/lib/cmm/sip-product-enrichment'

/**
 * Estimate tokens for a given text string
 * Uses approximation: ~4 characters per token for English text
 * More accurate for English, less accurate for other languages
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0
  
  // Remove extra whitespace and normalize
  const normalized = text.trim().replace(/\s+/g, ' ')
  
  // Base estimation: ~4 chars per token
  // Add overhead for JSON structure, special characters
  const baseTokens = Math.ceil(normalized.length / 4)
  
  // Add tokens for JSON structure (quotes, brackets, commas)
  const jsonOverhead = (text.match(/["{}[\],:]/g) || []).length * 0.5
  
  return Math.ceil(baseTokens + jsonOverhead)
}

/**
 * Estimate tokens for a single enriched product
 */
export function estimateProductTokens(product: EnrichedProduct): number {
  let tokens = 0
  
  // Basic product fields
  tokens += estimateTokens(product.supplier_sku || '')
  tokens += estimateTokens(product.name_from_supplier || '')
  tokens += estimateTokens(product.brand || '')
  tokens += estimateTokens(product.supplier_name || '')
  tokens += estimateTokens(product.supplier_code || '')
  tokens += estimateTokens(product.category_name || '')
  tokens += estimateTokens(product.category_path || '')
  tokens += estimateTokens(product.category_raw || '')
  tokens += estimateTokens(product.uom || '')
  tokens += estimateTokens(product.pack_size || '')
  tokens += estimateTokens(product.barcode || '')
  
  // Price and stock (numbers + labels)
  if (product.current_price !== null) tokens += 10
  if (product.currency) tokens += estimateTokens(product.currency)
  if (product.qty_on_hand !== null) tokens += 10
  if (product.qty_on_order !== null) tokens += 10
  
  // Attributes JSON (can be large)
  if (product.attrs_json) {
    const attrsString = JSON.stringify(product.attrs_json)
    tokens += estimateTokens(attrsString)
  }
  
  // Product context overhead (labels, formatting)
  tokens += 50
  
  return tokens
}

/**
 * Estimate tokens for category hierarchy list
 */
export function estimateCategoryListTokens(categories: CategoryHierarchy[]): number {
  if (!categories || categories.length === 0) return 0
  
  let tokens = 0
  
  // Base overhead for category list structure
  tokens += 100
  
  // Each category entry
  for (const category of categories) {
    tokens += estimateTokens(category.category_id || '')
    tokens += estimateTokens(category.name || '')
    tokens += estimateTokens(category.path || '')
    if (category.parent_id) tokens += estimateTokens(category.parent_id)
    
    // Formatting overhead per category (~20 tokens)
    tokens += 20
  }
  
  return tokens
}

/**
 * Estimate tokens for a batch prompt including products and categories
 */
export function estimateBatchPromptTokens(
  products: EnrichedProduct[],
  categories: CategoryHierarchy[]
): number {
  let tokens = 0
  
  // Base prompt overhead
  tokens += 200
  
  // Category list (sent once per batch)
  tokens += estimateCategoryListTokens(categories)
  
  // Products
  for (const product of products) {
    tokens += estimateProductTokens(product)
  }
  
  // Batch structure overhead (formatting, instructions)
  tokens += 300
  
  return tokens
}

/**
 * Calculate maximum products that can fit in a batch given token limits
 */
export function calculateMaxProductsPerBatch(
  availableTokens: number,
  categoryTokens: number,
  avgProductTokens: number = 200,
  safetyMargin: number = 0.8
): number {
  // Apply safety margin to available tokens
  const safeTokens = Math.floor(availableTokens * safetyMargin)
  
  // Subtract category list and base prompt overhead
  const basePromptTokens = 200
  const batchStructureTokens = 300
  const availableForProducts = safeTokens - categoryTokens - basePromptTokens - batchStructureTokens
  
  if (availableForProducts <= 0) return 0
  
  // Calculate max products
  const maxProducts = Math.floor(availableForProducts / avgProductTokens)
  
  return Math.max(1, maxProducts) // At least 1 product
}

/**
 * Get provider-specific token limits
 */
export function getProviderTokenLimits(provider: string): {
  contextWindow: number
  outputLimit: number
  recommendedBatchSize: number
} {
  switch (provider.toLowerCase()) {
    case 'openai':
      return {
        contextWindow: 128000, // GPT-4o context window
        outputLimit: 8192,
        recommendedBatchSize: 500, // Conservative estimate
      }
    case 'anthropic':
      return {
        contextWindow: 200000, // Claude 3.5 Sonnet context window
        outputLimit: 4000,
        recommendedBatchSize: 800, // Conservative estimate
      }
    case 'openai-compatible':
    case 'openai_compatible':
      return {
        contextWindow: 80000, // Assume 80k for compatible providers
        outputLimit: 4000,
        recommendedBatchSize: 400, // Conservative estimate
      }
    default:
      // Default conservative limits
      return {
        contextWindow: 32000,
        outputLimit: 2000,
        recommendedBatchSize: 50,
      }
  }
}






