// @ts-nocheck

/**
 * Web Search Service for Supplier Discovery
 * Handles searching across multiple search engines and processing results
 */

import type { AxiosInstance } from 'axios';
import axios from 'axios';
import type {
  WebSearchRequest,
  WebSearchResult} from './enhanced-types';


import { DISCOVERY_CONFIG } from './config';

interface SearchEngineProvider {
  name: string;
  search: (query: string, request: WebSearchRequest) => Promise<WebSearchResult[]>;
  rateLimit: {
    requestsPerSecond: number;
    requestsUsed: number;
    resetTime: Date;
  };
}

export class WebSearchService {
  private providers: Map<string, SearchEngineProvider> = new Map();
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: DISCOVERY_CONFIG.TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Google Search Provider (via custom API or scraping)
    this.providers.set('google', {
      name: 'Google',
      search: this.googleSearch.bind(this),
      rateLimit: {
        requestsPerSecond: 1,
        requestsUsed: 0,
        resetTime: new Date()
      }
    });

    // Bing Search Provider
    this.providers.set('bing', {
      name: 'Bing',
      search: this.bingSearch.bind(this),
      rateLimit: {
        requestsPerSecond: 1,
        requestsUsed: 0,
        resetTime: new Date()
      }
    });

    // DuckDuckGo Provider
    this.providers.set('duckduckgo', {
      name: 'DuckDuckGo',
      search: this.duckDuckGoSearch.bind(this),
      rateLimit: {
        requestsPerSecond: 1,
        requestsUsed: 0,
        resetTime: new Date()
      }
    });
  }

  /**
   * Perform comprehensive web search across multiple engines
   */
  async searchSuppliers(request: WebSearchRequest): Promise<WebSearchResult[]> {
    console.log(`Starting web search for: ${request.searchQuery}`);

    const allResults: WebSearchResult[] = [];
    const promises: Promise<WebSearchResult[]>[] = [];

    // Execute searches in parallel
    for (const [providerName, provider] of this.providers) {
      if (this.checkRateLimit(provider)) {
        promises.push(
          this.executeSearchWithRetry(provider, request.searchQuery, request)
            .catch(error => {
              console.warn(`Search failed for ${providerName}:`, error);
              return [];
            })
        );
      }
    }

    const results = await Promise.allSettled(promises);
    
    // Collect successful results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      }
    });

    // Remove duplicates and rank results
    const uniqueResults = this.removeDuplicates(allResults);
    const rankedResults = this.rankResults(uniqueResults, request);

    console.log(`Found ${rankedResults.length} unique results for: ${request.searchQuery}`);
    return rankedResults.slice(0, request.maxResults || 20);
  }

  /**
   * Search Google for supplier information
   */
  private async googleSearch(query: string, request: WebSearchRequest): Promise<WebSearchResult[]> {
    try {
      // Use Google Custom Search API if available, otherwise simulate results
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

      if (apiKey && searchEngineId) {
        return await this.googleApiSearch(query, request, apiKey, searchEngineId);
      } else {
        // Simulate Google results for demo purposes
        return this.simulateGoogleResults(query);
      }
    } catch (error) {
      console.error('Google search failed:', error);
      return [];
    }
  }

  /**
   * Search using Google Custom Search API
   */
  private async googleApiSearch(
    query: string, 
    request: WebSearchRequest, 
    apiKey: string, 
    searchEngineId: string
  ): Promise<WebSearchResult[]> {
    const params = {
      key: apiKey,
      cx: searchEngineId,
      q: query,
      num: Math.min(request.maxResults || 10, 10),
      gl: request.region || 'za',
      lr: request.language || 'lang_en',
      ...(request.dateRange && {
        dateRestrict: this.formatDateRestriction(request.dateRange)
      })
    };

    const response = await this.axiosInstance.get(
      'https://www.googleapis.com/customsearch/v1',
      { params }
    );

    return response.data.items?.map((item: unknown) => ({
      title: item.title,
      url: item.link,
      description: item.snippet,
      displayedUrl: item.displayLink,
      score: 1.0,
      source: 'google' as const,
      crawlDate: new Date(),
      relevanceScore: this.calculateRelevanceScore(item.title, item.snippet, query)
    })) || [];
  }

  /**
   * Simulate Google results (fallback when API not available)
   */
  private simulateGoogleResults(query: string): WebSearchResult[] {
    const baseResults = [
      {
        title: `${query} - Official Website`,
        url: `https://www.${query.toLowerCase().replace(/\s+/g, '')}.co.za`,
        description: `Official website for ${query}. Find contact information, products, and services.`,
        displayedUrl: `${query.toLowerCase().replace(/\s+/g, '')}.co.za`,
      },
      {
        title: `${query} - LinkedIn Company Profile`,
        url: `https://www.linkedin.com/company/${query.toLowerCase().replace(/\s+/g, '-')}`,
        description: `Company profile on LinkedIn with employee information, industry details, and company updates.`,
        displayedUrl: 'linkedin.com',
      },
      {
        title: `${query} - Business Directory`,
        url: `https://www.yellowpages.co.za/search?search=${encodeURIComponent(query)}`,
        description: `Business listing in Yellow Pages South Africa with contact details and address information.`,
        displayedUrl: 'yellowpages.co.za',
      },
      {
        title: `${query} - Company Registration`,
        url: `https://eservices.cipc.co.za`,
        description: `Official company registration information and compliance details.`,
        displayedUrl: 'cipc.co.za',
      }
    ];

    return baseResults.map((item, index) => ({
      ...item,
      score: 1.0 - (index * 0.1),
      source: 'google' as const,
      crawlDate: new Date(),
      relevanceScore: 0.9 - (index * 0.1)
    }));
  }

  /**
   * Search Bing for supplier information
   */
  private async bingSearch(query: string, request: WebSearchRequest): Promise<WebSearchResult[]> {
    try {
      const apiKey = process.env.BING_SEARCH_API_KEY;

      if (apiKey) {
        return await this.bingApiSearch(query, request, apiKey);
      } else {
        return this.simulateBingResults(query);
      }
    } catch (error) {
      console.error('Bing search failed:', error);
      return [];
    }
  }

  /**
   * Search using Bing Search API
   */
  private async bingApiSearch(query: string, request: WebSearchRequest, apiKey: string): Promise<WebSearchResult[]> {
    const headers = {
      'Ocp-Apim-Subscription-Key': apiKey
    };

    const params = {
      q: query,
      count: request.maxResults || 10,
      offset: 0,
      mkt: 'en-ZA',
      safeSearch: 'Moderate'
    };

    const response = await this.axiosInstance.get(
      'https://api.bing.microsoft.com/v7.0/search',
      { headers, params }
    );

    return response.data.webPages?.value?.map((item: unknown) => ({
      title: item.name,
      url: item.url,
      description: item.snippet,
      displayedUrl: item.displayUrl,
      score: 0.8,
      source: 'bing' as const,
      crawlDate: new Date(),
      relevanceScore: this.calculateRelevanceScore(item.name, item.snippet, query)
    })) || [];
  }

  /**
   * Simulate Bing results
   */
  private simulateBingResults(query: string): WebSearchResult[] {
    return [
      {
        title: `About ${query} - Business Information`,
        url: `https://example.com/about-${query}`,
        description: `Comprehensive business information for ${query} including services, contact details, and company background.`,
        displayedUrl: 'example.com',
        score: 0.8,
        source: 'bing' as const,
        crawlDate: new Date(),
        relevanceScore: 0.8
      }
    ];
  }

  /**
   * Search DuckDuckGo for supplier information
   */
  private async duckDuckGoSearch(query: string, request: WebSearchRequest): Promise<WebSearchResult[]> {
    try {
      const response = await this.axiosInstance.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: '1',
          skip_disambig: '1'
        }
      });

      const results: WebSearchResult[] = [];
      
      // Process Abstract results
      if (response.data.Abstract) {
        results.push({
          title: response.data.Heading || query,
          url: response.data.AbstractURL || '',
          description: response.data.Abstract,
          displayedUrl: new URL(response.data.AbstractURL || 'https://duckduckgo.com').hostname,
          score: 0.7,
          source: 'duckduckgo' as const,
          crawlDate: new Date(),
          relevanceScore: 0.7
        });
      }

      // Process Related topics
      if (response.data.RelatedTopics) {
        response.data.RelatedTopics.slice(0, 5).forEach((topic: unknown) => {
          if (topic.FirstURL && topic.Text) {
            results.push({
              title: topic.Text.split(' - ')[0] || query,
              url: topic.FirstURL,
              description: topic.Text,
              displayedUrl: new URL(topic.FirstURL).hostname,
              score: 0.6,
              source: 'duckduckgo' as const,
              crawlDate: new Date(),
              relevanceScore: 0.6
            });
          }
        });
      }

      return results;
    } catch (error) {
      console.error('DuckDuckGo search failed:', error);
      return [];
    }
  }

  /**
   * Execute search with retry logic
   */
  private async executeSearchWithRetry(
    provider: SearchEngineProvider,
    query: string,
    request: WebSearchRequest,
    maxRetries: number = 3
  ): Promise<WebSearchResult[]> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.updateRateLimit(provider);
        const results = await provider.search(query, request);
        return results;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Search attempt ${attempt} failed for ${provider.name}:`, lastError.message);

        if (attempt < maxRetries) {
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  /**
   * Remove duplicate results based on URL and title similarity
   */
  private removeDuplicates(results: WebSearchResult[]): WebSearchResult[] {
    const seen = new Set<string>();
    const unique: WebSearchResult[] = [];

    for (const result of results) {
      // Normalize URL for comparison
      const normalizedUrl = this.normalizeUrl(result.url);
      
      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl);
        unique.push(result);
      } else {
        // If duplicate found, keep the one with higher score
        const existingIndex = unique.findIndex(r => this.normalizeUrl(r.url) === normalizedUrl);
        if (existingIndex !== -1 && result.score > unique[existingIndex].score) {
          unique[existingIndex] = result;
        }
      }
    }

    return unique;
  }

  /**
   * Rank results based on relevance and source quality
   */
  private rankResults(results: WebSearchResult[], request: WebSearchRequest): WebSearchResult[] {
    return results
      .map(result => ({
        ...result,
        relevanceScore: this.calculateRelevanceScore(result.title, result.description, request.searchQuery)
      }))
      .sort((a, b) => {
        // Primary sort by relevance score
        if (Math.abs(a.relevanceScore - b.relevanceScore) > 0.1) {
          return b.relevanceScore - a.relevanceScore;
        }
        // Secondary sort by source quality
        return b.score - a.score;
      });
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(title: string, description: string, query: string): number {
    const queryTerms = query.toLowerCase().split(' ');
    const text = `${title} ${description}`.toLowerCase();
    
    let score = 0;
    let maxScore = 0;

    // Title relevance (weighted higher)
    const titleWords = title.toLowerCase().split(' ');
    queryTerms.forEach(term => {
      maxScore += 2;
      if (titleWords.some(word => word.includes(term) || term.includes(word))) {
        score += 2;
      }
    });

    // Description relevance
    queryTerms.forEach(term => {
      maxScore += 1;
      if (text.includes(term)) {
        score += 1;
      }
    });

    // Bonus for exact phrase matches
    if (text.includes(query.toLowerCase())) {
      score += 3;
      maxScore += 3;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '') + urlObj.pathname;
    } catch {
      return url;
    }
  }

  /**
   * Format date restriction for Google API
   */
  private formatDateRestriction(dateRange: { from: Date; to: Date }): string {
    const fromDate = dateRange.from.toISOString().split('T')[0];
    const toDate = dateRange.to.toISOString().split('T')[0];
    return `d${fromDate.replace(/-/g, '')}-${toDate.replace(/-/g, '')}`;
  }

  /**
   * Check rate limit for provider
   */
  private checkRateLimit(provider: SearchEngineProvider): boolean {
    const now = new Date();
    if (now > provider.rateLimit.resetTime) {
      provider.rateLimit.requestsUsed = 0;
      provider.rateLimit.resetTime = new Date(now.getTime() + 60000); // Reset in 1 minute
    }
    return provider.rateLimit.requestsUsed < provider.rateLimit.requestsPerSecond;
  }

  /**
   * Update rate limit tracking
   */
  private updateRateLimit(provider: SearchEngineProvider): void {
    provider.rateLimit.requestsUsed++;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get search statistics
   */
  getStatistics() {
    const providerStats: Record<string, unknown> = {};
    
    for (const [name, provider] of this.providers) {
      providerStats[name] = {
        requestsUsed: provider.rateLimit.requestsUsed,
        requestsPerSecond: provider.rateLimit.requestsPerSecond,
        resetTime: provider.rateLimit.resetTime
      };
    }

    return {
      providers: providerStats,
      totalProviders: this.providers.size,
      activeProviders: Array.from(this.providers.values()).filter(p => 
        this.checkRateLimit(p)
      ).length
    };
  }
}

// Export singleton instance
export const webSearchService = new WebSearchService();