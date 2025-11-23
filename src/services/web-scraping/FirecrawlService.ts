/**
 * Firecrawl Web Scraping Service
 * 
 * Note: Firecrawl is NOT an LLM provider - it's a web scraping/crawling service.
 * This service provides web scraping capabilities that can be used to extract
 * content before sending to AI providers for analysis.
 * 
 * API Documentation: https://docs.firecrawl.dev
 */

export interface FirecrawlScrapeOptions {
  url: string;
  formats?: ('markdown' | 'html' | 'rawHtml')[];
  includeTags?: string[];
  excludeTags?: string[];
  onlyMainContent?: boolean;
  timeout?: number;
}

export interface FirecrawlCrawlOptions {
  url: string;
  limit?: number;
  maxDepth?: number;
  includeSubdomains?: boolean;
  allowBackwardLinks?: boolean;
  excludePaths?: string[];
  formats?: ('markdown' | 'html' | 'rawHtml')[];
  onlyMainContent?: boolean;
}

export interface FirecrawlScrapeResult {
  success: boolean;
  data?: {
    url: string;
    markdown?: string;
    html?: string;
    rawHtml?: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      canonicalUrl?: string;
      ogImage?: string;
      [key: string]: unknown;
    };
  };
  error?: string;
}

export interface FirecrawlCrawlResult {
  success: boolean;
  jobId?: string;
  data?: Array<{
    url: string;
    markdown?: string;
    html?: string;
    rawHtml?: string;
    metadata?: Record<string, unknown>;
  }>;
  error?: string;
}

export class FirecrawlService {
  private apiKey?: string;
  private baseUrl: string;

  constructor(config?: { apiKey?: string; baseUrl?: string }) {
    this.apiKey = config?.apiKey || process.env.FIRECRAWL_API_KEY;
    this.baseUrl = config?.baseUrl || process.env.FIRECRAWL_BASE_URL || 'https://api.firecrawl.dev';
  }

  /**
   * Check if Firecrawl is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Scrape a single URL and extract content
   */
  async scrape(options: FirecrawlScrapeOptions): Promise<FirecrawlScrapeResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Firecrawl API key is required. Set FIRECRAWL_API_KEY environment variable.',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/v0/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          url: options.url,
          formats: options.formats || ['markdown'],
          includeTags: options.includeTags,
          excludeTags: options.excludeTags,
          onlyMainContent: options.onlyMainContent ?? true,
          timeout: options.timeout || 30000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Firecrawl API error: ${response.statusText} - ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Crawl a website and extract content from multiple pages
   */
  async crawl(options: FirecrawlCrawlOptions): Promise<FirecrawlCrawlResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Firecrawl API key is required. Set FIRECRAWL_API_KEY environment variable.',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/v0/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          url: options.url,
          limit: options.limit || 10,
          maxDepth: options.maxDepth || 2,
          includeSubdomains: options.includeSubdomains ?? false,
          allowBackwardLinks: options.allowBackwardLinks ?? false,
          excludePaths: options.excludePaths,
          formats: options.formats || ['markdown'],
          onlyMainContent: options.onlyMainContent ?? true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Firecrawl API error: ${response.statusText} - ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        jobId: data.jobId,
        data: data.data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get crawl job status
   */
  async getCrawlStatus(jobId: string): Promise<{ status: string; data?: unknown }> {
    if (!this.apiKey) {
      throw new Error('Firecrawl API key is required.');
    }

    const response = await fetch(`${this.baseUrl}/v0/crawl/status/${jobId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get crawl status: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Search using Firecrawl search API
   */
  async search(query: string, options?: { limit?: number }): Promise<FirecrawlCrawlResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Firecrawl API key is required. Set FIRECRAWL_API_KEY environment variable.',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/v0/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          limit: options?.limit || 10,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Firecrawl API error: ${response.statusText} - ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || [],
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
 * Create a Firecrawl service instance from environment variables or config
 */
export function createFirecrawlService(config?: { apiKey?: string; baseUrl?: string }): FirecrawlService {
  return new FirecrawlService(config);
}

