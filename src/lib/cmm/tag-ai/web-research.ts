// @ts-nocheck

import type { WebResearchResult } from './parser';
import { mark } from './metrics';

// Simple in-memory cache (in production, use Redis or similar)
const researchCache = new Map<string, { data: WebResearchResult[]; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type WebResearchOptions = {
  provider?: 'google_custom_search' | 'serpapi' | 'tavily' | 'serper' | 'brave' | 'exa' | 'manual';
  apiKey?: string; // Provider-specific API key (from providerInstances)
  apiUrl?: string; // For Google Custom Search, this is the Engine ID
  cacheEnabled?: boolean;
  maxResults?: number;
};

/**
 * Perform web research for a product based on SKU and description
 */
export async function researchProduct(
  sku: string,
  productName: string,
  description?: string,
  options: WebResearchOptions = {}
): Promise<WebResearchResult[]> {
  const cacheKey = `${sku}:${productName}`.toLowerCase();

  // Check cache
  if (options.cacheEnabled !== false) {
    const cached = researchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      mark('webResearchCacheHits');
      return cached.data;
    }
  }

  mark('webResearchCalls');

  // Determine provider: use configured one, or check available API keys
  // Prioritize options.provider if it's a valid provider name (not 'manual', 'undefined', or empty)
  let provider =
    options.provider && options.provider !== 'manual' && options.provider.trim().length > 0
      ? options.provider
      : undefined;

  if (!provider) {
    // If options.apiKey is provided, try to infer provider from it (but this is less reliable)
    // Otherwise, auto-detect based on available API keys (priority: tavily > serper > brave > exa > google > serpapi)
    if (options.apiKey) {
      // If API key is provided but no provider specified, we can't reliably determine provider
      // Log a warning and try environment variables
      console.warn(
        `[web-research] API key provided but provider not specified, attempting auto-detection from environment variables`
      );
    }

    if (process.env.TAVILY_API_KEY || options.apiKey)
      provider = 'tavily'; // Default to tavily if API key provided
    else if (process.env.SERPER_API_KEY) provider = 'serper';
    else if (process.env.BRAVE_API_KEY) provider = 'brave';
    else if (process.env.EXA_API_KEY) provider = 'exa';
    else if (process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID)
      provider = 'google_custom_search';
    else if (process.env.SERPAPI_KEY) provider = 'serpapi';
    else provider = 'manual';
  }

  // Validate provider is supported
  const supportedProviders = [
    'tavily',
    'serper',
    'brave',
    'exa',
    'google_custom_search',
    'serpapi',
  ];
  if (provider && !supportedProviders.includes(provider)) {
    console.warn(`[web-research] Unsupported provider "${provider}", falling back to manual mode`);
    provider = 'manual';
  }

  const searchQuery = `${productName} ${sku} ${description || ''}`.trim();

  try {
    let results: WebResearchResult[] = [];

    if (provider === 'tavily') {
      results = await researchWithTavily(searchQuery, options);
    } else if (provider === 'serper') {
      results = await researchWithSerper(searchQuery, options);
    } else if (provider === 'brave') {
      results = await researchWithBrave(searchQuery, options);
    } else if (provider === 'exa') {
      results = await researchWithExa(searchQuery, options);
    } else if (provider === 'google_custom_search') {
      results = await researchWithGoogleCustomSearch(searchQuery, options);
    } else if (provider === 'serpapi') {
      results = await researchWithSerpAPI(searchQuery, options);
    } else {
      // Manual/fallback - return empty results
      console.warn(
        `[web-research] Provider "${provider}" not supported or manual mode, returning empty results`
      );
      return [];
    }

    // Cache results
    if (options.cacheEnabled !== false && results.length > 0) {
      researchCache.set(cacheKey, { data: results, timestamp: Date.now() });
    }

    return results;
  } catch (error) {
    console.error('[web-research] Error researching product:', error);
    return [];
  }
}

/**
 * Research using Google Custom Search API
 */
async function researchWithGoogleCustomSearch(
  query: string,
  options: WebResearchOptions
): Promise<WebResearchResult[]> {
  const apiKey = options.apiKey || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  // apiUrl contains the Engine ID when passed from providerInstances
  const searchEngineId = options.apiUrl || process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    console.warn('[web-research] Google Custom Search API key or Engine ID not configured');
    return [];
  }

  const maxResults = options.maxResults || 5;
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${maxResults}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Custom Search API error: ${response.statusText}`);
    }

    const data = await response.json();
    const results: WebResearchResult[] = (data.items || []).map((item: any) => ({
      source: 'google_custom_search',
      title: item.title,
      description: item.snippet,
      url: item.link,
      extracted_data: {
        displayLink: item.displayLink,
        formattedUrl: item.formattedUrl,
      },
      confidence: 0.8, // Default confidence for web results
    }));

    return results;
  } catch (error) {
    console.error('[web-research] Google Custom Search error:', error);
    return [];
  }
}

/**
 * Research using SerpAPI
 */
async function researchWithSerpAPI(
  query: string,
  options: WebResearchOptions
): Promise<WebResearchResult[]> {
  const apiKey = options.apiKey || process.env.SERPAPI_KEY;

  if (!apiKey) {
    console.warn('[web-research] SerpAPI key not configured');
    return [];
  }

  const maxResults = options.maxResults || 5;
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=${maxResults}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.statusText}`);
    }

    const data = await response.json();
    const results: WebResearchResult[] = (data.organic_results || []).map((item: any) => ({
      source: 'serpapi',
      title: item.title,
      description: item.snippet,
      url: item.link,
      extracted_data: {
        position: item.position,
        date: item.date,
      },
      confidence: 0.8,
    }));

    return results;
  } catch (error) {
    console.error('[web-research] SerpAPI error:', error);
    return [];
  }
}

