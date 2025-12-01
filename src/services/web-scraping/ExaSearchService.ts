/**
 * Exa (formerly Metaphor) Search API Service
 *
 * Exa provides semantic search capabilities optimized for AI applications.
 * Documentation: https://docs.exa.ai
 */

export interface ExaSearchOptions {
  query: string;
  numResults?: number;
  category?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
  useAutoprompt?: boolean;
  contents?: {
    text?: {
      maxCharacters?: number;
    };
  };
  highlights?: {
    numSentences?: number;
    highlightsPerUrl?: number;
  };
}

export interface ExaSearchResult {
  success: boolean;
  data?: {
    results: Array<{
      id: string;
      url: string;
      title: string;
      score?: number;
      publishedDate?: string;
      author?: string;
      text?: string;
      highlights?: string[];
      highlightScores?: number[];
    }>;
    autopromptString?: string;
  };
  error?: string;
}

export class ExaSearchService {
  private apiKey?: string;
  private baseUrl: string;

  constructor(config?: { apiKey?: string; baseUrl?: string }) {
    this.apiKey = config?.apiKey || process.env.EXA_API_KEY;
    this.baseUrl = config?.baseUrl || process.env.EXA_BASE_URL || 'https://api.exa.ai';
  }

  /**
   * Check if Exa Search is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Search using Exa semantic search API
   */
  async search(options: ExaSearchOptions): Promise<ExaSearchResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Exa API key is required. Set EXA_API_KEY environment variable.',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          query: options.query,
          num_results: options.numResults || 10,
          ...(options.category && { category: options.category }),
          ...(options.startPublishedDate && { start_published_date: options.startPublishedDate }),
          ...(options.endPublishedDate && { end_published_date: options.endPublishedDate }),
          ...(options.useAutoprompt !== undefined && { use_autoprompt: options.useAutoprompt }),
          ...(options.contents && { contents: options.contents }),
          ...(options.highlights && { highlights: options.highlights }),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Exa API error: ${response.statusText} - ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get contents for specific URLs
   */
  async getContents(
    urls: string[],
    options?: { text?: { maxCharacters?: number } }
  ): Promise<ExaSearchResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Exa API key is required. Set EXA_API_KEY environment variable.',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/contents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          urls,
          ...(options?.text && { text: options.text }),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Exa API error: ${response.statusText} - ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

/**
 * Create an Exa Search service instance from environment variables or config
 */
export function createExaSearchService(config?: {
  apiKey?: string;
  baseUrl?: string;
}): ExaSearchService {
  return new ExaSearchService(config);
}
