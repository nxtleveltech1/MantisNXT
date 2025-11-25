// @ts-nocheck

/**
 * AI-Powered Web Search Service
 * Uses real web search APIs (Serper, Tavily, or Google Custom Search) to find supplier information
 */

export interface WebSearchResult {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedDate?: string;
  relevanceScore: number;
  snippet?: string;
  extractedData?: unknown; // For compatibility with legacy SearchResult
}

export interface WebSearchOptions {
  maxResults?: number;
  location?: string;
  language?: string;
  filters?: {
    industry?: string;
    location?: string;
    minConfidence?: number;
  };
}

export class AIWebSearchService {
  private serperApiKey?: string;
  private tavilyApiKey?: string;
  private googleApiKey?: string;
  private googleCx?: string;
  private braveApiKey?: string;
  private exaApiKey?: string;
  private searchProvider: 'serper' | 'tavily' | 'google' | 'brave' | 'exa' | 'duckduckgo' = 'serper';

  constructor(config?: {
    serperApiKey?: string;
    tavilyApiKey?: string;
    googleSearchApiKey?: string;
    googleSearchEngineId?: string;
    braveApiKey?: string;
    exaApiKey?: string;
  }) {
    // Initialize with provided config or environment variables
    this.serperApiKey = config?.serperApiKey || process.env.SERPER_API_KEY;
    this.tavilyApiKey = config?.tavilyApiKey || process.env.TAVILY_API_KEY;
    this.googleApiKey = config?.googleSearchApiKey || process.env.GOOGLE_SEARCH_API_KEY;
    this.googleCx = config?.googleSearchEngineId || process.env.GOOGLE_SEARCH_ENGINE_ID;
    this.braveApiKey = config?.braveApiKey || process.env.BRAVE_API_KEY;
    this.exaApiKey = config?.exaApiKey || process.env.EXA_API_KEY;

    // Determine which provider to use based on available API keys (priority order)
    if (this.serperApiKey) {
      this.searchProvider = 'serper';
    } else if (this.tavilyApiKey) {
      this.searchProvider = 'tavily';
    } else if (this.braveApiKey) {
      this.searchProvider = 'brave';
    } else if (this.exaApiKey) {
      this.searchProvider = 'exa';
    } else if (this.googleApiKey && this.googleCx) {
      this.searchProvider = 'google';
    } else {
      this.searchProvider = 'duckduckgo'; // Fallback to DuckDuckGo (no API key needed)
    }

    console.log(`🔍 AIWebSearchService initialized with provider: ${this.searchProvider}`);
  }

