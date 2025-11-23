/**
 * Brave Search API Service
 * 
 * Brave Search provides web search capabilities through their API.
 * Documentation: https://api.search.brave.com
 */

export interface BraveSearchOptions {
  query: string;
  count?: number;
  offset?: number;
  searchLang?: string;
  country?: string;
  safesearch?: 'strict' | 'moderate' | 'off';
  freshness?: 'pd' | 'pw' | 'pm' | 'py'; // past day, week, month, year
  textDebias?: boolean;
  resultFilter?: 'news' | 'discussions' | 'videos' | 'web';
}

export interface BraveSearchResult {
  success: boolean;
  data?: {
    web?: {
      results: Array<{
        title: string;
        url: string;
        description: string;
        meta_url?: {
          hostname?: string;
        };
        age?: string;
      }>;
    };
    news?: {
      results: Array<{
        title: string;
        url: string;
        description: string;
        meta_url?: {
          hostname?: string;
        };
        age?: string;
      }>;
    };
  };
  error?: string;
}

export class BraveSearchService {
  private apiKey?: string;
  private baseUrl: string;

  constructor(config?: { apiKey?: string; baseUrl?: string }) {
    this.apiKey = config?.apiKey || process.env.BRAVE_API_KEY;
    this.baseUrl = config?.baseUrl || process.env.BRAVE_BASE_URL || 'https://api.search.brave.com';
  }

  /**
   * Check if Brave Search is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Search the web using Brave Search API
   */
  async search(options: BraveSearchOptions): Promise<BraveSearchResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Brave Search API key is required. Set BRAVE_API_KEY environment variable.',
      };
    }

    try {
      const params = new URLSearchParams({
        q: options.query,
        count: String(options.count || 10),
        ...(options.offset && { offset: String(options.offset) }),
        ...(options.searchLang && { search_lang: options.searchLang }),
        ...(options.country && { country: options.country }),
        ...(options.safesearch && { safesearch: options.safesearch }),
        ...(options.freshness && { freshness: options.freshness }),
        ...(options.textDebias !== undefined && { text_debias: String(options.textDebias) }),
        ...(options.resultFilter && { result_filter: options.resultFilter }),
      });

      const response = await fetch(`${this.baseUrl}/res/v1/web/search?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Brave Search API error: ${response.statusText} - ${error}`,
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
 * Create a Brave Search service instance from environment variables or config
 */
export function createBraveSearchService(config?: { apiKey?: string; baseUrl?: string }): BraveSearchService {
  return new BraveSearchService(config);
}

