// @ts-nocheck

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject, generateText } from 'ai';
import type { EnrichedProduct } from '@/lib/cmm/sip-product-enrichment';
import {
  BatchTagSuggestionSchema,
  ProductEnrichmentSchema,
  parseStructuredJsonResponse,
  type BatchTagSuggestion,
  type ProductEnrichment,
} from './parser';
import { isReasoningModel, supportsJsonSchema } from './fallback';
import type { ProviderConfig } from './resolver';
import { mark } from './metrics';
import { researchProduct, type WebResearchResult } from './web-research';
import { CLIProviderClient, CLIProviderExecutor } from '@/lib/ai/cli-provider';

const DEFAULT_TIMEOUT_MS = 45000; // 45s default for enrichment operations

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

export type EngineOptions = {
  timeoutMs?: number;
  webResearchEnabled?: boolean;
  webResearchProvider?: string;
};

/**
 * Enrich a single product with AI: correct name, generate descriptions, suggest tags
 */
export async function enrichProductWithAI(
  provider: ProviderConfig,
  product: EnrichedProduct,
  existingTags: Array<{ tag_id: string; name: string; type: string }> = [],
  options: EngineOptions = {}
): Promise<ProductEnrichment | null> {
  const modelName = provider.model ? String(provider.model).trim() : undefined;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const webResearchEnabled = options.webResearchEnabled !== false;

  // Perform web research if enabled
  let webResearchResults: WebResearchResult[] = [];
  if (webResearchEnabled) {
    try {
      // Use configured web research provider, or auto-detect based on available API keys
      // Prioritize configured provider and API key from options
      const webProvider = options.webResearchProvider || 
        (options.webResearchApiKey && options.webResearchProvider 
          ? options.webResearchProvider 
          : (process.env.TAVILY_API_KEY ? 'tavily' :
             process.env.SERPER_API_KEY ? 'serper' :
             process.env.BRAVE_API_KEY ? 'brave' :
             process.env.EXA_API_KEY ? 'exa' :
             (process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID) ? 'google_custom_search' :
             undefined));
      
      if (!webProvider || webProvider === 'manual') {
        console.warn(`[engine] Web research skipped: no provider configured (webResearchProvider=${options.webResearchProvider}, hasApiKey=${!!options.webResearchApiKey})`);
      } else {
        webResearchResults = await researchProduct(
          product.supplier_sku,
          product.name_from_supplier,
          product.attrs_json?.description as string | undefined,
          {
            provider: webProvider as any,
            apiKey: options.webResearchApiKey,
            // For Google Custom Search, we need engine ID
            ...(webProvider === 'google_custom_search' && options.webResearchEngineId 
              ? { apiUrl: options.webResearchEngineId } 
              : {}),
          }
        );
      }
    } catch (error) {
      console.warn('[engine] Web research failed, continuing without:', error);
    }
  }

  const webResearchContext = webResearchResults.length > 0
    ? `\n\nWeb Research Results:\n${webResearchResults.map((r, idx) => 
        `${idx + 1}. ${r.title || 'N/A'}\n   ${r.description || ''}\n   Source: ${r.source}`
      ).join('\n\n')}`
    : '';

  const existingTagsList = existingTags.length > 0
    ? `\n\nExisting Tags:\n${existingTags.map(t => `- ${t.name} (${t.type})`).join('\n')}`
    : '';

  // Check if product name is SKU (needs correction)
  const nameIsSku = product.name_from_supplier === product.supplier_sku;
  const nameCorrectionNote = nameIsSku
    ? '\n\n⚠️ IMPORTANT: The current product name is the same as the SKU. You MUST provide a proper descriptive product name based on the product information and web research.'
    : '';

  const prompt = `You are enriching product information for an inventory management system. Analyze the product data and web research results to:

1. **Product Name**: ${nameIsSku ? 'CORRECT the product name (currently set to SKU). Provide a proper descriptive name.' : 'Review and improve the product name if needed. It should NEVER be the same as the SKU.'}
2. **Short Description**: Generate a concise description (50-150 characters) summarizing the product
3. **Full Description**: Generate a detailed description (200-500 words) with specifications, features, and use cases
4. **Tags**: Suggest relevant tags for categorization (seasonal, stock, custom types)
5. **Metadata**: Extract structured metadata (dimensions, weight, material, etc.)

Product Details:
- SKU: ${product.supplier_sku}
- Current Name: ${product.name_from_supplier}${nameCorrectionNote}
- Brand: ${product.brand || 'Not specified'}
- Supplier: ${product.supplier_name}${product.supplier_code ? ` (${product.supplier_code})` : ''}
- Category: ${product.category_name || 'Uncategorized'}
- Unit of Measure: ${product.uom}
${product.pack_size ? `- Pack Size: ${product.pack_size}` : ''}
${product.barcode ? `- Barcode: ${product.barcode}` : ''}
${product.current_price ? `- Price: ${product.currency || ''} ${product.current_price}` : ''}
${product.attrs_json ? `- Current Attributes: ${JSON.stringify(product.attrs_json, null, 2)}` : ''}${webResearchContext}${existingTagsList}

Task: Return enriched product data. The product name MUST be descriptive and different from the SKU.

Return ONLY valid JSON matching this schema:
{
  "product_name": "Corrected descriptive product name (NEVER the SKU)",
  "short_description": "Brief 50-150 char summary",
  "full_description": "Detailed 200-500 word description",
  "suggested_tags": [
    {
      "tag_id": "tag-slug",
      "tag_name": "Tag Name",
      "confidence": 0.95,
      "reason": "Why this tag applies",
      "type": "custom"
    }
  ],
  "metadata": {
    "dimensions": "10x20x30 cm",
    "weight": "2.5 kg",
    "material": "wood"
  },
  "confidence": 0.9
}`;

  const providerKey = provider.provider?.toLowerCase();
  
  // Check if CLI mode is enabled - try CLI first
  if (provider.useCLI) {
    const cliCommand = provider.cliCommand || (providerKey === 'google' ? 'gemini' : providerKey === 'openai' ? 'codex' : '');
    
    if (!cliCommand) {
      throw new Error(
        'CLI mode is enabled but no CLI command specified. Please configure cliCommand in provider settings.'
      );
    }
    
    // Check if CLI command exists before trying to use it
    // Use a longer timeout for the initial check to avoid false negatives
    const cliCheck = await CLIProviderExecutor.checkCLIInstalled(cliCommand);
    if (!cliCheck.installed) {
      const installationHint = cliCommand === 'codex' 
        ? 'For OpenAI Codex CLI: Install with `npm install -g @openai/codex-cli` or visit https://github.com/openai/codex-cli. Then authenticate with `codex auth login` (supports free and paid accounts).'
        : cliCommand === 'gemini'
        ? 'For Google Gemini CLI: Install with `npm install -g @google/generative-ai-cli` or visit https://github.com/google/generative-ai-cli. Then authenticate with `gemini auth login` (supports free and paid accounts).'
        : `Please ensure '${cliCommand}' is installed and available in your PATH.`;
      
      throw new Error(
        `CLI command '${cliCommand}' is not installed or not available in PATH. ${installationHint} ` +
        `\n\nTo use API mode instead, disable CLI mode in the AI Services configuration and provide an API key.`
      );
    }
    
    try {
      const cliConfig = {
        provider: providerKey as any,
        command: cliCommand,
        args: provider.cliArgs,
        env: {
          ...(provider.apiKey && providerKey === 'openai' && { OPENAI_API_KEY: provider.apiKey }),
          ...(provider.apiKey && providerKey === 'google' && { GEMINI_API_KEY: provider.apiKey }),
        },
        workingDirectory: provider.cliWorkingDirectory,
        timeout: timeoutMs,
      };
      
      // Clean model name to remove suffixes like "medium", "high", etc.
      const cleanedModelName = modelName 
        ? modelName.trim().replace(/\s+(medium|high|low|fast|slow)$/i, '').replace(/\(medium\)|\(high\)|\(low\)/gi, '').trim()
        : 'gpt-5.1-codex-max';
      
      const cliClient = new CLIProviderClient(cliConfig);
      const result = await withTimeout(
        cliClient.generateText(prompt, { model: cleanedModelName }),
        timeoutMs,
        `cli enrichProduct generateText (${cleanedModelName || 'default'})`
      );
      
      return parseStructuredJsonResponse(result, ProductEnrichmentSchema);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[engine] CLI enrichProduct failed:`, err);
      
      // If CLI command doesn't exist or not found, don't fall back to API mode
      if (errorMessage.includes('ENOENT') || errorMessage.includes('not found') || errorMessage.includes('not available')) {
        throw new Error(
          `CLI command '${cliCommand}' not found or not available. Please install it or disable CLI mode and use API mode with an API key.`
        );
      }
      
      // Only fall through to API mode if CLI execution fails BUT:
      // 1. CLI command exists (already checked above)
      // 2. Valid API key is provided (not dummy/empty)
      // 3. This is an execution error, not installation error
      mark('providerFallbacks');
      const hasValidApiKey = provider.apiKey && 
        provider.apiKey !== 'dummy' && 
        typeof provider.apiKey === 'string' && 
        provider.apiKey.trim().length > 0;
      
      if (hasValidApiKey) {
        console.warn(`[engine] CLI execution failed (${errorMessage}), falling back to API mode with provided API key`);
        // Continue to API mode below
      } else {
        // CLI failed and no valid API key - throw error
        throw new Error(
          `CLI execution failed: ${errorMessage}. ` +
          `CLI mode is enabled but execution failed and no valid API key is provided for fallback. ` +
          `Please check CLI installation and authentication, or disable CLI mode and provide an API key for API mode.`
        );
      }
    }
  }
  
  if (providerKey === 'anthropic') {
    // Skip if no API key and CLI mode already failed
    const hasValidApiKey = provider.apiKey && 
      provider.apiKey !== 'dummy' && 
      typeof provider.apiKey === 'string' && 
      provider.apiKey.trim().length > 0;
    
    if (!hasValidApiKey) {
      throw new Error(
        'API key is required for Anthropic API mode. ' +
        (provider.useCLI 
          ? 'CLI mode failed or CLI command not found. Please provide a valid API key or fix CLI installation.'
          : 'Please provide an API key or enable CLI mode.')
      );
    }
    
    const anthropic = createAnthropic({
      apiKey: provider.apiKey,
      ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
    });
    const model = anthropic(modelName || 'claude-3-5-sonnet-20241022');
    try {
      const opts: unknown = {
        model,
        schema: ProductEnrichmentSchema,
        prompt,
        maxOutputTokens: 2000,
      };
      if (!isReasoningModel(modelName)) opts.temperature = 0.1;
      mark('schemaUsed');
      const result = await withTimeout(
        generateObject(opts),
        timeoutMs,
        `anthropic enrichProduct generateObject (${modelName || 'default'})`
      );
      return (result.object as ProductEnrichment | null) ?? null;
    } catch (err: unknown) {
      mark('providerFallbacks');
      const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON matching the schema.`;
      const textOpts: unknown = { model, prompt: jsonPrompt, maxOutputTokens: 2500 };
      if (!isReasoningModel(modelName)) textOpts.temperature = 0.1;
      const text = await withTimeout(
        generateText(textOpts),
        timeoutMs,
        `anthropic enrichProduct generateText JSON-mode (${modelName || 'default'})`
      );
      return parseStructuredJsonResponse(text.text, ProductEnrichmentSchema);
    }
  }

  // OpenAI or compatible
  // Skip if no API key and not CLI mode (or CLI already failed)
  const hasValidApiKey = provider.apiKey && 
    provider.apiKey !== 'dummy' && 
    typeof provider.apiKey === 'string' && 
    provider.apiKey.trim().length > 0;
  
  if (!hasValidApiKey) {
    throw new Error(
      'API key is required for OpenAI API mode. ' +
      (provider.useCLI 
        ? 'CLI mode failed or CLI command not found. Please provide a valid API key or fix CLI installation.'
        : 'Please provide an API key or enable CLI mode.')
    );
  }
  
  const openai = createOpenAI({
    apiKey: provider.apiKey,
    ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
  });
  const model = openai(modelName || 'gpt-4o-mini');
  try {
    if (supportsJsonSchema(modelName)) {
      const opts: unknown = {
        model,
        schema: ProductEnrichmentSchema,
        prompt,
        maxOutputTokens: 2000,
      };
      if (!isReasoningModel(modelName)) opts.temperature = 0.1;
      mark('schemaUsed');
      const result = await withTimeout(
        generateObject(opts),
        timeoutMs,
        `openai enrichProduct generateObject (${modelName})`
      );
      return (result.object as ProductEnrichment | null) ?? null;
    } else {
      mark('jsonModeUsed');
      const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON matching the schema.`;
      const textOpts: unknown = { model, prompt: jsonPrompt, maxOutputTokens: 2500 };
      if (!isReasoningModel(modelName)) textOpts.temperature = 0.1;
      const text = await withTimeout(
        generateText(textOpts),
        timeoutMs,
        `openai enrichProduct generateText JSON-mode (${modelName || 'default'})`
      );
      return parseStructuredJsonResponse(text.text, ProductEnrichmentSchema);
    }
  } catch (err: unknown) {
    console.error(`[engine] enrichProduct primary attempt failed:`, err);
    mark('providerFallbacks');
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON matching the schema.`;
    const textOpts: unknown = { model, prompt: jsonPrompt, maxOutputTokens: 2500 };
    if (!isReasoningModel(modelName)) textOpts.temperature = 0.1;
    const text = await withTimeout(
      generateText(textOpts),
      timeoutMs,
      `openai enrichProduct JSON-fallback generateText (${modelName || 'default'})`
    );
    return parseStructuredJsonResponse(text.text, ProductEnrichmentSchema);
  }
}

/**
 * Generate tag suggestions for a batch of products
 */
export async function suggestTagsBatch(
  provider: ProviderConfig,
  products: EnrichedProduct[],
  existingTags: Array<{ tag_id: string; name: string; type: string }> = [],
  options: EngineOptions = {}
): Promise<BatchTagSuggestion | null> {
  console.log(
    `[engine] suggestTagsBatch start: provider=${provider.provider}, model=${provider.model}, products=${products.length}, timeout=${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}`
  );
  const modelName = provider.model ? String(provider.model).trim() : undefined;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const productsText = products
    .map((p, idx) => {
      return `Product ${idx + 1}:
- Product ID: ${p.supplier_product_id}
- SKU: ${p.supplier_sku}
- Name: ${p.name_from_supplier}
- Brand: ${p.brand || 'Not specified'}
- Supplier: ${p.supplier_name}${p.supplier_code ? ` (${p.supplier_code})` : ''}
- Category: ${p.category_name || 'Uncategorized'}
- Unit of Measure: ${p.uom}
${p.pack_size ? `- Pack Size: ${p.pack_size}` : ''}
${p.barcode ? `- Barcode: ${p.barcode}` : ''}
${p.current_price ? `- Price: ${p.currency || ''} ${p.current_price}` : ''}
${p.attrs_json ? `- Attributes: ${JSON.stringify(p.attrs_json, null, 2)}` : ''}`;
    })
    .join('\n\n');

  const existingTagsList = existingTags.length > 0
    ? `\n\nExisting Tags Available:\n${existingTags.map(t => `- ${t.name} (${t.type}, id: ${t.tag_id})`).join('\n')}`
    : '\n\nNo existing tags available. Create new tag suggestions.';

  const prompt = `You are suggesting tags for ${products.length} products in an inventory management system. Analyze each product and suggest appropriate tags for categorization and filtering.

${productsText}

${existingTagsList}

Task: For EACH product, suggest relevant tags. Consider:
1. Product type and category
2. Seasonal relevance (if applicable)
3. Stock status indicators
4. Brand or supplier characteristics
5. Product attributes and specifications

Tag Types:
- "seasonal": For seasonal products (summer, winter, holiday, etc.)
- "stock": For stock status (preorder, clearance, new, etc.)
- "custom": For general categorization tags
- "auto": For automatically generated tags

Return ONLY valid JSON matching this schema:
{
  "suggestions": [
    {
      "supplier_product_id": "${products[0]?.supplier_product_id || 'uuid'}",
      "supplier_sku": "${products[0]?.supplier_sku || 'sku'}",
      "suggested_tags": [
        {
          "tag_id": "tag-slug",
          "tag_name": "Tag Name",
          "confidence": 0.95,
          "reason": "Why this tag applies",
          "type": "custom"
        }
      ],
      "confidence": 0.9
    },
    ... repeat for all products
  ]
}`;

  const providerKey = provider.provider?.toLowerCase();
  
  if (providerKey === 'anthropic') {
    const anthropic = createAnthropic({
      apiKey: provider.apiKey,
      ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
    });
    const model = anthropic(modelName || 'claude-3-5-sonnet-20241022');
    try {
      // Calculate maxOutputTokens based on batch size
      const estimatedTokensPerProduct = 400;
      const baseOutputTokens = 1000;
      const calculatedMaxOutput = baseOutputTokens + (products.length * estimatedTokensPerProduct);
      const maxOutputTokens = Math.min(calculatedMaxOutput, 8000); // Claude max is typically 4096, but some models support more
      
      const opts: unknown = {
        model,
        schema: BatchTagSuggestionSchema,
        prompt,
        maxOutputTokens,
      };
      if (!isReasoningModel(modelName)) opts.temperature = 0.1;
      mark('schemaUsed');
      const result = await withTimeout(
        generateObject(opts),
        timeoutMs,
        `anthropic batch generateObject (${modelName || 'default'})`
      );
      
      // Check if response was truncated
      if (result.finishReason === 'length') {
        console.warn(
          `[engine] suggestTagsBatch response truncated (finishReason: length) provider=${provider.provider} model=${modelName}. Retrying with higher token limit.`
        );
        throw new Error('Response truncated due to token limit');
      }
      
      console.log(
        `[engine] suggestTagsBatch success (anthropic schema) provider=${provider.provider} model=${modelName} suggestions=${(result.object as BatchTagSuggestion | null)?.suggestions?.length ?? 0}`
      );
      return (result.object as BatchTagSuggestion | null) ?? null;
    } catch (err: unknown) {
      const errorMsg = String(err?.message || '');
      const isTruncationError = errorMsg.includes('truncated') || errorMsg.includes('length');
      
      mark('providerFallbacks');
      const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON matching the schema.${isTruncationError ? ' If you cannot complete all products, return as many as possible with valid JSON.' : ''}`;
      const fallbackMaxTokens = isTruncationError 
        ? Math.min((products.length * 500) + 2000, 8000)
        : 4000;
      const textOpts: unknown = { model, prompt: jsonPrompt, maxOutputTokens: fallbackMaxTokens };
      if (!isReasoningModel(modelName)) textOpts.temperature = 0.1;
      const text = await withTimeout(
        generateText(textOpts),
        timeoutMs,
        `anthropic batch generateText JSON-mode (${modelName || 'default'})`
      );
      
      // Check if fallback also truncated
      if (text.finishReason === 'length') {
        console.warn(
          `[engine] suggestTagsBatch fallback also truncated. Attempting JSON repair.`
        );
      }
      
      const parsed = parseStructuredJsonResponse(text.text, BatchTagSuggestionSchema);
      console.log(
        `[engine] suggestTagsBatch success (anthropic JSON fallback) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
      );
      return parsed;
    }
  }

  // OpenAI or compatible
  const openai = createOpenAI({
    apiKey: provider.apiKey,
    ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
  });
  const model = openai(modelName || 'gpt-4o-mini');
  try {
    // Calculate maxOutputTokens based on batch size (more products = more tokens needed)
    // Estimate: ~300-500 tokens per product suggestion, with safety margin
    const estimatedTokensPerProduct = 400;
    const baseOutputTokens = 1000;
    const calculatedMaxOutput = baseOutputTokens + (products.length * estimatedTokensPerProduct);
    // Cap at reasonable limits: 8000 for most models, 16000 for larger models
    const maxOutputTokens = Math.min(
      calculatedMaxOutput,
      modelName?.includes('gpt-4') || modelName?.includes('o1') ? 16000 : 8000
    );

    if (supportsJsonSchema(modelName)) {
      const opts: unknown = {
        model,
        schema: BatchTagSuggestionSchema,
        prompt,
        maxOutputTokens,
      };
      if (!isReasoningModel(modelName)) opts.temperature = 0.1;
      mark('schemaUsed');
      const result = await withTimeout(
        generateObject(opts),
        timeoutMs,
        `openai batch generateObject (${modelName})`
      );
      
      // Check if response was truncated
      if (result.finishReason === 'length') {
        console.warn(
          `[engine] suggestTagsBatch response truncated (finishReason: length) provider=${provider.provider} model=${modelName}. Retrying with smaller batch or higher token limit.`
        );
        throw new Error('Response truncated due to token limit');
      }
      
      console.log(
        `[engine] suggestTagsBatch success (openai schema) provider=${provider.provider} model=${modelName} suggestions=${(result.object as BatchTagSuggestion | null)?.suggestions?.length ?? 0}`
      );
      return (result.object as BatchTagSuggestion | null) ?? null;
    } else {
      mark('jsonModeUsed');
      const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON matching the schema.`;
      const textOpts: unknown = { model, prompt: jsonPrompt, maxOutputTokens };
      if (!isReasoningModel(modelName)) textOpts.temperature = 0.1;
      const text = await withTimeout(
        generateText(textOpts),
        timeoutMs,
        `openai batch generateText JSON-mode (${modelName || 'default'})`
      );
      
      // Check if response was truncated
      if (text.finishReason === 'length') {
        console.warn(
          `[engine] suggestTagsBatch response truncated (finishReason: length) provider=${provider.provider} model=${modelName}. Attempting JSON repair.`
        );
        // Try to repair truncated JSON
        const repaired = parseStructuredJsonResponse(text.text, BatchTagSuggestionSchema);
        if (repaired) {
          console.log(
            `[engine] suggestTagsBatch success (openai JSON-mode, repaired) provider=${provider.provider} model=${modelName} suggestions=${repaired?.suggestions?.length ?? 0}`
          );
          return repaired;
        }
        throw new Error('Response truncated and could not be repaired');
      }
      
      const parsed = parseStructuredJsonResponse(text.text, BatchTagSuggestionSchema);
      console.log(
        `[engine] suggestTagsBatch success (openai JSON-mode) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
      );
      return parsed;
    }
  } catch (err: unknown) {
    const errorMsg = String(err?.message || '');
    const isTruncationError = errorMsg.includes('truncated') || errorMsg.includes('length');
    
    console.error(
      `[engine] suggestTagsBatch primary attempt failed provider=${provider.provider} model=${modelName}:`,
      err
    );
    
    // If truncated, try with even higher token limit or return partial results
    if (isTruncationError) {
      console.warn(
        `[engine] suggestTagsBatch truncation detected. Attempting fallback with higher token limit.`
      );
      mark('providerFallbacks');
      const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON matching the schema. If you cannot complete all products, return as many as possible with valid JSON.`;
      const fallbackMaxTokens = Math.min(
        (products.length * 500) + 2000,
        modelName?.includes('gpt-4') || modelName?.includes('o1') ? 16000 : 8000
      );
      const textOpts: unknown = { model, prompt: jsonPrompt, maxOutputTokens: fallbackMaxTokens };
      if (!isReasoningModel(modelName)) textOpts.temperature = 0.1;
      try {
        const text = await withTimeout(
          generateText(textOpts),
          timeoutMs,
          `openai batch JSON-fallback generateText (${modelName || 'default'})`
        );
        const parsed = parseStructuredJsonResponse(text.text, BatchTagSuggestionSchema);
        if (parsed) {
          console.log(
            `[engine] suggestTagsBatch success (openai fallback, partial) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
          );
          return parsed;
        }
      } catch (fallbackErr) {
        console.error(`[engine] suggestTagsBatch fallback also failed:`, fallbackErr);
      }
    } else {
      mark('providerFallbacks');
      const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON matching the schema.`;
      const textOpts: unknown = { model, prompt: jsonPrompt, maxOutputTokens: 4000 };
      if (!isReasoningModel(modelName)) textOpts.temperature = 0.1;
      const text = await withTimeout(
        generateText(textOpts),
        timeoutMs,
        `openai batch JSON-fallback generateText (${modelName || 'default'})`
      );
      const parsed = parseStructuredJsonResponse(text.text, BatchTagSuggestionSchema);
      console.log(
        `[engine] suggestTagsBatch success (openai fallback) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
      );
      return parsed;
    }
    
    // If all else fails, return null
    return null;
  }
}

