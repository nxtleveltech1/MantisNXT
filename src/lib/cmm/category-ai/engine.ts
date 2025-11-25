// @ts-nocheck

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject, generateText } from 'ai';
import type { EnrichedProduct, CategoryHierarchy } from '@/lib/cmm/sip-product-enrichment';
import { extractSpecifications } from '@/lib/cmm/sip-product-enrichment';
import {
  BatchCategorySuggestionSchema,
  CategorySuggestionSchema,
  parseStructuredJsonResponse,
  type BatchSuggestion,
  type SingleSuggestion,
} from './parser';
import { isReasoningModel, supportsJsonSchema } from './fallback';
import type { ProviderConfig } from './resolver';
import { mark } from './metrics';
import { CLIProviderClient, CLIProviderExecutor } from '@/lib/ai/cli-provider';

const DEFAULT_TIMEOUT_MS = 3000; // 3s default for fast responses with parallel processing
const CLI_NOT_FOUND_PATTERNS = ['ENOENT', 'not found', 'not recognized', 'No such file or directory'];
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

const hasValidApiKey = (provider: ProviderConfig): boolean => {
  const key = provider?.apiKey;
  return typeof key === 'string' && key.trim().length > 0 && key !== 'dummy';
};

const resolveCliCommand = (provider: ProviderConfig, providerKey?: string): string | undefined => {
  if (provider?.cliCommand) return provider.cliCommand;
  if (providerKey === 'google') return 'gemini';
  if (providerKey === 'openai') return 'codex';
  return undefined;
};

const sanitizeModelName = (modelName?: string | null): string | undefined => {
  if (!modelName) return undefined;
  return String(modelName)
    .trim()
    .replace(/\s+(medium|high|low|fast|slow)$/i, '')
    .replace(/\(medium\)|\(high\)|\(low\)/gi, '')
    .trim();
};

const cliModelName = (modelName?: string | null): string =>
  sanitizeModelName(modelName) || 'gpt-5.1-codex-max';

const isCliMissingError = (message: string): boolean =>
  CLI_NOT_FOUND_PATTERNS.some(marker => message.toLowerCase().includes(marker.toLowerCase()));

const shouldUseResponsesApi = (provider: ProviderConfig): boolean => {
  if (provider.forceResponsesApi === true) return true;
  if (provider.useChatCompletions === true) return false;
  const providerKey = provider.provider?.toLowerCase() ?? '';
  if (providerKey.includes('compatible') || providerKey.includes('azure')) {
    return false;
  }
  const base = provider.baseUrl?.toLowerCase();
  if (base && !base.includes('api.openai.com')) {
    return false;
  }
  return true;
};

const buildChatCompletionsUrl = (provider: ProviderConfig): string => {
  const base = (provider.baseUrl || OPENAI_BASE_URL).replace(/\/$/, '');
  return `${base}/chat/completions`;
};

type ChatCompletionOptions = {
  prompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  systemPrompt?: string;
};

