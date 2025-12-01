import { NextResponse } from 'next/server';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

// Cache models for 5 minutes to reduce API calls
let cachedModels: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    // Check cache
    const now = Date.now();
    if (cachedModels && now - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({
        data: cachedModels,
        cached: true,
        count: cachedModels.length,
      });
    }

    // Fetch from OpenRouter API (public endpoint, no auth required)
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Accept: 'application/json',
      },
      cache: 'force-cache',
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data: OpenRouterModelsResponse = await response.json();

    // Extract model IDs and sort them
    const models = data.data
      .map(m => m.id)
      .sort((a, b) => {
        // Sort by provider first, then by model name
        const [providerA] = a.split('/');
        const [providerB] = b.split('/');
        if (providerA !== providerB) return providerA.localeCompare(providerB);
        return a.localeCompare(b);
      });

    // Update cache
    cachedModels = models;
    cacheTimestamp = now;

    return NextResponse.json({
      data: models,
      cached: false,
      count: models.length,
    });
  } catch (error) {
    console.error('[OpenRouter Models API] Error fetching models:', error);

    // Return cached data if available, even if expired
    if (cachedModels) {
      return NextResponse.json({
        data: cachedModels,
        cached: true,
        stale: true,
        count: cachedModels.length,
        error: 'Using stale cache due to fetch error',
      });
    }

    // Return error if no cache available
    return NextResponse.json(
      {
        error: 'Failed to fetch OpenRouter models',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
