import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject, generateText } from 'ai';
import type { EnrichedProduct, CategoryHierarchy } from '@/lib/cmm/sip-product-enrichment';
import { extractSpecifications } from '@/lib/cmm/sip-product-enrichment';
import {
  BatchCategorySuggestionSchema,
  CategorySuggestionSchema,
  parseStructuredJsonResponse,
} from './parser';
import { isReasoningModel, supportsJsonSchema } from './fallback';
import type { ProviderConfig } from './resolver';
import { mark } from './metrics';

const DEFAULT_TIMEOUT_MS = 3000; // 3s default for fast responses with parallel processing

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
};

export async function runProviderBatch(
  provider: ProviderConfig,
  products: EnrichedProduct[],
  categories: CategoryHierarchy[],
  options: EngineOptions = {}
): Promise<z.infer<typeof BatchCategorySuggestionSchema> | null> {
  console.log(
    `[engine] runProviderBatch start: provider=${provider.provider}, model=${provider.model}, products=${products.length}, timeout=${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}`
  );
  const modelName = provider.model ? String(provider.model).trim() : undefined;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const productsText = products
    .map((p, idx) => {
      const specs = extractSpecifications(p.attrs_json);
      return `Product ${idx + 1}:
- Product ID: ${p.supplier_product_id}
- SKU: ${p.supplier_sku}
- Name: ${p.name_from_supplier}
- Brand: ${p.brand || 'Not specified'}
- Supplier: ${p.supplier_name}${p.supplier_code ? ` (${p.supplier_code})` : ''}
- Supplier's Suggested Category: ${p.category_raw || 'None'}
- Current Category: ${p.category_name || 'Uncategorized'}
- Unit of Measure: ${p.uom}
${p.pack_size ? `- Pack Size: ${p.pack_size}` : ''}
${p.barcode ? `- Barcode: ${p.barcode}` : ''}
${p.current_price ? `- Price: ${p.currency || ''} ${p.current_price}` : ''}
${p.qty_on_hand !== null ? `- Stock on Hand: ${p.qty_on_hand}` : ''}
${specs.length > 0 ? `- Specifications:\n${specs.map(s => `  • ${s}`).join('\n')}` : ''}`;
    })
    .join('\n\n');

  const prompt = `You are categorizing ${products.length} products for an inventory management system. Analyze each product and suggest the most appropriate category from the available categories list.

${productsText}

Available Categories (hierarchical):
${categories
  .map(
    c =>
      `- ${c.category_id}: ${c.name} (Path: ${c.path}, Level: ${c.level}${c.parent_id ? `, Parent: ${c.parent_id}` : ''})`
  )
  .join('\n')}

Task: For EACH product, suggest the most appropriate category. Consider:
1. Product description and name
2. Brand positioning and typical product lines
3. Supplier's suggested category (if provided)
4. Existing category structure and hierarchy
5. Product specifications and attributes
6. Similar products that might be in the same category

Important:
- Return suggestions for ALL ${products.length} products
- If a suitable category exists in the list, return its exact category_id (UUID)
- If NO suitable category exists, set \`suggested_category_id\` to null and provide \`proposed_category_name\` with your recommended label
- Provide a confidence score between 0 and 1 (where 1.0 is completely certain)
- Include a brief reasoning explanation
- If multiple categories could fit, list up to 3 alternatives with their confidence scores

Return ONLY valid JSON matching this schema:
{
  "suggestions": [
    {
      "product_id": "${products[0].supplier_product_id}",
      "supplier_product_id": "${products[0].supplier_product_id}",
      "supplier_sku": "${products[0].supplier_sku}",
      "suggested_category_id": "uuid-here or null",
      "proposed_category_name": "string (required when suggested_category_id is null)",
      "confidence": 0.95,
      "reasoning": "Brief explanation",
      "alternatives": [{"category_id": "uuid", "confidence": 0.85, "reasoning": "text"}]
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
      const opts: any = { model, schema: BatchCategorySuggestionSchema, prompt, maxTokens: 1500 };
      if (!isReasoningModel(modelName)) opts.temperature = 0.1;
      mark('schemaUsed');
      const result = await withTimeout(
        generateObject(opts),
        timeoutMs,
        `anthropic batch generateObject (${modelName || 'default'})`
      );
      console.log(
        `[engine] runProviderBatch success (anthropic schema) provider=${provider.provider} model=${modelName} suggestions=${result.object?.suggestions?.length ?? 0}`
      );
      return result.object;
    } catch (err: any) {
      // JSON-mode fallback
      mark('providerFallbacks');
      const jsonPrompt = `${prompt}

IMPORTANT: Respond with ONLY valid JSON matching the schema.`;
      const textOpts: any = { model, prompt: jsonPrompt, maxTokens: 2000 };
      if (!isReasoningModel(modelName)) textOpts.temperature = 0.1;
      const text = await withTimeout(
        generateText(textOpts),
        timeoutMs,
        `anthropic batch generateText JSON-mode (${modelName || 'default'})`
      );
      const parsed = parseStructuredJsonResponse(text.text, BatchCategorySuggestionSchema);
      console.log(
        `[engine] runProviderBatch success (anthropic JSON fallback) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
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
    if (supportsJsonSchema(modelName)) {
      const opts: any = { model, schema: BatchCategorySuggestionSchema, prompt, maxTokens: 1500 };
      if (!isReasoningModel(modelName)) opts.temperature = 0.1;
      mark('schemaUsed');
      const result = await withTimeout(
        generateObject(opts),
        timeoutMs,
        `openai batch generateObject (${modelName})`
      );
      console.log(
        `[engine] runProviderBatch success (openai schema) provider=${provider.provider} model=${modelName} suggestions=${result.object?.suggestions?.length ?? 0}`
      );
      return result.object;
    } else {
      // Direct JSON-mode
      mark('jsonModeUsed');
      const jsonPrompt = `${prompt}

IMPORTANT: Respond with ONLY valid JSON matching the schema.`;
      const textOpts: any = { model, prompt: jsonPrompt, maxTokens: 2000 };
      if (!isReasoningModel(modelName)) textOpts.temperature = 0.1;
      const text = await withTimeout(
        generateText(textOpts),
        timeoutMs,
        `openai batch generateText JSON-mode (${modelName || 'default'})`
      );
      const parsed = parseStructuredJsonResponse(text.text, BatchCategorySuggestionSchema);
      console.log(
        `[engine] runProviderBatch success (openai JSON-mode) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
      );
      return parsed;
    }
  } catch (err: any) {
    console.error(
      `[engine] runProviderBatch primary attempt failed provider=${provider.provider} model=${modelName}:`,
      err
    );
    // Fallback path for OpenAI
    mark('providerFallbacks');
    const jsonPrompt = `${prompt}

IMPORTANT: Respond with ONLY valid JSON matching the schema.`;
    const textOpts: any = { model, prompt: jsonPrompt, maxTokens: 2000 };
    if (!isReasoningModel(modelName)) textOpts.temperature = 0.1;
    const text = await withTimeout(
      generateText(textOpts),
      timeoutMs,
      `openai batch JSON-fallback generateText (${modelName || 'default'})`
    );
    const parsed = parseStructuredJsonResponse(text.text, BatchCategorySuggestionSchema);
    console.log(
      `[engine] runProviderBatch success (openai fallback) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
    );
    return parsed;
  }
}