async function callChatCompletions(
  provider: ProviderConfig,
  options: ChatCompletionOptions
): Promise<string> {
  const url = buildChatCompletionsUrl(provider);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider.apiKey) {
    const lower = url.toLowerCase();
    if (lower.includes('azure.com')) {
      headers['api-key'] = provider.apiKey;
    } else {
      headers.Authorization = `Bearer ${provider.apiKey}`;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const body = {
      model: options.model,
      messages: [
        {
          role: 'system',
          content:
            options.systemPrompt ||
            'You are an expert inventory categorization assistant that strictly returns JSON.',
        },
        { role: 'user', content: options.prompt },
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Chat completion failed (${response.status} ${response.statusText}) ${responseText.slice(0, 500)}`
      );
    }
    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content;
    if (!message) {
      throw new Error('Chat completion response missing content');
    }
    if (Array.isArray(message)) {
      return message
        .map(part => {
          if (typeof part === 'string') return part;
          if (part?.type === 'text' && typeof part.text === 'string') return part.text;
          return '';
        })
        .join('')
        .trim();
    }
    return typeof message === 'string' ? message : JSON.stringify(message);
  } finally {
    clearTimeout(timer);
  }
}

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
): Promise<BatchSuggestion | null> {
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
  const providerHasApiKey = hasValidApiKey(provider);
  const useResponsesApi = shouldUseResponsesApi(provider);

  if (provider.useCLI) {
    const cliCommand = resolveCliCommand(provider, providerKey);
    if (!cliCommand) {
      throw new Error(
        'CLI mode is enabled but no CLI command specified. Please configure cliCommand in provider settings.'
      );
    }

    const cliCheck = await CLIProviderExecutor.checkCLIInstalled(cliCommand);
    if (!cliCheck.installed) {
      const installationHint =
        cliCommand === 'codex'
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
      const cliClient = new CLIProviderClient({
        provider: providerKey as any,
        command: cliCommand,
        args: provider.cliArgs,
        env: {
          ...(provider.apiKey && providerKey === 'openai' && { OPENAI_API_KEY: provider.apiKey }),
          ...(provider.apiKey && providerKey === 'google' && { GEMINI_API_KEY: provider.apiKey }),
        },
        workingDirectory: provider.cliWorkingDirectory,
        timeout: timeoutMs,
      });

      const cliModel = cliModelName(provider.model);
      const result = await withTimeout(
        cliClient.generateText(prompt, { model: cliModelName(provider.model) }),
        timeoutMs,
        `cli batch generateText (${cliModel})`
      );
      const parsed = parseStructuredJsonResponse(result, BatchCategorySuggestionSchema);
      return parsed;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[engine] CLI runProviderBatch failed:', err);
      if (isCliMissingError(errorMessage)) {
        throw new Error(
          `CLI command '${cliCommand}' not found or not available. Please install it or disable CLI mode and use API mode with an API key.`
        );
      }

      mark('providerFallbacks');
      if (providerHasApiKey) {
        console.warn(
          `[engine] CLI execution failed (${errorMessage}), falling back to API mode with provided API key`
        );
      } else {
        throw new Error(
          `CLI execution failed: ${errorMessage}. CLI mode is enabled but execution failed and no valid API key is provided for fallback. Please check CLI installation and authentication, or provide an API key for fallback.`
        );
      }
    }
  }

  if (providerKey === 'anthropic') {
    const anthropic = createAnthropic({
      apiKey: provider.apiKey,
      ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
    });
    const model = anthropic(modelName || 'claude-3-5-sonnet-20241022');
    try {
      const opts: unknown = {
        model,
        schema: BatchCategorySuggestionSchema,
        prompt,
        maxOutputTokens: 1500,
      };
      if (!isReasoningModel(modelName)) opts.temperature = 0.1;
      mark('schemaUsed');
      const result = await withTimeout(
        generateObject(opts),
        timeoutMs,
        `anthropic batch generateObject (${modelName || 'default'})`
      );
      console.log(
        `[engine] runProviderBatch success (anthropic schema) provider=${provider.provider} model=${modelName} suggestions=${(result.object as BatchSuggestion | null)?.suggestions?.length ?? 0}`
      );
      return (result.object as BatchSuggestion | null) ?? null;
    } catch (err: unknown) {
      // JSON-mode fallback
      mark('providerFallbacks');
      const jsonPrompt = `${prompt}

IMPORTANT: Respond with ONLY valid JSON matching the schema.`;
      const textOpts: unknown = { model, prompt: jsonPrompt, maxOutputTokens: 2000 };
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
  // Skip if no API key and not CLI mode (or CLI already failed)
  if (!providerHasApiKey) {
    throw new Error(
      'API key is required for OpenAI API mode. ' +
      (provider.useCLI 
        ? 'CLI mode failed or CLI command not found. Please provide a valid API key or fix CLI installation.'
        : 'Please provide an API key or enable CLI mode.')
    );
  }

  if (!useResponsesApi) {
    const compatText = await callChatCompletions(provider, {
      prompt,
      model: modelName || 'gpt-4o-mini',
      temperature: isReasoningModel(modelName) ? 0.2 : 0.1,
      maxTokens: 2000,
      timeoutMs,
    });
    const parsed = parseStructuredJsonResponse(compatText, BatchCategorySuggestionSchema);
    console.log(
      `[engine] runProviderBatch success (compat chat) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
    );
    return parsed;
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
        schema: BatchCategorySuggestionSchema,
        prompt,
        maxOutputTokens: 1500,
      };
      if (!isReasoningModel(modelName)) opts.temperature = 0.1;
      mark('schemaUsed');
      const result = await withTimeout(
        generateObject(opts),
        timeoutMs,
        `openai batch generateObject (${modelName})`
      );
      console.log(
        `[engine] runProviderBatch success (openai schema) provider=${provider.provider} model=${modelName} suggestions=${(result.object as BatchSuggestion | null)?.suggestions?.length ?? 0}`
      );
      return (result.object as BatchSuggestion | null) ?? null;
    } else {
      // Direct JSON-mode
      mark('jsonModeUsed');
      const jsonPrompt = `${prompt}

IMPORTANT: Respond with ONLY valid JSON matching the schema.`;
      const textOpts: unknown = { model, prompt: jsonPrompt, maxOutputTokens: 2000 };
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
  } catch (err: unknown) {
    console.error(
      `[engine] runProviderBatch primary attempt failed provider=${provider.provider} model=${modelName}:`,
      err
    );
    // Fallback path for OpenAI
    mark('providerFallbacks');
    const jsonPrompt = `${prompt}

IMPORTANT: Respond with ONLY valid JSON matching the schema.`;
    const textOpts: unknown = { model, prompt: jsonPrompt, maxOutputTokens: 2000 };
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
): Promise<SingleSuggestion | null> {
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
  const providerHasApiKey = hasValidApiKey(provider);

  // Check if CLI mode is enabled - try CLI first
  if (provider.useCLI) {
    const cliCommand = resolveCliCommand(provider, providerKey);

    if (!cliCommand) {
      throw new Error(
        'CLI mode is enabled but no CLI command specified. Please configure cliCommand in provider settings.'
      );
    }

    // Check if CLI command exists before trying to use it
    const cliCheck = await CLIProviderExecutor.checkCLIInstalled(cliCommand);
    if (!cliCheck.installed) {
      const installationHint =
        cliCommand === 'codex'
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
      const cliClient = new CLIProviderClient({
        provider: providerKey as any,
        command: cliCommand,
        args: provider.cliArgs,
        env: {
          ...(provider.apiKey && providerKey === 'openai' && { OPENAI_API_KEY: provider.apiKey }),
          ...(provider.apiKey && providerKey === 'google' && { GEMINI_API_KEY: provider.apiKey }),
        },
        workingDirectory: provider.cliWorkingDirectory,
        timeout: timeoutMs,
      });

      const cleanedModelName = cliModelName(provider.model || modelName);
      const result = await withTimeout(
        cliClient.generateText(prompt, { model: cleanedModelName }),
        timeoutMs,
        `cli single generateText (${cleanedModelName || 'default'})`
      );

      const parsed = parseStructuredJsonResponse(result, CategorySuggestionSchema);
      return parsed;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[engine] CLI runProviderSingle failed:`, err);

      // If CLI command doesn't exist or not found, don't fall back to API mode
      if (isCliMissingError(errorMessage)) {
        throw new Error(
          `CLI command '${cliCommand}' not found or not available. Please install it or disable CLI mode and use API mode with an API key.`
        );
      }

      // Only fall through to API mode if CLI execution fails BUT valid API key exists
      mark('providerFallbacks');

      if (providerHasApiKey) {
        console.warn(
          `[engine] CLI execution failed (${errorMessage}), falling back to API mode with provided API key`
        );
        // Continue to API mode below
      } else {
        // CLI failed and no valid API key - throw error
        throw new Error(
          `CLI execution failed: ${errorMessage}. ` +
            `CLI mode is enabled but execution failed and no valid API key is provided for fallback. ` +
            `Please check CLI installation and authentication, or provide an API key for fallback.`
        );
      }
    }
  }

  if (providerKey === 'anthropic') {
    // Skip if no API key and CLI mode already failed
    if (!providerHasApiKey) {
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
        schema: CategorySuggestionSchema,
        prompt,
        maxOutputTokens: 800,
      };
      if (!isReasoningModel(modelName)) opts.temperature = 0.1;
      mark('schemaUsed');
      const result = await withTimeout(
        generateObject(opts),
        timeoutMs,
        `anthropic single generateObject (${modelName || 'default'})`
      );
      return (result.object as SingleSuggestion | null) ?? null;
    } catch {
      mark('providerFallbacks');
      const text = await withTimeout(
        generateText({ model, prompt, maxOutputTokens: 1200 }),
        timeoutMs,
        `anthropic single generateText JSON-mode (${modelName || 'default'})`
      );
      return parseStructuredJsonResponse(text.text, CategorySuggestionSchema);
    }
  }

  // OpenAI or compatible
  // Skip if no API key and not CLI mode (or CLI already failed)
  if (!providerHasApiKey) {
    throw new Error(
      'API key is required for OpenAI API mode. ' +
      (provider.useCLI 
        ? 'CLI mode failed or CLI command not found. Please provide a valid API key or fix CLI installation.'
        : 'Please provide an API key or enable CLI mode.')
    );
  }

  if (!useResponsesApi) {
    const compatText = await callChatCompletions(provider, {
      prompt,
      model: modelName || 'gpt-4o-mini',
      temperature: isReasoningModel(modelName) ? 0.2 : 0.1,
      maxTokens: 1200,
      timeoutMs,
    });
    return parseStructuredJsonResponse(compatText, CategorySuggestionSchema);
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
        schema: CategorySuggestionSchema,
        prompt,
        maxOutputTokens: 800,
      };
      if (!isReasoningModel(modelName)) opts.temperature = 0.1;
      mark('schemaUsed');
      const result = await withTimeout(
        generateObject(opts),
        timeoutMs,
        `openai single generateObject (${modelName})`
      );
      return (result.object as SingleSuggestion | null) ?? null;
    } else {
      mark('jsonModeUsed');
      const text = await withTimeout(
        generateText({ model, prompt, maxOutputTokens: 1200 }),
        timeoutMs,
        `openai single generateText JSON-mode (${modelName || 'default'})`
      );
      return parseStructuredJsonResponse(text.text, CategorySuggestionSchema);
    }
  } catch {
    mark('providerFallbacks');
    const text = await withTimeout(
      generateText({ model, prompt, maxOutputTokens: 1200 }),
      timeoutMs,
      `openai single JSON-fallback generateText (${modelName || 'default'})`
    );
    return parseStructuredJsonResponse(text.text, CategorySuggestionSchema);
  }
}