  /**
   * Search for suppliers using real web search APIs
   */
  async searchSuppliers(query: string, options: WebSearchOptions = {}): Promise<WebSearchResult[]> {
    const { maxResults = 10, location, language = 'en' } = options;

    console.log(`🔍 Searching for suppliers: "${query}" (maxResults: ${maxResults})`);

    try {
      let results: WebSearchResult[] = [];

      switch (this.searchProvider) {
        case 'serper':
          results = await this.searchWithSerper(query, maxResults, location, language);
          break;
        case 'tavily':
          results = await this.searchWithTavily(query, maxResults, location);
          break;
        case 'brave':
          results = await this.searchWithBrave(query, maxResults, location);
          break;
        case 'exa':
          results = await this.searchWithExa(query, maxResults);
          break;
        case 'google':
          results = await this.searchWithGoogle(query, maxResults, location, language);
          break;
        case 'duckduckgo':
          results = await this.searchWithDuckDuckGo(query, maxResults);
          break;
      }

      console.log(`✅ Found ${results.length} search results`);
      return results;
    } catch (error) {
      console.error('❌ Web search failed:', error);
      throw new Error(
        `Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search using Serper API (https://serper.dev)
   */
  private async searchWithSerper(
    query: string,
    maxResults: number,
    location?: string,
    language?: string
  ): Promise<WebSearchResult[]> {
    if (!this.serperApiKey) {
      throw new Error('SERPER_API_KEY not configured');
    }

    const searchQuery = this.buildSupplierSearchQuery(query, location);

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: maxResults,
        gl: location || 'za', // Country code
        hl: language || 'en', // Language
        type: 'search',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Serper API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return (data.organic || []).map((result: unknown, index: number) => ({
      title: result.title || '',
      description: result.snippet || '',
      url: result.link || '',
      source: 'serper',
      publishedDate: result.date,
      relevanceScore: this.calculateRelevanceScore(result, index),
      snippet: result.snippet,
    }));
  }

  /**
   * Search using Tavily API (https://tavily.com)
   */
  private async searchWithTavily(
    query: string,
    maxResults: number,
    location?: string
  ): Promise<WebSearchResult[]> {
    if (!this.tavilyApiKey) {
      throw new Error('TAVILY_API_KEY not configured');
    }

    const searchQuery = this.buildSupplierSearchQuery(query, location);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.tavilyApiKey,
        query: searchQuery,
        max_results: maxResults,
        search_depth: 'advanced',
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return (data.results || []).map((result: unknown, index: number) => ({
      title: result.title || '',
      description: result.content || '',
      url: result.url || '',
      source: 'tavily',
      relevanceScore: result.score || this.calculateRelevanceScore(result, index),
      snippet: result.content,
    }));
  }

  /**
   * Search using Google Custom Search API
   */
  private async searchWithGoogle(
    query: string,
    maxResults: number,
    location?: string,
    language?: string
  ): Promise<WebSearchResult[]> {
    if (!this.googleApiKey || !this.googleCx) {
      throw new Error('GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID must be configured');
    }

    const searchQuery = this.buildSupplierSearchQuery(query, location);

    const params = new URLSearchParams({
      key: this.googleApiKey,
      cx: this.googleCx,
      q: searchQuery,
      num: Math.min(maxResults, 10).toString(), // Google API max is 10 per request
      gl: location || 'za',
      lr: `lang_${language || 'en'}`,
    });

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Search API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return (data.items || []).map((result: unknown, index: number) => ({
      title: result.title || '',
      description: result.snippet || '',
      url: result.link || '',
      source: 'google',
      publishedDate: result.pagemap?.metatags?.[0]?.['article:published_time'],
      relevanceScore: this.calculateRelevanceScore(result, index),
      snippet: result.snippet,
    }));
  }

  /**
   * Search using Brave Search API
   */
  private async searchWithBrave(
    query: string,
    maxResults: number,
    location?: string
  ): Promise<WebSearchResult[]> {
    if (!this.braveApiKey) {
      throw new Error('BRAVE_API_KEY not configured');
    }

    const searchQuery = this.buildSupplierSearchQuery(query, location);
    const params = new URLSearchParams({
      q: searchQuery,
      count: maxResults.toString(),
      ...(location && { country: location }),
    });

    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': this.braveApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brave Search API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return (data.web?.results || []).map((result: unknown, index: number) => ({
      title: result.title || '',
      description: result.description || '',
      url: result.url || '',
      source: 'brave',
      publishedDate: result.age,
      relevanceScore: this.calculateRelevanceScore(result, index),
      snippet: result.description,
    }));
  }

  /**
   * Search using Exa (Semantic Search) API
   */
  private async searchWithExa(
    query: string,
    maxResults: number
  ): Promise<WebSearchResult[]> {
    if (!this.exaApiKey) {
      throw new Error('EXA_API_KEY not configured');
    }

    const searchQuery = this.buildSupplierSearchQuery(query);

    const response = await fetch('https://api.exa.ai/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.exaApiKey,
      },
      body: JSON.stringify({
        query: searchQuery,
        num_results: maxResults,
        use_autoprompt: true,
        contents: {
          text: {
            max_characters: 500,
          },
        },
        highlights: {
          num_sentences: 3,
          highlights_per_url: 1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Exa API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return (data.results || []).map((result: unknown, index: number) => ({
      title: result.title || '',
      description: result.text || result.highlights?.[0] || '',
      url: result.url || '',
      source: 'exa',
      publishedDate: result.published_date,
      relevanceScore: result.score || this.calculateRelevanceScore(result, index),
      snippet: result.highlights?.[0] || result.text,
    }));
  }

  /**
   * Search using DuckDuckGo (no API key required, but limited)
   */
  private async searchWithDuckDuckGo(
    query: string,
    maxResults: number
  ): Promise<WebSearchResult[]> {
    const searchQuery = encodeURIComponent(query);

    // DuckDuckGo HTML search (simple but works without API key)
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${searchQuery}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed: ${response.status}`);
    }

    const html = await response.text();

    // Simple HTML parsing (in production, use a proper HTML parser)
    const results: WebSearchResult[] = [];
    const titleRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
    const descRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/g;

    let match;
    let index = 0;
    while ((match = titleRegex.exec(html)) !== null && index < maxResults) {
      const url = match[1];
      const title = this.decodeHtmlEntities(match[2]);

      // Try to find description
      const descMatch = descRegex.exec(html);
      const description = descMatch ? this.decodeHtmlEntities(descMatch[1]) : '';

      results.push({
        title,
        description,
        url,
        source: 'duckduckgo',
        relevanceScore: 0.7 - index * 0.05,
        snippet: description,
      });

      index++;
    }

    return results;
  }

  /**
   * Build optimized search query for supplier discovery
   */
  private buildSupplierSearchQuery(query: string, location?: string): string {
    let searchQuery = query.trim();

    // Enhance query for supplier discovery
    if (
      !searchQuery.toLowerCase().includes('supplier') &&
      !searchQuery.toLowerCase().includes('vendor') &&
      !searchQuery.toLowerCase().includes('company')
    ) {
      searchQuery = `${searchQuery} supplier company`;
    }

    // Add location if specified
    if (location) {
      searchQuery = `${searchQuery} ${location}`;
    }

    return searchQuery;
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(result: unknown, index: number): number {
    let score = 0.9 - index * 0.05; // Base score decreases with position

    // Boost score if title/description contains supplier-related keywords
    const text =
      `${result.title || ''} ${result.snippet || result.description || ''}`.toLowerCase();
    const keywords = ['supplier', 'vendor', 'company', 'manufacturer', 'distributor', 'services'];

    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += 0.02;
      }
    });

    return Math.min(0.98, Math.max(0.5, score));
  }

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
}

// Export singleton instance (uses env vars)
export const aiWebSearchService = new AIWebSearchService();

// Factory function to create instance with config
export function createAIWebSearchService(config?: {
  serperApiKey?: string;
  tavilyApiKey?: string;
  googleSearchApiKey?: string;
  googleSearchEngineId?: string;
}): AIWebSearchService {
  return new AIWebSearchService(config);
}