export async function runProviderSingle(
  provider: ProviderConfig,
  product: EnrichedProduct,
  categories: CategoryHierarchy[],
  options: EngineOptions = {}
): Promise<z.infer<typeof CategorySuggestionSchema> | null> {
  const modelName = provider.model ? String(provider.model).trim() : undefined;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const specs = extractSpecifications(product.attrs_json);

  const prompt = `You are categorizing products for an inventory management system. Analyze the product information and suggest the most appropriate category from the available categories list.

Product Details:
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
${specs.length > 0 ? `- Specifications:\n${specs.map(s => `  • ${s}`).join('\n')}` : ''}
${product.attrs_json ? `- Additional Attributes: ${JSON.stringify(product.attrs_json, null, 2)}` : ''}

Available Categories (hierarchical):
${categories
  .map(
    c =>
      `- ${c.category_id}: ${c.name} (Path: ${c.path}, Level: ${c.level}${c.parent_id ? `, Parent: ${c.parent_id}` : ''})`
  )
  .join('\n')}

Task: Suggest the most appropriate category. Return ONLY valid JSON:
{
  "suggested_category_id": "uuid-here or null",
  "proposed_category_name": "string (required when suggested_category_id is null)",
  "confidence": 0.95,
  "reasoning": "Brief explanation",
  "alternatives": [{"category_id": "uuid", "confidence": 0.85, "reasoning": "text"}]
}`;

  const providerKey = provider.provider?.toLowerCase();
  if (providerKey === 'anthropic') {
    const anthropic = createAnthropic({
      apiKey: provider.apiKey,
      ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
    });
    const model = anthropic(modelName || 'claude-3-5-sonnet-20241022');
    try {
      const opts: any = { model, schema: CategorySuggestionSchema, prompt, maxTokens: 800 };
      if (!isReasoningModel(modelName)) opts.temperature = 0.1;
      mark('schemaUsed');
      const result = await withTimeout(
        generateObject(opts),
        timeoutMs,
        `anthropic single generateObject (${modelName || 'default'})`
      );
      return result.object;
    } catch {
      mark('providerFallbacks');
      const text = await withTimeout(
        generateText({ model, prompt, maxTokens: 1200 }),
        timeoutMs,
        `anthropic single generateText JSON-mode (${modelName || 'default'})`
      );
      return parseStructuredJsonResponse(text.text, CategorySuggestionSchema);
    }
  }

  const openai = createOpenAI({
    apiKey: provider.apiKey,
    ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
  });
  const model = openai(modelName || 'gpt-4o-mini');
  try {
    if (supportsJsonSchema(modelName)) {
      const opts: any = { model, schema: CategorySuggestionSchema, prompt, maxTokens: 800 };
      if (!isReasoningModel(modelName)) opts.temperature = 0.1;
      mark('schemaUsed');
      const result = await withTimeout(
        generateObject(opts),
        timeoutMs,
        `openai single generateObject (${modelName})`
      );
      return result.object;
    } else {
      mark('jsonModeUsed');
      const text = await withTimeout(
        generateText({ model, prompt, maxTokens: 1200 }),
        timeoutMs,
        `openai single generateText JSON-mode (${modelName || 'default'})`
      );
      return parseStructuredJsonResponse(text.text, CategorySuggestionSchema);
    }
  } catch {
    mark('providerFallbacks');
    const text = await withTimeout(
      generateText({ model, prompt, maxTokens: 1200 }),
      timeoutMs,
      `openai single JSON-fallback generateText (${modelName || 'default'})`
    );
    return parseStructuredJsonResponse(text.text, CategorySuggestionSchema);
  }
}
