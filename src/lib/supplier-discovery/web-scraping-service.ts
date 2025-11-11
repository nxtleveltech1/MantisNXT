/**
 * Web Scraping Service for Data Extraction
 * Handles extracting structured data from various websites
 */

import type { Browser} from 'puppeteer';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import type { AxiosInstance } from 'axios';
import axios from 'axios';
import crypto from 'crypto';
import type {
  ScrapingTarget,
  WebsiteContent,
  ExtractedDataField} from './enhanced-types';


import { DISCOVERY_CONFIG } from './config';

export class WebScrapingService {
  private browser: Browser | null = null;
  private axiosInstance: AxiosInstance;
  private activeScrapingCount = 0;
  private maxConcurrentScraping = DISCOVERY_CONFIG.MAX_CONCURRENT_REQUESTS;
  private businessSelectors!: {
    companyName: string[];
    address: string[];
    phone: string[];
    email: string[];
    website: string[];
  };
  private socialSelectors!: {
    linkedin: string;
    facebook: string;
    twitter: string;
    instagram: string;
  };
  private directorySelectors!: Record<
    'yellowpages' | 'brabys',
    {
      name: string;
      address: string;
      phone: string;
      website: string;
      category: string;
    }
  >;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: DISCOVERY_CONFIG.TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache'
      }
    });

    this.initializeSelectors();
  }

  private initializeSelectors(): void {
    // Common selectors for business websites
    this.businessSelectors = {
      companyName: [
        'h1',
        '.company-name',
        '.business-name',
        '.site-title',
        'title'
      ],
      address: [
        '.address',
        '.business-address',
        '.contact-address',
        '[itemprop="address"]',
        '.location'
      ],
      phone: [
        '.phone',
        '.telephone',
        '.contact-phone',
        '[itemprop="telephone"]',
        'a[href^="tel:"]'
      ],
      email: [
        '.email',
        '.contact-email',
        '[itemprop="email"]',
        'a[href^="mailto:"]'
      ],
      website: [
        '.website',
        '.url',
        '[itemprop="url"]'
      ]
    };

    // Social media selectors
    this.socialSelectors = {
      linkedin: 'a[href*="linkedin.com/company"]',
      facebook: 'a[href*="facebook.com"]',
      twitter: 'a[href*="twitter.com"]',
      instagram: 'a[href*="instagram.com"]'
    };

    // Business directory specific selectors
    this.directorySelectors = {
      yellowpages: {
        name: '.listing-name',
        address: '.listing-address',
        phone: '.listing-phone',
        website: '.listing-website',
        category: '.listing-category'
      },
      brabys: {
        name: '.business-name',
        address: '.address',
        phone: '.phone',
        website: '.website',
        category: '.category'
      }
    };
  }

  /**
   * Initialize browser instance for dynamic content
   */
  async initializeBrowser(): Promise<void> {
    if (this.browser) return;

    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      console.log('Browser initialized for web scraping');
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
    }
  }

  /**
   * Extract content from a single website
   */
  async extractWebsiteContent(url: string): Promise<WebsiteContent> {
    const startTime = Date.now();
    
    try {
      // Check rate limiting
      if (this.activeScrapingCount >= this.maxConcurrentScraping) {
        throw new Error('Rate limit exceeded - too many concurrent requests');
      }

      this.activeScrapingCount++;

      // Determine content type and extraction method
      const contentType = await this.detectContentType(url);
      
      let content: string;
      let method: 'cheerio' | 'puppeteer' | 'api';
      let status: 'success' | 'failed' | 'timeout' = 'success';

      try {
        if (contentType === 'dynamic') {
          method = 'puppeteer';
          content = await this.extractWithPuppeteer(url);
        } else {
          method = 'cheerio';
          content = await this.extractWithCheerio(url);
        }
      } catch (error) {
        status = 'failed';
        console.warn(`Content extraction failed for ${url}:`, error);
        content = '';
      }

      const responseTime = Date.now() - startTime;
      const contentHash = crypto.createHash('sha256').update(content).digest('hex');

      return {
        url,
        title: this.extractTitle(content) || new URL(url).hostname,
        content,
        extractedAt: new Date(),
        contentHash,
        extractionMethod: method,
        responseTime,
        status,
        contentType: 'text',
        wordCount: content.split(/\s+/).length
      };

    } catch (error) {
      console.error(`Failed to extract content from ${url}:`, error);
      return {
        url,
        title: '',
        content: '',
        extractedAt: new Date(),
        contentHash: '',
        extractionMethod: 'cheerio',
        responseTime: Date.now() - startTime,
        status: 'failed',
        contentType: 'text',
        wordCount: 0
      };
    } finally {
      this.activeScrapingCount--;
    }
  }

  /**
   * Extract content using Cheerio (static HTML)
   */
  private async extractWithCheerio(url: string): Promise<string> {
    const response = await this.axiosInstance.get(url);
    return response.data;
  }

  /**
   * Extract content using Puppeteer (dynamic JavaScript)
   */
  private async extractWithPuppeteer(url: string): Promise<string> {
    if (!this.browser) {
      await this.initializeBrowser();
    }

    const page = await this.browser!.newPage();
    
    try {
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: DISCOVERY_CONFIG.TIMEOUT_MS
      });

      // Wait for dynamic content
      await page.waitForTimeout(2000);

      // Extract full page content
      const content = await page.evaluate(() => {
        return document.documentElement.innerHTML;
      });

      return content;
    } finally {
      await page.close();
    }
  }

  /**
   * Detect if content is dynamic or static
   */
  private async detectContentType(url: string): Promise<'static' | 'dynamic'> {
    try {
      const response = await this.axiosInstance.get(url);
      const content = response.data.toLowerCase();
      
      // Check for common indicators of dynamic content
      const dynamicIndicators = [
        'react',
        'angular',
        'vue',
        'javascript',
        'spa',
        'next.js',
        '__next',
        'ng-',
        'v-',
        'data-react'
      ];

      const hasDynamicIndicators = dynamicIndicators.some(indicator => 
        content.includes(indicator)
      );

      return hasDynamicIndicators ? 'dynamic' : 'static';
    } catch {
      return 'static'; // Default to static on error
    }
  }

  /**
   * Extract structured data from website content
   */
  async extractStructuredData(websiteContent: WebsiteContent): Promise<ExtractedDataField[]> {
    if (!websiteContent.content || websiteContent.status !== 'success') {
      return [];
    }

    const $ = cheerio.load(websiteContent.content);
    const extractedFields: ExtractedDataField[] = [];

    try {
      // Extract business information using selectors
      const businessData = this.extractBusinessInformation($);
      extractedFields.push(...businessData);

      // Extract contact information
      const contactData = this.extractContactInformation($);
      extractedFields.push(...contactData);

      // Extract social media links
      const socialData = this.extractSocialMediaLinks($);
      extractedFields.push(...socialData);

      // Extract from page metadata
      const metadataData = this.extractMetadata($);
      extractedFields.push(...metadataData);

      console.log(`Extracted ${extractedFields.length} data fields from ${websiteContent.url}`);
    } catch (error) {
      console.error('Error extracting structured data:', error);
    }

    return extractedFields;
  }

  /**
   * Extract business information using various selectors
   */
  private extractBusinessInformation($: cheerio.CheerioAPI): ExtractedDataField[] {
    const fields: ExtractedDataField[] = [];

    // Company name
    for (const selector of this.businessSelectors.companyName) {
      const element = $(selector);
      if (element.length > 0) {
        const companyName = element.first().text().trim();
        if (companyName && companyName.length > 2) {
          fields.push({
            fieldName: 'companyName',
            value: this.cleanText(companyName),
            confidence: 0.9,
            extractionMethod: 'selector',
            sourceElement: selector,
            validation: { isValid: true }
          });
          break;
        }
      }
    }

    // Industry/category
    const categorySelectors = ['.category', '.industry', '.business-type', 'meta[name="keywords"]'];
    for (const selector of categorySelectors) {
      const element = $(selector);
      if (element.length > 0) {
        let category = '';
        if (selector === 'meta[name="keywords"]') {
          category = element.attr('content') || '';
        } else {
          category = element.first().text().trim();
        }
        
        if (category) {
          fields.push({
            fieldName: 'industry',
            value: this.cleanText(category),
            confidence: 0.7,
            extractionMethod: 'selector',
            sourceElement: selector,
            validation: { isValid: true }
          });
          break;
        }
      }
    }

    return fields;
  }

  /**
   * Extract contact information
   */
  private extractContactInformation($: cheerio.CheerioAPI): ExtractedDataField[] {
    const fields: ExtractedDataField[] = [];

    // Phone number
    for (const selector of this.businessSelectors.phone) {
      const element = $(selector);
      if (element.length > 0) {
        let phone = '';
        if (element.is('a[href^="tel:"]')) {
          phone = element.attr('href')?.replace('tel:', '') || '';
        } else {
          phone = element.text().trim();
        }
        
        if (phone && this.isValidPhone(phone)) {
          fields.push({
            fieldName: 'phone',
            value: this.formatPhoneNumber(phone),
            confidence: 0.8,
            extractionMethod: 'selector',
            sourceElement: selector,
            validation: { isValid: true }
          });
          break;
        }
      }
    }

    // Email address
    for (const selector of this.businessSelectors.email) {
      const element = $(selector);
      if (element.length > 0) {
        let email = '';
        if (element.is('a[href^="mailto:"]')) {
          email = element.attr('href')?.replace('mailto:', '') || '';
        } else {
          email = element.text().trim();
        }
        
        if (email && this.isValidEmail(email)) {
          fields.push({
            fieldName: 'email',
            value: email,
            confidence: 0.8,
            extractionMethod: 'selector',
            sourceElement: selector,
            validation: { isValid: true }
          });
          break;
        }
      }
    }

    // Website URL
    for (const selector of this.businessSelectors.website) {
      const element = $(selector);
      if (element.length > 0) {
        const website = element.is('a') ? element.attr('href') : element.text().trim();
        if (website) {
          fields.push({
            fieldName: 'website',
            value: this.formatUrl(website),
            confidence: 0.7,
            extractionMethod: 'selector',
            sourceElement: selector,
            validation: { isValid: true }
          });
          break;
        }
      }
    }

    return fields;
  }

  /**
   * Extract social media links
   */
  private extractSocialMediaLinks($: cheerio.CheerioAPI): ExtractedDataField[] {
    const fields: ExtractedDataField[] = [];
    const socialLinks = $('a[href*="linkedin.com"], a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"]');

    socialLinks.each((index, element) => {
      const href = $(element).attr('href');
      if (href) {
        const platform = this.detectSocialPlatform(href);
        if (platform) {
          fields.push({
            fieldName: `social_${platform}`,
            value: href,
            confidence: 0.6,
            extractionMethod: 'selector',
            sourceElement: 'a[href*="social"]',
            validation: { isValid: true }
          });
        }
      }
    });

    return fields;
  }

  /**
   * Extract metadata information
   */
  private extractMetadata($: cheerio.CheerioAPI): ExtractedDataField[] {
    const fields: ExtractedDataField[] = [];

    // Meta description
    const metaDesc = $('meta[name="description"]').attr('content');
    if (metaDesc) {
      fields.push({
        fieldName: 'description',
        value: this.cleanText(metaDesc),
        confidence: 0.5,
        extractionMethod: 'selector',
        sourceElement: 'meta[name="description"]',
        validation: { isValid: true }
      });
    }

    // Meta keywords
    const metaKeywords = $('meta[name="keywords"]').attr('content');
    if (metaKeywords) {
      fields.push({
        fieldName: 'keywords',
        value: this.cleanText(metaKeywords),
        confidence: 0.4,
        extractionMethod: 'selector',
        sourceElement: 'meta[name="keywords"]',
        validation: { isValid: true }
      });
    }

    return fields;
  }

  /**
   * Extract data from business directory sites
   */
  async extractFromDirectory(url: string, directory: 'yellowpages' | 'brabys'): Promise<ExtractedDataField[]> {
    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const fields: ExtractedDataField[] = [];
      const selectors = this.directorySelectors[directory];

      for (const [fieldName, selector] of Object.entries(selectors)) {
        const element = $(selector);
        if (element.length > 0) {
          const value = element.first().text().trim();
          if (value) {
            fields.push({
              fieldName,
              value: this.cleanText(value),
              confidence: 0.8,
              extractionMethod: 'selector',
              sourceElement: selector,
              validation: { isValid: true }
            });
          }
        }
      }

      return fields;
    } catch (error) {
      console.error(`Directory extraction failed for ${url}:`, error);
      return [];
    }
  }

  /**
   * Comprehensive extraction for a target URL
   */
  async extractFromTarget(target: ScrapingTarget): Promise<ExtractedDataField[]> {
    try {
      if (target.method === 'POST') {
        const response = await this.axiosInstance.post(target.url, target.payload, {
          headers: target.headers
        });
        const $ = cheerio.load(response.data);
        return this.extractUsingSelectors($, target.extractSelectors);
      } else {
        return this.extractWebsiteContent(target.url).then(content => 
          this.extractStructuredData(content)
        );
      }
    } catch (error) {
      console.error(`Target extraction failed for ${target.url}:`, error);
      return [];
    }
  }

  /**
   * Extract using specific selectors
   */
  private extractUsingSelectors($: cheerio.CheerioAPI, selectors: Record<string, string>): ExtractedDataField[] {
    const fields: ExtractedDataField[] = [];

    for (const [fieldName, selector] of Object.entries(selectors)) {
      const elements = $(selector);
      if (elements.length > 0) {
        const value = elements.first().text().trim();
        if (value) {
          fields.push({
            fieldName,
            value: this.cleanText(value),
            confidence: 0.7,
            extractionMethod: 'selector',
            sourceElement: selector,
            validation: { isValid: true }
          });
        }
      }
    }

    return fields;
  }

  /**
   * Utility methods
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s@.,()\-+]/g, '')
      .trim();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /(\+27|0)[0-9\s\-()]{8,15}/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('27')) {
      return '+' + cleaned;
    }
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '+27' + cleaned.substring(1);
    }
    return phone;
  }

  private formatUrl(url: string): string {
    if (!url.startsWith('http')) {
      return 'https://' + url.replace(/^\/+/, '');
    }
    return url;
  }

  private extractTitle(content: string): string {
    const $ = cheerio.load(content);
    return $('title').first().text().trim();
  }

  private detectSocialPlatform(url: string): string | null {
    if (url.includes('linkedin.com/company')) return 'linkedin';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('twitter.com')) return 'twitter';
    if (url.includes('instagram.com')) return 'instagram';
    return null;
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      activeScrapingCount: this.activeScrapingCount,
      maxConcurrentScraping: this.maxConcurrentScraping,
      browserInitialized: !!this.browser,
      availableSelectors: {
        business: Object.keys(this.businessSelectors).length,
        social: Object.keys(this.socialSelectors).length,
        directory: Object.keys(this.directorySelectors).length
      }
    };
  }
}

// Export singleton instance
export const webScrapingService = new WebScrapingService();