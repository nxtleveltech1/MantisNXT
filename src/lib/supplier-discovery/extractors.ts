/**
 * Data Extraction Engine for Supplier Discovery
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { ExtractionResult, DataSource, SupplierDiscoveryRequest } from './types';
import { EXTRACTION_PATTERNS, USER_AGENTS, RETRY_CONFIG, DISCOVERY_CONFIG } from './config';

export class DataExtractor {
  private browser: Browser | null = null;
  private isInitialized = false;
  private activeRequests = 0;

  /**
   * Initialize browser instance
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ]
      });
      this.isInitialized = true;
      console.log('Puppeteer browser initialized');
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  /**
   * Clean up browser instance
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
      console.log('Browser cleanup completed');
    }
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(): boolean {
    if (this.activeRequests >= DISCOVERY_CONFIG.MAX_CONCURRENT_REQUESTS) {
      console.warn('Rate limit exceeded, request queued');
      return false;
    }
    return true;
  }

  /**
   * Extract data using static HTML scraping
   */
  async extractWithCheerio(url: string, selectors: Record<string, string>): Promise<ExtractionResult[]> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate'
        },
        timeout: DISCOVERY_CONFIG.TIMEOUT_MS
      });

      const $ = cheerio.load(response.data);
      const results: ExtractionResult[] = [];

      for (const [field, selector] of Object.entries(selectors)) {
        const elements = $(selector);
        if (elements.length > 0) {
          const value = elements.first().text().trim();
          if (value) {
            results.push({
              field,
              value,
              confidence: 0.7, // Base confidence for cheerio extraction
              source: url,
              timestamp: new Date()
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error(`Cheerio extraction failed for ${url}:`, error);
      return [];
    }
  }

  /**
   * Extract data using browser automation
   */
  async extractWithPuppeteer(url: string, selectors: Record<string, string>): Promise<ExtractionResult[]> {
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    this.activeRequests++;

    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser!.newPage();
      await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);

      // Set viewport and wait for load
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: DISCOVERY_CONFIG.TIMEOUT_MS
      });

      // Wait for dynamic content
      await page.waitForTimeout(2000);

      const results: ExtractionResult[] = [];

      for (const [field, selector] of Object.entries(selectors)) {
        try {
          const element = await page.$(selector);
          if (element) {
            const value = await page.evaluate(el => el.textContent?.trim() || '', element);
            if (value) {
              results.push({
                field,
                value,
                confidence: 0.8, // Higher confidence for browser extraction
                source: url,
                timestamp: new Date()
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to extract field ${field} from ${url}:`, error);
        }
      }

      await page.close();
      return results;
    } catch (error) {
      console.error(`Puppeteer extraction failed for ${url}:`, error);
      return [];
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Extract specific patterns from text content
   */
  extractPatterns(text: string): Record<string, string[]> {
    const patterns: Record<string, string[]> = {};

    for (const [key, regex] of Object.entries(EXTRACTION_PATTERNS)) {
      const matches = text.match(regex) || [];
      if (matches.length > 0) {
        patterns[key] = [...new Set(matches)]; // Remove duplicates
      }
    }

    return patterns;
  }

  /**
   * Search Google for supplier information
   */
  async searchGoogle(supplierName: string): Promise<ExtractionResult[]> {
    const query = encodeURIComponent(`"${supplierName}" South Africa contact information`);
    const searchUrl = `https://www.google.com/search?q=${query}`;

    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser!.newPage();
      await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Extract search results
      const searchResults = await page.evaluate(() => {
        const results: Array<{ title: string; snippet: string; url: string }> = [];
        const searchItems = document.querySelectorAll('div.g');

        searchItems.forEach(item => {
          const titleElement = item.querySelector('h3');
          const snippetElement = item.querySelector('.VwiC3b');
          const linkElement = item.querySelector('a');

          if (titleElement && linkElement) {
            results.push({
              title: titleElement.textContent || '',
              snippet: snippetElement?.textContent || '',
              url: linkElement.href
            });
          }
        });

        return results;
      });

      await page.close();

      // Process search results
      const extractionResults: ExtractionResult[] = [];
      for (const result of searchResults.slice(0, 5)) { // Top 5 results
        const patterns = this.extractPatterns(result.title + ' ' + result.snippet);

        for (const [pattern, matches] of Object.entries(patterns)) {
          matches.forEach(match => {
            extractionResults.push({
              field: pattern,
              value: match,
              confidence: 0.6, // Moderate confidence for search results
              source: result.url,
              timestamp: new Date()
            });
          });
        }
      }

      return extractionResults;
    } catch (error) {
      console.error('Google search failed:', error);
      return [];
    }
  }

  /**
   * Search LinkedIn for company information
   */
  async searchLinkedIn(supplierName: string): Promise<ExtractionResult[]> {
    const query = encodeURIComponent(supplierName);
    const linkedinUrl = `https://www.linkedin.com/search/results/companies/?keywords=${query}`;

    try {
      const results = await this.extractWithPuppeteer(linkedinUrl, {
        companyName: '.entity-result__title-text a span',
        industry: '.entity-result__primary-subtitle',
        location: '.entity-result__secondary-subtitle',
        employees: '.entity-result__summary'
      });

      return results.map(result => ({
        ...result,
        confidence: result.confidence * 0.9 // Adjust confidence for LinkedIn
      }));
    } catch (error) {
      console.error('LinkedIn search failed:', error);
      return [];
    }
  }

  /**
   * Search company registration database
   */
  async searchCompanyRegistry(supplierName: string): Promise<ExtractionResult[]> {
    // This would integrate with SA Companies and Intellectual Property Commission
    // For now, we'll simulate the search
    console.log(`Searching company registry for: ${supplierName}`);

    // In production, this would make actual API calls to CIPC
    return [];
  }

  /**
   * Extract business directory information
   */
  async searchBusinessDirectory(supplierName: string): Promise<ExtractionResult[]> {
    const directories = [
      'https://www.yellowpages.co.za',
      'https://www.brabys.com',
      'https://www.hotfrog.co.za'
    ];

    const allResults: ExtractionResult[] = [];

    for (const directory of directories) {
      try {
        const query = encodeURIComponent(supplierName);
        const searchUrl = `${directory}/search?q=${query}`;

        const results = await this.extractWithCheerio(searchUrl, {
          name: '.listing-name, .business-name',
          address: '.listing-address, .business-address',
          phone: '.listing-phone, .business-phone',
          website: '.listing-website, .business-website'
        });

        allResults.push(...results);
      } catch (error) {
        console.warn(`Failed to search ${directory}:`, error);
      }
    }

    return allResults;
  }

  /**
   * Comprehensive supplier data extraction
   */
  async extractSupplierData(request: SupplierDiscoveryRequest): Promise<ExtractionResult[]> {
    const { supplierName } = request;
    const allResults: ExtractionResult[] = [];

    console.log(`Starting comprehensive extraction for: ${supplierName}`);

    try {
      // Parallel extraction from multiple sources
      const extractions = await Promise.allSettled([
        this.searchGoogle(supplierName),
        this.searchLinkedIn(supplierName),
        this.searchBusinessDirectory(supplierName),
        this.searchCompanyRegistry(supplierName)
      ]);

      // Collect all successful extractions
      extractions.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allResults.push(...result.value);
        } else {
          console.warn(`Extraction ${index} failed:`, result.reason);
        }
      });

      console.log(`Extracted ${allResults.length} data points for ${supplierName}`);
      return allResults;
    } catch (error) {
      console.error('Comprehensive extraction failed:', error);
      return allResults;
    }
  }
}

// Export singleton instance
export const dataExtractor = new DataExtractor();