/**
 * Research using Tavily API
 */
async function researchWithTavily(
  query: string,
  options: WebResearchOptions
): Promise<WebResearchResult[]> {
  // Prefer API key from options (from providerInstances), fall back to env var
  const apiKey = options.apiKey || process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.warn('[web-research] Tavily API key not configured');
    return [];
  }

  const maxResults = options.maxResults || 5;
  const url = 'https://api.tavily.com/search';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: 'basic',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const results: WebResearchResult[] = (data.results || []).map((item: any) => ({
      source: 'tavily',
      title: item.title,
      description: item.content,
      url: item.url,
      extracted_data: {
        score: item.score,
        raw_content: item.raw_content,
      },
      confidence: item.score || 0.8,
    }));

    return results;
  } catch (error) {
    console.error('[web-research] Tavily error:', error);
    return [];
  }
}

/**
 * Research using Serper API
 */
async function researchWithSerper(
  query: string,
  options: WebResearchOptions
): Promise<WebResearchResult[]> {
  // Prefer API key from options (from providerInstances), fall back to env var
  const apiKey = options.apiKey || process.env.SERPER_API_KEY;

  if (!apiKey) {
    console.warn('[web-research] Serper API key not configured');
    return [];
  }

  const maxResults = options.maxResults || 5;
  const url = 'https://google.serper.dev/search';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: maxResults,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Serper API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const results: WebResearchResult[] = (data.organic || []).map((item: any) => ({
      source: 'serper',
      title: item.title,
      description: item.snippet,
      url: item.link,
      extracted_data: {
        position: item.position,
        date: item.date,
      },
      confidence: 0.8,
    }));

    return results;
  } catch (error) {
    console.error('[web-research] Serper error:', error);
    return [];
  }
}

/**
 * Research using Brave Search API
 */
async function researchWithBrave(
  query: string,
  options: WebResearchOptions
): Promise<WebResearchResult[]> {
  // Prefer API key from options (from providerInstances), fall back to env var
  const apiKey = options.apiKey || process.env.BRAVE_API_KEY;

  if (!apiKey) {
    console.warn('[web-research] Brave API key not configured');
    return [];
  }

  const maxResults = options.maxResults || 5;
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-Subscription-Token': apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brave API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const results: WebResearchResult[] = (data.web?.results || []).map((item: any) => ({
      source: 'brave',
      title: item.title,
      description: item.description,
      url: item.url,
      extracted_data: {
        age: item.age,
        language: item.language,
      },
      confidence: 0.8,
    }));

    return results;
  } catch (error) {
    console.error('[web-research] Brave error:', error);
    return [];
  }
}

/**
 * Research using Exa Search API
 */
async function researchWithExa(
  query: string,
  options: WebResearchOptions
): Promise<WebResearchResult[]> {
  // Prefer API key from options (from providerInstances), fall back to env var
  const apiKey = options.apiKey || process.env.EXA_API_KEY;

  if (!apiKey) {
    console.warn('[web-research] Exa API key not configured');
    return [];
  }

  const maxResults = options.maxResults || 5;
  const url = 'https://api.exa.ai/search';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        num_results: maxResults,
        type: 'neural',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Exa API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const results: WebResearchResult[] = (data.results || []).map((item: any) => ({
      source: 'exa',
      title: item.title,
      description: item.text || item.highlight,
      url: item.url,
      extracted_data: {
        score: item.score,
        published_date: item.published_date,
      },
      confidence: item.score || 0.8,
    }));

    return results;
  } catch (error) {
    console.error('[web-research] Exa error:', error);
    return [];
  }
}

/**
 * Batch research for multiple products
 */
export async function researchProductsBatch(
  products: Array<{ sku: string; productName: string; description?: string }>,
  options: WebResearchOptions = {}
): Promise<Map<string, WebResearchResult[]>> {
  const results = new Map<string, WebResearchResult[]>();

  // Process in parallel with rate limiting
  const batchSize = 5; // Limit concurrent requests
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async product => {
        const research = await researchProduct(
          product.sku,
          product.productName,
          product.description,
          options
        );
        return { sku: product.sku, results: research };
      })
    );

    for (const { sku, results: research } of batchResults) {
      results.set(sku, research);
    }

    // Rate limiting delay
    if (i + batchSize < products.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
