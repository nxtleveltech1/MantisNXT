// Enhanced Supplier Intelligence Service with Web Discovery Integration
import { WebSearchService } from './WebSearchService';
import { WebScrapingService } from './WebScrapingService';
import { DataExtractionEngine } from './DataExtractionEngine';
import { createAIWebSearchService } from './AIWebSearchService';
import { createAIDataExtractionService } from './AIDataExtractionService';
import type { ExtractedSupplierData as AIExtractedSupplierData } from './AIDataExtractionService';
import type { ExtractedSupplierData, SupplierBrandLink } from './ExtractedSupplierData';
export type { ExtractedSupplierData } from './ExtractedSupplierData';
import type { SupplierFormAddress, SupplierFormData } from '@/types/supplier';
import type { SupplierDiscoveryConfig } from '@/lib/ai/supplier-discovery-config';

export interface WebDiscoveryResult {
  success: boolean;
  data: ExtractedSupplierData[];
  suppliers?: Array<{
    id: string;
    name: string;
    riskScore: number;
    [key: string]: unknown;
  }>;
  error?: string;
  metadata?: {
    searchType: 'query' | 'website';
    totalResults: number;
    confidence: number;
    sources: string[];
    processingTime?: number;
    searchConfidence?: number;
  };
}

export class SupplierIntelligenceService {
  private webSearchService: WebSearchService;
  private webScrapingService: WebScrapingService;
  private dataExtractionEngine: DataExtractionEngine;
  private aiWebSearchService: ReturnType<typeof createAIWebSearchService>;
  private aiDataExtractionService: ReturnType<typeof createAIDataExtractionService>;
  private config?: SupplierDiscoveryConfig; // Store config for custom providers

  constructor(config?: SupplierDiscoveryConfig) {
    this.config = config; // Store config for later use

    this.webSearchService = new WebSearchService();
    this.webScrapingService = new WebScrapingService();
    this.dataExtractionEngine = new DataExtractionEngine();

    // Initialize AI services with config
    this.aiWebSearchService = createAIWebSearchService({
      serperApiKey: config?.serperApiKey,
      tavilyApiKey: config?.tavilyApiKey,
      googleSearchApiKey: config?.googleSearchApiKey,
      googleSearchEngineId: config?.googleSearchEngineId,
    });

    this.aiDataExtractionService = createAIDataExtractionService({
      anthropicApiKey: config?.anthropicApiKey,
      anthropicBaseUrl: config?.anthropicBaseUrl,
      openaiApiKey: config?.openaiApiKey,
      openaiBaseUrl: config?.openaiBaseUrl,
      openaiModel: config?.openaiModel,
    });
  }

  /**
   * Perform web search to discover suppliers using AI-powered services
   */
  async discoverSuppliers(
    query: string,
    options?: {
      maxResults?: number;
      filters?: {
        industry?: string;
        location?: string;
        minConfidence?: number;
      };
    }
  ): Promise<WebDiscoveryResult> {
    try {
      const { maxResults = 10, filters = {} } = options || {};

      console.log(`🔍 SupplierIntelligenceService: Starting AI-powered discovery for "${query}"`);

      // Step 1: Search the web using AI-powered web search service
      let searchResults;
      try {
        searchResults = await this.aiWebSearchService.searchSuppliers(query, {
          maxResults,
          location: filters.location,
          filters,
        });
        console.log(`📊 Found ${searchResults.length} search results from AIWebSearchService`);
      } catch (aiSearchError) {
        console.warn('⚠️ AI web search failed, falling back to legacy service:', aiSearchError);
        // Fallback to legacy service
        searchResults = await this.webSearchService.searchSuppliers(query, {
          maxResults,
          filters,
        });
        console.log(`📊 Found ${searchResults.length} search results from legacy WebSearchService`);
      }

      console.log(
        '🔍 Search results preview:',
        searchResults.slice(0, 2).map(r => ({ title: r.title, source: r.source }))
      );

      // Step 2: Extract structured data using AI-powered extraction
      const extractedData: ExtractedSupplierData[] = [];

      console.log(`🔄 Starting AI-powered data extraction for ${searchResults.length} results...`);

      for (const result of searchResults) {
        try {
          console.log(`🔍 Extracting data from result: "${result.title}"`);

          // Try AI extraction first
          let extracted: ExtractedSupplierData | null = null;
          try {
            const aiExtracted = await this.aiDataExtractionService.extractSupplierData({
              url: result.url,
              title: result.title,
              description: result.description || result.snippet || '',
              content: result.snippet || result.description || '',
            });

            if (aiExtracted) {
              // Convert AI extracted data to our format
              extracted = this.convertAIExtractedData(aiExtracted);
              console.log(`✅ AI extraction successful`);
            }
          } catch (aiError) {
            console.warn(`⚠️ AI extraction failed, using fallback:`, aiError);
          }

          // Fallback to legacy extraction if AI failed
          if (!extracted) {
            extracted = await this.dataExtractionEngine.extractSupplierData(result);
            console.log(`📋 Fallback extraction:`, extracted ? 'SUCCESS' : 'FAILED');
          }

          if (extracted && this.calculateConfidence(extracted) >= (filters.minConfidence || 50)) {
            extractedData.push(extracted);
            console.log(
              `✅ Added to results (confidence: ${this.calculateConfidence(extracted)}%)`
            );
          } else {
            console.log(
              `❌ Rejected (confidence: ${extracted ? this.calculateConfidence(extracted) : 0}%)`
            );
          }
        } catch (error) {
          console.warn(`⚠️ Failed to extract data from result "${result.title}":`, error);
        }
      }

      console.log(`📊 Final extracted data: ${extractedData.length} suppliers extracted`);

      // Step 3: Calculate overall confidence and metadata
      const confidence = this.calculateOverallConfidence(extractedData);
      const sources = searchResults.map(r => r.source || 'Unknown');

      console.log(`🎯 Overall confidence: ${confidence}%, Sources: ${sources.length}`);

      // Transform extracted data to supplier format
      const suppliers = extractedData.map((data, index) => ({
        id: `discovered_${Date.now()}_${index}`,
        name: data.companyName || 'Unknown Supplier',
        riskScore: (100 - this.calculateConfidence(data)) / 100, // Convert confidence to risk score
        ...data,
      }));

      return {
        success: extractedData.length > 0,
        data: extractedData,
        suppliers,
        metadata: {
          searchType: 'query',
          totalResults: extractedData.length,
          confidence,
          sources: [...new Set(sources)],
          processingTime: 0, // Would be calculated from actual timing
          searchConfidence: confidence,
        },
      };
    } catch (error) {
      console.error('❌ SupplierIntelligenceService: Web discovery error:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Discovery failed',
        metadata: {
          searchType: 'query',
          totalResults: 0,
          confidence: 0,
          sources: [],
        },
      };
    }
  }

  /**
   * Convert AI-extracted data format to our internal format
   */
  private convertAIExtractedData(aiData: AIExtractedSupplierData): ExtractedSupplierData {
    return {
      companyName: aiData.companyName,
      description: aiData.description,
      industry: aiData.industry,
      location: aiData.location,
      contactEmail: aiData.contactEmail,
      contactPhone: aiData.contactPhone,
      website: aiData.website,
      employees: aiData.employees,
      founded: aiData.founded,
      socialMedia: aiData.socialMedia,
      certifications: aiData.certifications,
      services: aiData.services,
      products: aiData.products,
      brands: aiData.brands, // CRITICAL: Map brands field
      categories: aiData.categories,
      brandLinks: aiData.brandLinks as SupplierBrandLink[] | undefined,
      addresses: aiData.addresses,
      revenue: aiData.revenue,
      businessType: aiData.businessType,
      tags: aiData.tags,
      taxId: aiData.taxId,
      registrationNumber: aiData.registrationNumber,
      vatNumber: aiData.vatNumber,
      currency: aiData.currency,
      paymentTerms: aiData.paymentTerms,
      leadTime: aiData.leadTime,
      minimumOrderValue: aiData.minimumOrderValue,
    };
  }

  private mergeStringLists(primary?: string[], secondary?: string[]): string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    const addList = (list?: string[]) => {
      if (!list) return;
      for (const item of list) {
        if (!item) continue;
        const cleaned = item.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, ' ').trim();
        if (!cleaned) continue;
        const key = cleaned.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          result.push(cleaned);
        }
      }
    };

    addList(primary);
    addList(secondary);

    return result;
  }

  private mergeBrandLinks(
    primary?: SupplierBrandLink[],
    secondary?: SupplierBrandLink[]
  ): SupplierBrandLink[] {
    const map = new Map<string, SupplierBrandLink>();

    const addEntry = (entry?: SupplierBrandLink) => {
      if (!entry || !entry.name) return;
      const cleanedName = entry.name.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, ' ').trim();
      if (!cleanedName) return;
      const key = cleanedName.toLowerCase();
      const existing = map.get(key);
      const resolved: SupplierBrandLink = {
        name: cleanedName,
        url: entry.url,
        logo: entry.logo,
      };
      if (existing) {
        if (!existing.url && resolved.url) existing.url = resolved.url;
        if (!existing.logo && resolved.logo) existing.logo = resolved.logo;
      } else {
        map.set(key, resolved);
      }
    };

    primary?.forEach(addEntry);
    secondary?.forEach(addEntry);

    return Array.from(map.values());
  }

  /**
   * Validate that a scraped address is actually an address, not brand/product information
   */
  private isValidScrapedAddress(address: string): boolean {
    if (!address || address.trim().length === 0) return false;

    // Reject if it contains brand/product keywords
    const invalidPatterns = [
      /^(enova|gibson|db technologies|pioneer|hpw|flx)/i,
      /\b(reliable connection|iconic guitar|loud speakers|sub-woofers|column-array|controllers|view product|check out|explore)\b/i,
      /\b(product|products|range|brand|brands|systems|applications|technology)\b/i,
      />>/g,
      /\b(explore|check out|view)\b/i,
    ];

    if (invalidPatterns.some(pattern => pattern.test(address))) {
      return false;
    }

    // Address should have at least one indicator
    const hasStreetNumber = /\d+/.test(address);
    const hasAddressKeyword =
      /\b(street|st|avenue|ave|road|rd|drive|dr|court|ct|boulevard|blvd|way|lane|ln|place|pl|parkway|pkwy)\b/i.test(
        address
      );
    const hasCityCountryPattern = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+/.test(address);
    const hasPostalCode = /\b\d{4,6}\b/.test(address);
    const isShortLocation = address.length < 100 && /[A-Z][a-z]+/.test(address);

    return (
      (hasStreetNumber ||
        hasAddressKeyword ||
        hasCityCountryPattern ||
        hasPostalCode ||
        isShortLocation) &&
      address.length < 300
    );
  }

  /**
   * Enrich AI-extracted data with rule-based scraped metadata
   * Rule-based data (email, phone, address) takes priority as it's more reliable
   */
  private enrichWithScrapedMetadata(
    data: ExtractedSupplierData,
    brands: string[],
    categories: string[],
    brandLinks: SupplierBrandLink[],
    scrapedMetadata?: {
      contactEmail?: string;
      contactPhone?: string;
      address?: string;
      socialMedia?: {
        linkedin?: string;
        twitter?: string;
        facebook?: string;
      };
    }
  ): ExtractedSupplierData {
    // Merge brands and categories (both sources are valuable)
    data.brands = this.mergeStringLists(data.brands, brands);
    data.categories = this.mergeStringLists(data.categories, categories);
    data.brandLinks = this.mergeBrandLinks(data.brandLinks, brandLinks);

    // Rule-based contact info takes priority (more reliable than AI extraction)
    if (scrapedMetadata?.contactEmail && !data.contactEmail) {
      data.contactEmail = scrapedMetadata.contactEmail;
    }
    if (scrapedMetadata?.contactPhone && !data.contactPhone) {
      data.contactPhone = scrapedMetadata.contactPhone;
    }

    // Rule-based social media links take priority
    if (scrapedMetadata?.socialMedia) {
      if (!data.socialMedia) data.socialMedia = {};
      if (scrapedMetadata.socialMedia.linkedin && !data.socialMedia.linkedin) {
        data.socialMedia.linkedin = scrapedMetadata.socialMedia.linkedin;
      }
      if (scrapedMetadata.socialMedia.twitter && !data.socialMedia.twitter) {
        data.socialMedia.twitter = scrapedMetadata.socialMedia.twitter;
      }
      if (scrapedMetadata.socialMedia.facebook && !data.socialMedia.facebook) {
        data.socialMedia.facebook = scrapedMetadata.socialMedia.facebook;
      }
    }

    // Rule-based address: if scraped address exists and AI didn't extract structured addresses,
    // create address from scraped string
    // IMPORTANT: Validate that scraped address is actually an address, not brand/product info
    const scrapedAddress = scrapedMetadata?.address;
    if (scrapedAddress && (!data.addresses || data.addresses.length === 0)) {
      // Validate it's actually an address, not brand/product information
      const invalidPatterns = [
        /^(enova|gibson|db technologies|pioneer|hpw|flx)/i,
        /\b(reliable connection|iconic guitar|loud speakers|sub-woofers|column-array|controllers|view product|check out|explore)\b/i,
        /\b(product|products|range|brand|brands|systems|applications|technology)\b/i,
        />>/g,
        /\b(explore|check out|view)\b/i,
      ];

      const isValidAddress =
        !invalidPatterns.some(pattern => pattern.test(scrapedAddress)) &&
        (/\d+/.test(scrapedAddress) ||
          /\b(street|st|avenue|ave|road|rd|drive|dr|court|ct|boulevard|blvd|way|lane|ln|place|pl)\b/i.test(
            scrapedAddress
          ));

      if (isValidAddress && scrapedAddress.length < 200) {
        // Parse scraped address string into structured format
        const addressParts = scrapedAddress.split(',').map(p => p.trim());
        if (addressParts.length > 0) {
          data.addresses = [
            {
              type: 'headquarters',
              street: addressParts[0] || '',
              city: addressParts[1] || '',
              state: addressParts[2] || '',
              postalCode: addressParts.find(p => /^\d{4,}/.test(p)) || '',
              country: addressParts[addressParts.length - 1] || '',
            },
          ];
        }
      } else {
        console.warn(
          `⚠️ Rejected scraped address (contains brand/product info or invalid format): "${scrapedAddress.substring(0, 100)}"`
        );
      }
    }

    return data;
  }

  /**
   * Extract supplier data from a website URL
   *
   * EXTRACTION STRATEGY:
   *
   * RULE-BASED EXTRACTION (fast, reliable, no AI cost):
   * - Email addresses (regex patterns)
   * - Phone numbers (regex patterns)
   * - Physical addresses (pattern matching from HTML)
   * - Social media links (HTML link extraction)
   * - Company name (from HTML h1/title tags)
   * - Brands (from HTML structure - logos, brand sections)
   * - Basic metadata (title, description from meta tags)
   *
   * AI EXTRACTION (needed for understanding/interpretation):
   * - Company description (summarization of what they do)
   * - Industry classification (understanding business type)
   * - Products/services (interpreting offerings)
   * - Categories (inferring from content/brands)
   * - Business type (legal structure understanding)
   * - Certifications (understanding what counts)
   * - Tags (keyword extraction and relevance)
   * - Structured addresses (parsing from unstructured text)
   *
   * Workflow:
   * 1. Web scraping extracts rule-based data (email, phone, address, brands)
   * 2. AI extraction enriches with understanding-based fields (description, industry, etc.)
   * 3. Results are merged, with rule-based data taking priority for accuracy
   */
  async extractFromWebsite(url: string): Promise<WebDiscoveryResult> {
    try {
      console.log(`🌐 Extracting supplier data from website: ${url}`);

      // Step 1: Scrape the main website
      const websiteContent = await this.webScrapingService.scrapeWebsite(url);

      if (!websiteContent) {
        throw new Error('Failed to scrape website content');
      }

      const scrapedBrandNames = websiteContent.metadata?.brands || [];
      const scrapedCategories = websiteContent.metadata?.categories || [];
      const scrapedBrandLinks = websiteContent.metadata?.brandLinks || [];
      const scrapedMetadata = {
        contactEmail: websiteContent.metadata?.contactEmail,
        contactPhone: websiteContent.metadata?.contactPhone,
        address: websiteContent.metadata?.address,
        socialMedia: websiteContent.metadata?.socialMedia,
      };

      // Step 1.5: Try to find and scrape brands page
      let brandsPageContent: string = '';
      try {
        const baseUrl = new URL(url);
        const brandsPageUrl = `${baseUrl.origin}/brands`; // Common brands page URL
        console.log(`🔍 Attempting to scrape brands page: ${brandsPageUrl}`);

        const brandsPage = await this.webScrapingService.scrapeWebsite(brandsPageUrl);
        if (brandsPage && brandsPage.content) {
          brandsPageContent = brandsPage.content;
          console.log(`✅ Brands page found and scraped: ${brandsPageContent.length} characters`);
        }
      } catch (error) {
        console.log(
          '⚠️ Brands page not found or inaccessible, continuing with main page',
          error instanceof Error ? error.message : error
        );
      }

      // Step 1.6: Try to find and scrape contact page (often has address info)
      let contactPageContent: string = '';
      try {
        const baseUrl = new URL(url);
        const contactPageUrls = [
          `${baseUrl.origin}/contact`,
          `${baseUrl.origin}/contact-us`,
          `${baseUrl.origin}/contactus`,
          `${baseUrl.origin}/about`,
          `${baseUrl.origin}/about-us`,
        ];

        for (const contactPageUrl of contactPageUrls) {
          try {
            console.log(`🔍 Attempting to scrape contact page: ${contactPageUrl}`);
            const contactPage = await this.webScrapingService.scrapeWebsite(contactPageUrl);
            if (contactPage && contactPage.content && contactPage.content.length > 100) {
              contactPageContent = contactPage.content;
              // Also check if contact page has address metadata
              if (
                contactPage.metadata?.address &&
                this.isValidScrapedAddress(contactPage.metadata.address)
              ) {
                scrapedMetadata.address = contactPage.metadata.address;
                console.log(`✅ Contact page found with address: "${scrapedMetadata.address}"`);
              }
              console.log(
                `✅ Contact page found and scraped: ${contactPageContent.length} characters`
              );
              break;
            }
          } catch {
            // Try next URL
            continue;
          }
        }
      } catch (error) {
        console.log(
          '⚠️ Contact page not found or inaccessible, continuing with main page',
          error instanceof Error ? error.message : error
        );
      }

      // Step 2: Extract supplier data using ALL configured AI providers
      const extractionResults: Array<{
        provider: string;
        data: ExtractedSupplierData | null;
        confidence: number;
        error?: string;
      }> = [];

      // Prepare content for extraction
      // Include scraped metadata (address, contact info) prominently in content
      const scrapedAddress = websiteContent.metadata?.address;
      const scrapedEmail = websiteContent.metadata?.contactEmail;
      const scrapedPhone = websiteContent.metadata?.contactPhone;

      let enhancedContent = websiteContent.content || '';
      if (scrapedAddress || scrapedEmail || scrapedPhone) {
        const contactSection = `\n\n=== CONTACT INFORMATION (HIGH PRIORITY) ===\n`;
        const contactParts: string[] = [];
        if (scrapedAddress) contactParts.push(`Address: ${scrapedAddress}`);
        if (scrapedEmail) contactParts.push(`Email: ${scrapedEmail}`);
        if (scrapedPhone) contactParts.push(`Phone: ${scrapedPhone}`);
        enhancedContent =
          contactSection +
          contactParts.join('\n') +
          '\n=== END CONTACT INFORMATION ===\n\n' +
          enhancedContent;
      }

      const contentForExtraction = {
        url,
        title: websiteContent.title || '',
        description: websiteContent.description || '',
        content: brandsPageContent
          ? `=== BRANDS PAGE CONTENT (HIGH PRIORITY) ===\n${brandsPageContent}\n=== END BRANDS PAGE ===\n\n${contactPageContent ? `=== CONTACT PAGE CONTENT (ADDRESS INFO) ===\n${contactPageContent}\n=== END CONTACT PAGE ===\n\n` : ''}${enhancedContent}`
          : contactPageContent
            ? `=== CONTACT PAGE CONTENT (ADDRESS INFO) ===\n${contactPageContent}\n=== END CONTACT PAGE ===\n\n${enhancedContent}`
            : enhancedContent,
        rawHtml: websiteContent.rawHtml || '',
      };

      // Try ALL enabled AI providers from config
      if (this.config?.aiProviders && this.config.aiProviders.length > 0) {
        console.log(
          `🔍 Trying ${this.config.aiProviders.length} enabled AI extraction provider(s) for extraction`
        );

        for (const aiProvider of this.config.aiProviders) {
          if (!aiProvider.enabled || !aiProvider.apiKey) continue;

          try {
            console.log(
              `🤖 Extracting with AI provider: ${aiProvider.provider}${aiProvider.model ? ` (${aiProvider.model})` : ''}`
            );

            const extractionService = createAIDataExtractionService({
              anthropicApiKey: aiProvider.provider === 'anthropic' ? aiProvider.apiKey : undefined,
              anthropicBaseUrl:
                aiProvider.provider === 'anthropic' ? aiProvider.baseUrl : undefined,
              openaiApiKey:
                aiProvider.provider === 'openai' || aiProvider.provider === 'openai_compatible'
                  ? aiProvider.apiKey
                  : undefined,
              openaiBaseUrl:
                aiProvider.provider === 'openai' || aiProvider.provider === 'openai_compatible'
                  ? aiProvider.baseUrl
                  : undefined,
              openaiModel:
                aiProvider.provider === 'openai' || aiProvider.provider === 'openai_compatible'
                  ? aiProvider.model
                  : undefined,
            });

            const aiExtracted = await extractionService.extractSupplierData(contentForExtraction);

            if (aiExtracted) {
              const converted = this.enrichWithScrapedMetadata(
                this.convertAIExtractedData(aiExtracted),
                scrapedBrandNames,
                scrapedCategories,
                scrapedBrandLinks,
                scrapedMetadata
              );
              const confidence = this.calculateConfidence(converted);
              extractionResults.push({
                provider: `${aiProvider.provider}${aiProvider.model ? `:${aiProvider.model}` : ''}`,
                data: converted,
                confidence,
              });
              console.log(
                `✅ AI provider "${aiProvider.provider}" extraction successful (confidence: ${confidence}%)`
              );
            } else {
              console.warn(
                `⚠️ AI provider "${aiProvider.provider}" extraction returned null (model may have failed to generate response)`
              );
              extractionResults.push({
                provider: `${aiProvider.provider}${aiProvider.model ? `:${aiProvider.model}` : ''}`,
                data: null,
                confidence: 0,
                error: 'AI extraction returned null - model may have failed to generate response',
              });
            }
          } catch (error) {
            console.warn(`⚠️ AI provider "${aiProvider.provider}" extraction failed:`, error);
            extractionResults.push({
              provider: aiProvider.provider,
              data: null,
              confidence: 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      // Fallback: Try default providers if no aiProviders array (backward compatibility)
      if (extractionResults.length === 0) {
        try {
          const aiExtracted =
            await this.aiDataExtractionService.extractSupplierData(contentForExtraction);
          if (aiExtracted) {
            const converted = this.enrichWithScrapedMetadata(
              this.convertAIExtractedData(aiExtracted),
              scrapedBrandNames,
              scrapedCategories,
              scrapedBrandLinks,
              scrapedMetadata
            );
            const confidence = this.calculateConfidence(converted);
            extractionResults.push({
              provider: 'default',
              data: converted,
              confidence,
            });
            console.log(`✅ Default AI extraction successful (confidence: ${confidence}%)`);
          }
        } catch (error) {
          console.warn('⚠️ Default AI extraction failed:', error);
          extractionResults.push({
            provider: 'default',
            data: null,
            confidence: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Try all enabled custom providers
      if (this.config?.customProviders) {
        const customProviders = Object.entries(this.config.customProviders).filter(
          ([, provider]) =>
            provider.enabled !== false && provider.apiKey && provider.apiUrl && provider.model
        );

        console.log(`🔍 Trying ${customProviders.length} custom AI providers`);

        for (const [providerName, providerConfig] of customProviders) {
          try {
            console.log(
              `🤖 Extracting with custom provider: ${providerName} (${providerConfig.model})`
            );

            const customExtracted = await this.extractWithCustomProvider(
              contentForExtraction,
              providerConfig.apiKey,
              providerConfig.apiUrl!,
              providerConfig.model!
            );

            if (customExtracted) {
              const converted = this.enrichWithScrapedMetadata(
                this.convertAIExtractedData(customExtracted),
                scrapedBrandNames,
                scrapedCategories,
                scrapedBrandLinks,
                scrapedMetadata
              );
              const confidence = this.calculateConfidence(converted);
              extractionResults.push({
                provider: providerName,
                data: converted,
                confidence,
              });
              console.log(
                `✅ Custom provider "${providerName}" extraction successful (confidence: ${confidence}%)`
              );
            }
          } catch (error) {
            console.warn(`⚠️ Custom provider "${providerName}" extraction failed:`, error);
            extractionResults.push({
              provider: providerName,
              data: null,
              confidence: 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      // Aggregate results from all providers
      const successfulResults = extractionResults.filter(r => r.data !== null);

      if (successfulResults.length === 0) {
        // Fallback to legacy extraction if all AI providers failed
        console.log('⚠️ All AI providers failed, using fallback extraction');
        const fallbackData = await this.dataExtractionEngine.extractSupplierData({
          url,
          title: websiteContent.title || '',
          description: websiteContent.description || '',
          content: websiteContent.content || '',
          rawHtml: websiteContent.rawHtml || '',
          metadata: websiteContent.metadata || {},
          extractionDate: new Date().toISOString(),
        });

        if (!fallbackData) {
          throw new Error('No supplier data found on website');
        }

        const enrichedFallback = this.enrichWithScrapedMetadata(
          fallbackData,
          scrapedBrandNames,
          scrapedCategories,
          scrapedBrandLinks,
          scrapedMetadata
        );

        const confidence = this.calculateConfidence(enrichedFallback);
        return {
          success: true,
          data: [enrichedFallback],
          metadata: {
            searchType: 'website',
            totalResults: 1,
            confidence,
            sources: [new URL(url).hostname],
          },
        };
      }

      // Merge results from all providers
      const aggregatedData = this.aggregateExtractionResults(successfulResults.map(r => r.data!));
      const enrichedAggregatedData = this.enrichWithScrapedMetadata(
        aggregatedData,
        scrapedBrandNames,
        scrapedCategories,
        scrapedBrandLinks,
        scrapedMetadata
      );

      // Apply final brand filtering to remove products/duplicates that may have been added from scraped data
      if (enrichedAggregatedData.brands && enrichedAggregatedData.brands.length > 0) {
        enrichedAggregatedData.brands = this.filterAndDeduplicateBrands(
          enrichedAggregatedData.brands
        );
      }

      const avgConfidence = Math.round(
        successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length
      );

      console.log(
        `✅ Aggregated extraction from ${successfulResults.length} AI extraction provider(s) (avg confidence: ${avgConfidence}%)`
      );

      return {
        success: true,
        data: [enrichedAggregatedData],
        metadata: {
          searchType: 'website',
          totalResults: 1,
          confidence: avgConfidence,
          sources: [new URL(url).hostname, ...successfulResults.map(r => r.provider)],
        },
      };
    } catch (error) {
      console.error('Website extraction error:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Website extraction failed',
        metadata: {
          searchType: 'website',
          totalResults: 0,
          confidence: 0,
          sources: [],
        },
      };
    }
  }

  /**
   * Transform web discovery data to comprehensive supplier form format
   */
  transformToFormData(
    webData: ExtractedSupplierData,
    originalQuery?: string
  ): Partial<SupplierFormData> {
    const primaryAddress = webData.addresses?.[0];
    const website =
      webData.website ||
      (webData.companyName
        ? `https://www.${webData.companyName.toLowerCase().replace(/\s+/g, '')}.com`
        : '');

    // Enhanced business info with all available data
    const businessInfo: SupplierFormData['businessInfo'] = {
      legalName: this.generateLegalName(webData.companyName, webData.businessType),
      tradingName: webData.companyName || originalQuery || '',
      website: webData.website || website,
      currency: webData.currency || this.inferCurrencyFromLocation(webData.location),
      description:
        webData.description ||
        `Professional ${webData.industry?.toLowerCase() || 'services'} provider`,
      tags: this.combineAllTags(webData),
    };

    // Add optional fields if available
    if (webData.employees) businessInfo.employeeCount = this.parseEmployeeCount(webData.employees);
    if (webData.founded) businessInfo.foundedYear = this.parseYear(webData.founded);
    const parsedRevenue = this.parseRevenue(webData.revenue);
    if (parsedRevenue !== undefined) businessInfo.annualRevenue = parsedRevenue;
    if (webData.taxId) businessInfo.taxId = webData.taxId;
    if (webData.registrationNumber) businessInfo.registrationNumber = webData.registrationNumber;

    const transformedData: Partial<SupplierFormData> = {
      name: webData.companyName || originalQuery || '',
      code: this.generateSupplierCode(webData.companyName || originalQuery || ''),
      status: 'pending',
      tier: 'approved',
      categories: this.extractCategories(webData),
      tags: this.combineAllTags(webData),
      brands: this.extractBrands(webData),
      businessInfo,
      capabilities: {
        products: webData.products || [],
        services: webData.services || [],
        paymentTerms: webData.paymentTerms,
        leadTime: webData.leadTime ? this.parseLeadTime(webData.leadTime) : undefined,
        certifications: webData.certifications || [],
        minimumOrderValue: this.parseNumericValue(webData.minimumOrderValue),
      },
    };

    // Add financial information
    if (webData.currency || webData.paymentTerms || webData.minimumOrderValue) {
      transformedData.financial = {
        currency: webData.currency || businessInfo.currency || 'ZAR',
        paymentTerms: webData.paymentTerms,
      };
    }

    // Add contact information
    if (webData.contactEmail || webData.contactPhone) {
      transformedData.contacts = [
        {
          type: 'primary',
          name: webData.contactPerson || 'General Contact',
          email: webData.contactEmail,
          phone: webData.contactPhone,
          title: 'Contact Person',
          isPrimary: true,
          isActive: true,
        },
      ];
    }

    // Add addresses with enhanced processing
    if (primaryAddress) {
      transformedData.addresses = [
        {
          type: this.normalizeAddressType(primaryAddress.type),
          name: 'Head Office',
          addressLine1: primaryAddress.street || '',
          addressLine2: '',
          city: primaryAddress.city || '',
          state:
            primaryAddress.state ||
            this.extractStateFromLocation(primaryAddress.country, primaryAddress.city),
          postalCode: primaryAddress.postalCode || '',
          country: primaryAddress.country || 'South Africa',
          isPrimary: true,
          isActive: true,
        },
      ];

      // Add additional addresses if available
      if (webData.addresses && webData.addresses.length > 1) {
        const additionalAddresses = webData.addresses.slice(1).map((addr, index) => ({
          type: this.normalizeAddressType(addr.type),
          name: `${addr.type || 'Address'} ${index + 2}`,
          addressLine1: addr.street || '',
          addressLine2: '',
          city: addr.city || '',
          state: addr.state || this.extractStateFromLocation(addr.country, addr.city),
          postalCode: addr.postalCode || '',
          country: addr.country || 'South Africa',
          isPrimary: false,
          isActive: true,
        }));
        transformedData.addresses.push(...additionalAddresses);
      }
    } else if (webData.location) {
      transformedData.addresses = this.generateDefaultAddress(webData.location);
    }

    // Ensure tags are set (already set above, but ensure it's there)
    if (!transformedData.tags || transformedData.tags.length === 0) {
      transformedData.tags = this.combineAllTags(webData);
    }

    // Ensure brands are set (already set above, but ensure it's there)
    if (!transformedData.brands || transformedData.brands.length === 0) {
      transformedData.brands = this.extractBrands(webData);
    }

    // Add performance metrics
    transformedData.performance = {
      rating: this.calculatePerformanceRating(webData),
      tier: this.determinePerformanceTier(webData),
    };

    return transformedData;
  }

  /**
   * Generate subcategory from industry and services (deprecated - categories replaced subcategory)
   * @deprecated Categories array replaced subcategory field
   */
  private generateSubcategory(industry?: string, services?: string[]): string {
    if (!industry && !services) return '';

    const industryLower = (industry || '').toLowerCase();
    const servicesText = (services || []).join(' ').toLowerCase();
    const combined = `${industryLower} ${servicesText}`;

    // Extract specific subcategories based on keywords
    if (combined.includes('distribution') || combined.includes('distributor')) {
      return 'Distribution';
    }
    if (combined.includes('retail') || combined.includes('retailer')) {
      return 'Retail';
    }
    if (combined.includes('wholesale') || combined.includes('wholesaler')) {
      return 'Wholesale';
    }
    if (combined.includes('manufacturing') || combined.includes('manufacturer')) {
      return 'Manufacturing';
    }
    if (combined.includes('import') || combined.includes('importer')) {
      return 'Import/Export';
    }
    if (combined.includes('export') || combined.includes('exporter')) {
      return 'Import/Export';
    }
    if (combined.includes('service') || combined.includes('consulting')) {
      return 'Professional Services';
    }

    return industry || '';
  }

  /**
   * Filter and deduplicate brands using the same logic as AIDataExtractionService
   * Removes products, product descriptions, duplicates, and normalizes brand names
   */
  private filterAndDeduplicateBrands(brands: string[]): string[] {
    if (!brands || brands.length === 0) return [];

    // Same patterns as AIDataExtractionService
    const productServicePatterns = [
      /platform/i,
      /service/i,
      /product/i,
      /solution/i,
      /system/i,
      /software/i,
      /application/i,
      /digital distribution/i,
      /physical.*distribution/i,
      /marketing.*service/i,
      /development.*program/i,
      /management/i,
      /optimization/i,
      /publishing/i,
      /royalty/i,
      /streaming/i,
    ];

    const uiElementPatterns = [
      /^(site|page|web|button|link|menu|nav|header|footer|sidebar)/i,
      /(site|page|web|button|link|menu|nav|header|footer|sidebar)\s+\d+/i,
      /button\s*\d+/i,
      /site\s+button/i,
      /page\s+button/i,
      /subscribe/i,
      /newsletter/i,
      /magazine/i,
      /image\s+\d+/i,
      /whatsapp\s+image/i,
      /logo\s+\d+/i,
      /asset\s+\d+/i,
      /^\d+\s*$/,
      /^[a-z]+\s+\d+$/i,
      /front$/i,
      /back$/i,
      /top$/i,
      /side$/i,
    ];

    const productModelPatterns = [
      /\b(hpw|xdj|grv|at-|lt-|mk\d+|series|pack|replacement|stylus|groovebox|pedal|bass pack)\b/i,
      /\b\d{3,}\b/,
      /[a-z]+\d{2,}[a-z]*/i,
      /[a-z]+-\d+/i,
      /\b(replacement|stylus|pedal|pack|groovebox|track|front|back|top|side)\b/i,
      /\b(from|to|the|of|and|or)\b/i,
      /\b\d+\s*(track|channel|series|mk|model)\b/i,
      /\b[A-Z]{2,}-\w+\d+\w*\b/i,
    ];

    const magazinePatterns = [
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/i,
      /\d{4}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      /\b(soundpress|musicgear|magazine|blog|article|musical-instruments)\b/i,
      /-\d{4}$/i,
      /\b(subscribe|subsribe)\b/i,
    ];

    const filteredBrands = brands.filter(brand => {
      const brandTrimmed = brand.trim();
      const brandLower = brandTrimmed.toLowerCase();

      if (brandTrimmed.length < 2 || brandTrimmed.length > 40) return false;
      if (!brandTrimmed.match(/[a-z]/i)) return false;
      if (/^\d+$/.test(brandTrimmed)) return false;

      if (productServicePatterns.some(p => p.test(brandLower))) return false;
      if (uiElementPatterns.some(p => p.test(brandLower))) return false;
      if (productModelPatterns.some(p => p.test(brandTrimmed))) return false;
      if (magazinePatterns.some(p => p.test(brandLower))) return false;

      const wordCount = brandTrimmed.split(/\s+/).length;
      if (wordCount > 3) return false;
      if (/\b[A-Z]{2,}-\w+\d+\w*\b/i.test(brandTrimmed)) return false;
      if (/[a-z]+\d{3,}/i.test(brandTrimmed) || /\d{3,}[a-z]*/i.test(brandTrimmed)) return false;
      if (brandTrimmed.match(/^[a-z]/) && wordCount > 1) return false;

      return true;
    });

    // Deduplicate and normalize
    const brandMap = new Map<string, string>();
    filteredBrands.forEach(brand => {
      const normalized = brand
        .toLowerCase()
        .replace(/[\s\u00A0\u200B-\u200D\uFEFF\-_™®©]+/g, '')
        .trim();
      const existing = brandMap.get(normalized);

      if (!existing) {
        brandMap.set(normalized, brand);
      } else {
        const currentNormalized = brand.toLowerCase().replace(/[\s\-_]/g, '');
        const existingNormalized = existing.toLowerCase().replace(/[\s\-_]/g, '');
        if (currentNormalized === existingNormalized) {
          if (brand.match(/^[A-Z]/) && !existing.match(/^[A-Z]/)) {
            brandMap.set(normalized, brand);
          } else if (brand.includes('-') && !existing.includes('-') && brand.match(/^[A-Z]/)) {
            brandMap.set(normalized, brand);
          } else if (!brand.includes(' ') && existing.includes(' ') && brand.match(/^[A-Z]/)) {
            brandMap.set(normalized, brand);
          }
        }
      }
    });

    return Array.from(brandMap.values()).sort();
  }

  /**
   * Extract brands from supplier data
   * Prioritizes brands field from AI extraction, falls back to extracting from products
   * Also uses categories to infer brands if needed
   */
  private extractBrands(webData: ExtractedSupplierData): string[] {
    const brands: string[] = [];

    // First priority: Use brands directly extracted by AI (from Brands tab/section)
    if (webData.brands && webData.brands.length > 0) {
      // Clean and deduplicate brand names
      const cleanedBrands = webData.brands
        .map(brand => brand.trim())
        .filter(brand => brand.length > 0)
        .filter((brand, index, self) => self.indexOf(brand) === index); // Remove duplicates
      brands.push(...cleanedBrands);
      console.log(
        `✅ Found ${cleanedBrands.length} brands from AI extraction:`,
        cleanedBrands.slice(0, 10)
      );
      return brands; // Return immediately if we have brands from AI
    }

    console.warn('⚠️ No brands found in webData.brands, attempting fallback extraction');

    // Fallback: Try to extract from products if no brands found
    if (webData.products && webData.products.length > 0) {
      // Try to identify brand names from product names
      const brandPatterns = [
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s/, // Capitalized words at start
        /by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i, // "by BrandName"
        /\(([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\)/, // (BrandName)
        /\b([A-Z]{2,}(?:\s+[A-Z]+)?)\b/, // All caps brand names like "KRK", "MIDAS", "HK AUDIO"
      ];

      const foundBrands = new Set<string>();
      for (const product of webData.products.slice(0, 20)) {
        for (const pattern of brandPatterns) {
          const match = product.match(pattern);
          if (match && match[1]) {
            const potentialBrand = match[1].trim();
            // Filter out common false positives
            if (
              potentialBrand.length > 2 &&
              potentialBrand.length < 50 &&
              !potentialBrand.match(/^(THE|AND|FOR|WITH|FROM|THIS|THAT|THESE|THOSE)$/i)
            ) {
              foundBrands.add(potentialBrand);
            }
          }
        }
      }

      if (foundBrands.size > 0) {
        brands.push(...Array.from(foundBrands).slice(0, 20));
        console.log(
          `⚠️ Extracted ${foundBrands.size} brands from products (fallback):`,
          Array.from(foundBrands).slice(0, 10)
        );
      }
    }

    if (brands.length === 0) {
      console.error('❌ NO BRANDS EXTRACTED - Check AI extraction and brands page scraping');
    }

    return brands;
  }

  /**
   * Generate appropriate legal name
   */
  private generateLegalName(companyName?: string, businessType?: string): string {
    if (!companyName) return 'New Supplier (Pty) Ltd';

    const suffix = this.getBusinessSuffix(businessType);
    return `${companyName} ${suffix}`.trim();
  }

  /**
   * Get appropriate business suffix
   */
  private getBusinessSuffix(businessType?: string): string {
    if (businessType?.toLowerCase().includes('international')) return 'International';
    if (businessType?.toLowerCase().includes('corporation')) return 'Corp';
    if (businessType?.toLowerCase().includes('limited')) return 'Ltd';
    if (businessType?.toLowerCase().includes('inc')) return 'Inc';

    // Default to South African business structure
    return '(Pty) Ltd';
  }

  /**
   * Infer currency from location
   */
  private inferCurrencyFromLocation(location?: string): string {
    if (!location) return 'ZAR';

    const locationLower = location.toLowerCase();

    if (
      locationLower.includes('south africa') ||
      locationLower.includes('cape town') ||
      locationLower.includes('johannesburg') ||
      locationLower.includes('durban')
    ) {
      return 'ZAR';
    }
    if (
      locationLower.includes('europe') ||
      locationLower.includes('germany') ||
      locationLower.includes('france') ||
      locationLower.includes('uk')
    ) {
      return 'EUR';
    }
    if (locationLower.includes('usa') || locationLower.includes('america')) {
      return 'USD';
    }

    return 'ZAR'; // Default
  }

  /**
   * Extract state from location
   */
  private extractStateFromLocation(country?: string, city?: string): string {
    if (country === 'South Africa' && city) {
      const cityStateMap: Record<string, string> = {
        'cape town': 'Western Cape',
        johannesburg: 'Gauteng',
        durban: 'KwaZulu-Natal',
        pretoria: 'Gauteng',
      };
      return cityStateMap[city.toLowerCase()] || 'Gauteng';
    }

    return country === 'Germany'
      ? 'Bavaria'
      : country === 'USA'
        ? 'California'
        : country || 'Unknown';
  }

  /**
   * Generate default address if none found
   */
  private generateDefaultAddress(location?: string): SupplierFormAddress[] {
    if (!location) return [];

    return [
      {
        type: 'headquarters',
        name: 'Head Office',
        addressLine1: '123 Business Street',
        addressLine2: '',
        city: location.split(',')[0]?.trim() || 'Unknown City',
        state: this.extractStateFromLocation(undefined, location.split(',')[0]),
        postalCode: '0001',
        country: location.includes('South Africa') ? 'South Africa' : 'Unknown',
        isPrimary: true,
        isActive: true,
      },
    ];
  }

  /**
   * Combine all possible tags
   */
  private combineAllTags(webData: ExtractedSupplierData): string[] {
    const allTags: string[] = [...(webData.tags || [])];

    // Add industry tag
    if (webData.industry) {
      allTags.push(webData.industry.toLowerCase());
    }

    // Add service tags
    if (webData.services) {
      allTags.push(...webData.services.map(s => s.toLowerCase()));
    }

    // Add product tags
    if (webData.products) {
      allTags.push(...webData.products.map(p => p.toLowerCase()));
    }

    // Add certification tags
    if (webData.certifications) {
      allTags.push(...webData.certifications.map(c => c.toLowerCase()));
    }

    // Remove duplicates and limit
    return [...new Set(allTags)].slice(0, 20);
  }

  /**
   * Calculate performance rating based on available data
   */
  private calculatePerformanceRating(webData: ExtractedSupplierData): number {
    let score = 3.0; // Base score

    // Boost for certifications
    if (webData.certifications?.length) {
      score += webData.certifications.length * 0.2;
    }

    // Boost for established companies
    if (webData.founded) {
      const foundedYear = this.parseYear(webData.founded);
      if (foundedYear) {
        const currentYear = new Date().getFullYear();
        const yearsInBusiness = currentYear - foundedYear;
        if (yearsInBusiness > 10) score += 0.5;
        else if (yearsInBusiness > 5) score += 0.3;
      }
    }

    // Boost for comprehensive contact information
    if (webData.contactEmail && webData.contactPhone) {
      score += 0.3;
    }

    return Math.min(5.0, Math.max(1.0, score));
  }

  /**
   * Determine performance tier
   */
  private determinePerformanceTier(webData: ExtractedSupplierData): string {
    const rating = this.calculatePerformanceRating(webData);

    if (rating >= 4.5) return 'platinum';
    if (rating >= 4.0) return 'gold';
    if (rating >= 3.5) return 'silver';
    if (rating >= 3.0) return 'bronze';
    return 'unrated';
  }

  /**
   * Generate supplier code
   */
  private generateSupplierCode(name: string): string {
    if (!name) return 'SUP-' + Date.now().toString().slice(-6);

    const prefix = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 3)
      .join('');

    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${timestamp}`;
  }

  /**
   * Calculate confidence score for extracted data
   */
  private calculateConfidence(data: ExtractedSupplierData): number {
    let score = 0;
    let maxScore = 0;

    // Company name (high weight)
    if (data.companyName) score += 30;
    maxScore += 30;

    // Contact information
    if (data.contactEmail) score += 15;
    if (data.contactPhone) score += 10;
    maxScore += 25;

    // Location
    if (data.location) score += 10;
    maxScore += 10;

    // Business details
    if (data.industry) score += 10;
    if (data.website) score += 10;
    if (data.employees) score += 5;
    if (data.founded) score += 5;
    maxScore += 30;

    // Services/Products
    if (data.services && data.services.length > 0) score += 2.5;
    if (data.products && data.products.length > 0) score += 2.5;
    maxScore += 5;

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Calculate overall confidence for multiple results
   */
  private calculateOverallConfidence(results: ExtractedSupplierData[]): number {
    if (results.length === 0) return 0;

    const totalScore = results.reduce((sum, result) => sum + this.calculateConfidence(result), 0);
    return Math.round(totalScore / results.length);
  }

  /**
   * Normalize various address type strings to the allowed union
   */
  private normalizeAddressType(type?: string): SupplierFormAddress['type'] {
    switch ((type || '').toLowerCase()) {
      case 'billing':
        return 'billing';
      case 'shipping':
      case 'distribution':
        return 'shipping';
      case 'warehouse':
        return 'warehouse';
      case 'manufacturing':
      case 'factory':
        return 'manufacturing';
      case 'headquarters':
      case 'hq':
      case 'office':
        return 'headquarters';
      default:
        return 'headquarters';
    }
  }

  /**
   * Parse revenue strings like "$1.2M" or "ZAR 5000000" into numeric values
   */
  private parseRevenue(revenue: unknown): number | undefined {
    if (typeof revenue === 'number' && Number.isFinite(revenue)) {
      return revenue;
    }

    if (typeof revenue === 'string') {
      const cleaned = revenue.replace(/[, ]+/g, '').toLowerCase();
      const multiplier =
        cleaned.includes('b') && !cleaned.includes('kb')
          ? 1_000_000_000
          : cleaned.includes('m')
            ? 1_000_000
            : cleaned.includes('k')
              ? 1_000
              : 1;

      const numericPart = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
      if (Number.isFinite(numericPart)) {
        return numericPart * multiplier;
      }
    }

    return undefined;
  }

  /**
   * Parse generic numeric values from strings with units/currency
   */
  private parseNumericValue(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const numeric = parseFloat(value.replace(/[^0-9.]/g, ''));
      return Number.isFinite(numeric) ? numeric : undefined;
    }
    return undefined;
  }

  /**
   * Parse lead time from various text formats
   */
  private parseLeadTime(leadTimeText: string): number | undefined {
    // Extract numbers from text like "5-7 days", "2 weeks", "30 days", etc.
    const dayMatch = leadTimeText.match(/(\d+)\s*(?:-|\s+to\s+)?(\d+)?\s*(?:days?|d)/i);
    if (dayMatch) {
      const min = parseInt(dayMatch[1]);
      const max = dayMatch[2] ? parseInt(dayMatch[2]) : min;
      return Math.round((min + max) / 2); // Return average
    }

    const weekMatch = leadTimeText.match(/(\d+)\s*(?:-|\s+to\s+)?(\d+)?\s*(?:weeks?|w)/i);
    if (weekMatch) {
      const min = parseInt(weekMatch[1]) * 7;
      const max = weekMatch[2] ? parseInt(weekMatch[2]) * 7 : min;
      return Math.round((min + max) / 2);
    }

    // Just extract first number if no unit found
    const numberMatch = leadTimeText.match(/(\d+)/);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      if (num > 0 && num < 365) {
        return num;
      }
    }

    return undefined;
  }

  /**
   * Parse year from various formats
   */
  private parseYear(foundedText: string): number | undefined {
    const yearMatch = foundedText.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      const currentYear = new Date().getFullYear();
      if (year >= 1800 && year <= currentYear) {
        return year;
      }
    }
    return undefined;
  }

  /**
   * Parse employee count from various text formats
   */
  private parseEmployeeCount(employeeText: string): number | undefined {
    // Extract numbers from text like "500 employees", "1,200+ staff", etc.
    const numberMatch = employeeText.match(/([\d,]+)/);
    if (numberMatch) {
      const count = parseInt(numberMatch[1].replace(/,/g, ''));
      if (count > 0 && count < 1000000) {
        // Reasonable bounds
        return count;
      }
    }
    return undefined;
  }

  /**
   * Extract product categories from supplier data
   * Maps products/services/industry/brands to product categories
   */
  private extractCategories(webData: ExtractedSupplierData): string[] {
    const categories: string[] = this.mergeStringLists(webData.categories, []);

    // Include brands in the text analysis to infer categories from brand names
    const allText = [
      webData.industry || '',
      ...(webData.products || []),
      ...(webData.services || []),
      ...(webData.brands || []), // CRITICAL: Use brands to infer categories
      webData.description || '',
    ]
      .join(' ')
      .toLowerCase();

    console.log(
      `🔍 Extracting categories from: industry="${webData.industry}", brands=${webData.brands?.length || 0}, products=${webData.products?.length || 0}`
    );

    // Brand-to-category mappings (knowing specific brands helps categorize)
    const brandCategoryMap: Record<string, string[]> = {
      // DJ Brands
      'pioneer dj': ['DJ Equipment', 'Turntables', 'Mixers', 'Controllers'],
      pioneer: ['DJ Equipment', 'Turntables', 'Mixers'],
      alphatheta: ['DJ Equipment', 'Mixers', 'Controllers'],
      numark: ['DJ Equipment', 'Turntables', 'Mixers'],
      reloop: ['DJ Equipment', 'Turntables', 'Controllers'],

      // Audio Brands
      yamaha: ['Musical Instruments', 'Keyboards', 'Amplifiers', 'Speakers', 'Audio Interfaces'],
      shure: ['Studio Microphones', 'Headphones', 'Live Sound Equipment'],
      'audio-technica': ['Studio Microphones', 'Headphones'],
      sennheiser: ['Studio Microphones', 'Headphones'],
      akg: ['Studio Microphones', 'Headphones'],

      // Musical Instrument Brands
      gibson: ['Musical Instruments', 'Guitars & Basses'],
      epiphone: ['Musical Instruments', 'Guitars & Basses'],
      fender: ['Musical Instruments', 'Guitars & Basses', 'Amplifiers'],
      ibanez: ['Musical Instruments', 'Guitars & Basses'],

      // Studio/Recording Brands
      'krk systems': ['Studio Monitors', 'Speakers'],
      krk: ['Studio Monitors', 'Speakers'],
      tannoy: ['Studio Monitors', 'Speakers'],
      'adam audio': ['Studio Monitors', 'Speakers'],
      neumann: ['Studio Microphones'],
      uad: ['Audio Interfaces', 'Recording Equipment'],
      focusrite: ['Audio Interfaces', 'Recording Equipment'],
      presonus: ['Audio Interfaces', 'Recording Equipment'],

      // Pro Audio Brands
      midas: ['Mixers', 'Live Sound Equipment'],
      'klark teknik': ['Live Sound Equipment', 'Effects & Pedals'],
      turbosound: ['Speakers', 'Live Sound Equipment'],
      'lab.gruppen': ['Amplifiers', 'Live Sound Equipment'],
      powersoft: ['Amplifiers', 'Live Sound Equipment'],
      'hk audio': ['Speakers', 'Live Sound Equipment'],
      'dbt technologies': ['Speakers', 'Live Sound Equipment'],
      dbtechnologies: ['Speakers', 'Live Sound Equipment'],

      // Pro Audio Specific Brands (from Pro Audio website)
      aeroband: ['Musical Instruments', 'Controllers'],
      'carry-on': ['Cases & Bags'],
      enova: ['Lighting Equipment'],
      kramer: ['Guitars & Basses'],
      maestro: ['Musical Instruments'],
      nord: ['Keyboards', 'Synthesizers'],
      'power works': ['Amplifiers', 'Live Sound Equipment'],
      'sonance beyond sound': ['Speakers', 'Live Sound Equipment'],
      steinberger: ['Guitars & Basses'],
      'sound town': ['Speakers', 'Live Sound Equipment'],
      'swiff audio': ['Speakers', 'Live Sound Equipment'],

      // Software Brands
      steinberg: ['Software', 'Recording Equipment'],
      ableton: ['Software', 'Controllers'],
      'native instruments': ['Software', 'Controllers', 'Synthesizers'],
      arturia: ['Software', 'Synthesizers', 'Controllers'],
    };

    // First, check brands for direct category mappings
    if (webData.brands && webData.brands.length > 0) {
      for (const brand of webData.brands) {
        const brandLower = brand.toLowerCase();
        for (const [brandKey, categoryList] of Object.entries(brandCategoryMap)) {
          if (brandLower.includes(brandKey) || brandKey.includes(brandLower)) {
            for (const category of categoryList) {
              if (!categories.includes(category)) {
                categories.push(category);
                console.log(`✅ Category "${category}" inferred from brand "${brand}"`);
              }
            }
          }
        }
      }
    }

    // Product category mappings based on keywords
    const categoryMappings: Record<string, string[]> = {
      'DJ Equipment': [
        'dj',
        'turntable',
        'mixer',
        'controller',
        'cdj',
        'vinyl',
        'pioneer dj',
        'alphatheta',
      ],
      Mixers: ['mixer', 'mixing', 'audio mixer', 'dj mixer', 'studio mixer', 'midas'],
      'Musical Instruments': [
        'instrument',
        'guitar',
        'piano',
        'keyboard',
        'drum',
        'violin',
        'saxophone',
        'gibson',
        'epiphone',
        'yamaha',
      ],
      'Studio Microphones': [
        'microphone',
        'mic',
        'studio mic',
        'condenser',
        'dynamic mic',
        'shure',
        'audio-technica',
        'neumann',
      ],
      Turntables: ['turntable', 'record player', 'vinyl player', 'platter'],
      Headphones: [
        'headphone',
        'headset',
        'earphone',
        'earbud',
        'shure',
        'audio-technica',
        'sennheiser',
      ],
      Speakers: [
        'speaker',
        'monitor',
        'woofer',
        'tweeter',
        'subwoofer',
        'krk',
        'tannoy',
        'turbosound',
      ],
      'Audio Interfaces': [
        'audio interface',
        'sound card',
        'usb interface',
        'firewire',
        'focusrite',
        'presonus',
      ],
      'Studio Monitors': [
        'studio monitor',
        'monitor speaker',
        'reference monitor',
        'krk',
        'tannoy',
        'adam',
      ],
      'Recording Equipment': ['recording', 'recorder', 'multitrack', 'daw'],
      'Live Sound Equipment': [
        'live sound',
        'pa system',
        'public address',
        'live audio',
        'midas',
        'turbosound',
      ],
      'Lighting Equipment': ['lighting', 'light', 'led', 'stage light', 'dmx'],
      'Cables & Accessories': ['cable', 'connector', 'adapter', 'patch', 'xlr', 'trs'],
      Software: ['software', 'daw', 'plugin', 'vst', 'au', 'aax', 'ableton', 'steinberg'],
      Controllers: ['controller', 'midi controller', 'pad controller', 'native instruments'],
      Synthesizers: ['synthesizer', 'synth', 'synthesis', 'arturia', 'native instruments'],
      Keyboards: ['keyboard', 'piano', 'digital piano', 'workstation', 'yamaha'],
      'Guitars & Basses': [
        'guitar',
        'bass',
        'electric guitar',
        'acoustic guitar',
        'gibson',
        'epiphone',
        'fender',
      ],
      'Drums & Percussion': ['drum', 'percussion', 'drum kit', 'cymbal', 'snare'],
      'Wind Instruments': ['saxophone', 'trumpet', 'flute', 'clarinet', 'trombone'],
      'String Instruments': ['violin', 'viola', 'cello', 'double bass', 'harp'],
      Amplifiers: ['amplifier', 'amp', 'guitar amp', 'bass amp', 'yamaha', 'fender', 'blackstar'],
      'Effects & Pedals': ['pedal', 'effect', 'distortion', 'reverb', 'delay', 'klark teknik'],
      'Cases & Bags': ['case', 'bag', 'gig bag', 'hard case', 'soft case'],
    };

    // Check each category mapping
    for (const [category, keywords] of Object.entries(categoryMappings)) {
      if (keywords.some(keyword => allText.includes(keyword))) {
        if (!categories.includes(category)) {
          categories.push(category);
        }
      }
    }

    // If no categories found, try to infer from industry
    if (categories.length === 0 && webData.industry) {
      const industryLower = webData.industry.toLowerCase();
      if (
        industryLower.includes('music') ||
        industryLower.includes('audio') ||
        industryLower.includes('sound')
      ) {
        categories.push('Musical Instruments');
      } else if (industryLower.includes('technology') || industryLower.includes('electronics')) {
        categories.push('Electronics');
      } else {
        categories.push('Other');
      }
    }

    // Default fallback
    if (categories.length === 0) {
      categories.push('Other');
    }

    console.log(`✅ Extracted ${categories.length} categories:`, categories);
    return categories;
  }

  /**
   * Map industry text to category (deprecated - use extractCategories instead)
   * @deprecated Use extractCategories instead
   */
  private mapIndustryToCategory(industry: string): string {
    const lowerIndustry = industry.toLowerCase();

    if (
      lowerIndustry.includes('technology') ||
      lowerIndustry.includes('software') ||
      lowerIndustry.includes('it')
    ) {
      return 'Technology';
    }
    if (lowerIndustry.includes('manufacturing') || lowerIndustry.includes('production')) {
      return 'Manufacturing';
    }
    if (
      lowerIndustry.includes('logistics') ||
      lowerIndustry.includes('shipping') ||
      lowerIndustry.includes('transport')
    ) {
      return 'Logistics';
    }
    if (lowerIndustry.includes('service') || lowerIndustry.includes('consulting')) {
      return 'Services';
    }
    if (lowerIndustry.includes('material') || lowerIndustry.includes('supply')) {
      return 'Materials';
    }
    if (lowerIndustry.includes('music') || lowerIndustry.includes('instrument')) {
      return 'Musical Instruments';
    }
    if (lowerIndustry.includes('electronic') || lowerIndustry.includes('electrical')) {
      return 'Electronics';
    }

    return 'Services'; // Default fallback
  }

  /**
   * Extract data using a custom AI provider
   */
  private async extractWithCustomProvider(
    content: {
      url: string;
      title: string;
      description: string;
      content?: string;
      rawHtml?: string;
    },
    apiKey: string,
    apiUrl: string,
    model: string
  ): Promise<AIExtractedSupplierData | null> {
    // Determine provider type from API URL
    const isOpenAICompatible =
      apiUrl.includes('openai') || apiUrl.includes('v1') || apiUrl.includes('/v1');
    const isAnthropicCompatible = apiUrl.includes('anthropic') || apiUrl.includes('claude');

    // Prepare content for AI
    const textContent = this.prepareContentForAI(content);

    try {
      if (isOpenAICompatible || (!isAnthropicCompatible && !isOpenAICompatible)) {
        // Use OpenAI-compatible API
        const { createOpenAI } = await import('@ai-sdk/openai');
        const { generateObject } = await import('ai');
        const { z } = await import('zod');

        const openai = createOpenAI({
          apiKey,
          baseURL: apiUrl,
        });

        const aiModel = openai(model);
        const prompt = this.buildExtractionPrompt(content.url, textContent);

        const result = await generateObject({
          model: aiModel,
          schema: this.getSupplierDataSchema(z),
          prompt,
          temperature: 0.1,
        });

        return this.postProcessExtractedData(result.object, content.url);
      } else if (isAnthropicCompatible) {
        // Use Anthropic-compatible API
        const { createAnthropic } = await import('@ai-sdk/anthropic');
        const { generateObject } = await import('ai');
        const { z } = await import('zod');

        const anthropic = createAnthropic({
          apiKey,
          baseURL: apiUrl,
        });

        const aiModel = anthropic(model);
        const prompt = this.buildExtractionPrompt(content.url, textContent);

        const result = await generateObject({
          model: aiModel,
          schema: this.getSupplierDataSchema(z),
          prompt,
          temperature: 0.1,
        });

        return this.postProcessExtractedData(result.object, content.url);
      } else {
        throw new Error(`Unsupported API URL format: ${apiUrl}`);
      }
    } catch (error) {
      console.error(`❌ Custom provider extraction failed:`, error);
      throw error;
    }
  }

  /**
   * Prepare content for AI processing (helper method)
   */
  private prepareContentForAI(content: {
    title: string;
    description: string;
    content?: string;
    rawHtml?: string;
  }): string {
    let textContent = `${content.title}\n\n${content.description}\n\n${content.content || ''}`;

    // Add raw HTML if available (for brand extraction)
    if (content.rawHtml) {
      textContent += `\n\n=== RAW HTML CONTENT ===\n${content.rawHtml.substring(0, 10000)}`;
    }

    return textContent;
  }

  /**
   * Build extraction prompt (helper method)
   */
  private buildExtractionPrompt(url: string, textContent: string): string {
    return `You are an expert data extraction specialist. Extract structured supplier/company information from the following web content.

URL: ${url}

Content:
${textContent.substring(0, 8000)} ${textContent.length > 8000 ? '...' : ''}

Extract the following information if available:

REQUIRED FIELDS (if found):
- Company name (official business name)
- Description (what the company does)
- Industry (primary industry sector)
- Location (city, country, or region)
- Contact email (business email address - must be valid email format)
- Contact phone (business phone number)
- Website URL (must include full URL with https:// protocol)

OPTIONAL FIELDS:
- Employee count (number of employees as string, e.g., "50-200" or "500")
- Founded year (year the company was established, as string)
- Social media links (LinkedIn, Twitter, Facebook - must be full URLs)
- Certifications (ISO, SOC, etc. - array of strings)
- Services (list of services offered - array of strings)
- Products (list of PRODUCTS/SERVICES offered - array of strings)
  * Examples: "Digital Distribution Platform", "Music Marketing Services", "CD Manufacturing"
  * These are WHAT the company sells/provides, not brand names

- Brands (CRITICAL - EXTRACT ALL BRAND NAMES):
  * Brand names are MANUFACTURER/DISTRIBUTOR names that the supplier carries
  * Look for sections titled "Brands", "Our Brands", "Brands We Carry", "Featured Brands", or similar
  * If you see a "BRANDS PAGE CONTENT" section, extract EVERY brand name listed there
  * Brand names are typically capitalized manufacturer names (e.g., "Yamaha", "Shure", "Pioneer DJ", "Gibson", "Epiphone", "audio-technica", "KRK SYSTEMS", "TANNOY", "MIDAS", "AEROBAND", "AlphaTheta", "Blackstar AMPLIFICATION", "dBTechnologies", "HK AUDIO", "KLARK TEKNIK", "Turbosound", etc.)
  * Extract brand names from logos, lists, grids, or any brand mentions
  * This is DIFFERENT from products - brands are the manufacturer/distributor names, NOT the products/services
  * DO NOT confuse products/services with brands - if it says "Digital Distribution Platform", that's a PRODUCT, not a brand
  * Return as an array of strings, one brand name per string
  * Example: ["Yamaha", "Shure", "Pioneer DJ", "Gibson", "Epiphone", "audio-technica", "KRK SYSTEMS", "TANNOY", "Turbosound", "MIDAS", "AEROBAND", "AlphaTheta"]
- Addresses (physical addresses - array of objects with: type, street, city, country, postalCode, state)
  * Address type should be one of: "headquarters", "billing", "shipping", "warehouse", "manufacturing"
  * If type is not specified, use "headquarters" for the first address
- Revenue (if mentioned - as string)
- Business type (LLC, Inc, Pty Ltd, etc.)
- Tax ID / Registration Number / VAT Number (if mentioned)
- Payment terms (if mentioned)
- Currency (3-letter code like USD, ZAR, EUR)
- Tags (relevant keywords/tags - array of strings)

IMPORTANT FORMATTING RULES:
1. Website URLs: Always include full URL with https:// (e.g., "https://www.example.com" not "www.example.com")
2. Addresses: Each address MUST include a "type" field. Use "headquarters" if not specified.
3. Email: Must be valid email format (user@domain.com)
4. Social media: Must be full URLs (https://linkedin.com/...)
5. Only extract information that is clearly present in the content. Do not infer or make up data.

Return ONLY the information that can be clearly identified in the content.`;
  }

  /**
   * Get supplier data schema (helper method)
   */
  private getSupplierDataSchema(z: typeof import('zod').z) {
    return z.object({
      companyName: z.string().optional(),
      description: z.string().optional(),
      industry: z.string().optional(),
      location: z.string().optional(),
      contactEmail: z.string().email().optional().or(z.literal('')),
      contactPhone: z.string().optional(),
      website: z.string().optional().or(z.literal('')),
      employees: z.string().optional(),
      founded: z.string().optional(),
      socialMedia: z
        .object({
          linkedin: z.string().url().optional().or(z.literal('')),
          twitter: z.string().url().optional().or(z.literal('')),
          facebook: z.string().url().optional().or(z.literal('')),
        })
        .optional(),
      certifications: z.array(z.string()).optional(),
      services: z.array(z.string()).optional(),
      products: z.array(z.string()).optional(),
      brands: z.array(z.string()).optional(),
      addresses: z
        .array(
          z.object({
            type: z.string().optional().default('headquarters'),
            street: z.string().optional(),
            city: z.string().optional(),
            country: z.string().optional(),
            postalCode: z.string().optional(),
            state: z.string().optional(),
          })
        )
        .optional(),
      revenue: z.string().optional(),
      businessType: z.string().optional(),
      tags: z.array(z.string()).optional(),
      taxId: z.string().optional(),
      registrationNumber: z.string().optional(),
      vatNumber: z.string().optional(),
      currency: z.string().optional(),
      paymentTerms: z.string().optional(),
      leadTime: z.string().optional(),
      minimumOrderValue: z.string().optional(),
    });
  }

  /**
   * Post-process extracted data (helper method)
   */
  private postProcessExtractedData(
    data: Record<string, unknown>,
    sourceUrl: string
  ): AIExtractedSupplierData {
    const processed: AIExtractedSupplierData = { ...(data as AIExtractedSupplierData) };

    // Normalize website URL
    if (processed.website) {
      processed.website = this.normalizeUrl(processed.website);
    } else if (sourceUrl) {
      processed.website = this.normalizeUrl(sourceUrl);
    }

    // Ensure addresses have required fields
    if (processed.addresses && processed.addresses.length > 0) {
      type ExtractedAddress = NonNullable<AIExtractedSupplierData['addresses']>[number];
      type ExtendedAddress = ExtractedAddress & {
        addressLine1?: string;
        postal_code?: string;
        province?: string;
      };

      processed.addresses = processed.addresses
        .map((addr, index) => {
          if (!addr) {
            return undefined;
          }
          const extended = addr as ExtendedAddress;
          const normalized: ExtractedAddress = {
            type: addr.type || (index === 0 ? 'headquarters' : 'shipping'),
            street: addr.street || extended.addressLine1 || '',
            city: addr.city || '',
            country: addr.country || '',
            postalCode: addr.postalCode || extended.postal_code || '',
            state: addr.state || extended.province || '',
          };
          return normalized;
        })
        .filter((addr): addr is ExtractedAddress => Boolean(addr && (addr.street || addr.city)));
    }

    return processed;
  }

  /**
   * Normalize URL helper
   */
  private normalizeUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url.replace(/^\/\//, '')}`;
  }

  /**
   * Aggregate extraction results from multiple providers
   * Intelligently merges data, preferring more complete/confident results
   */
  private aggregateExtractionResults(results: ExtractedSupplierData[]): ExtractedSupplierData {
    if (results.length === 0) {
      throw new Error('No results to aggregate');
    }

    if (results.length === 1) {
      return results[0];
    }

    console.log(`🔄 Aggregating ${results.length} extraction results`);

    // Start with the first result as base
    const aggregated: ExtractedSupplierData = { ...results[0] };

    // Merge each result into aggregated
    for (const result of results.slice(1)) {
      // Merge company name (prefer longer/more complete)
      if (
        result.companyName &&
        (!aggregated.companyName || result.companyName.length > aggregated.companyName.length)
      ) {
        aggregated.companyName = result.companyName;
      }

      // Merge description (prefer longer/more detailed)
      if (
        result.description &&
        (!aggregated.description || result.description.length > aggregated.description.length)
      ) {
        aggregated.description = result.description;
      }

      // Merge arrays (brands, products, services, tags, certifications)
      if (result.brands && result.brands.length > 0) {
        aggregated.brands = this.mergeStringLists(aggregated.brands, result.brands);
      }
      if (result.categories && result.categories.length > 0) {
        aggregated.categories = this.mergeStringLists(aggregated.categories, result.categories);
      }
      if (result.brandLinks && result.brandLinks.length > 0) {
        aggregated.brandLinks = this.mergeBrandLinks(aggregated.brandLinks, result.brandLinks);
      }
      if (result.products && result.products.length > 0) {
        aggregated.products = this.mergeStringLists(aggregated.products, result.products);
      }
      if (result.services && result.services.length > 0) {
        aggregated.services = this.mergeStringLists(aggregated.services, result.services);
      }
      if (result.tags && result.tags.length > 0) {
        aggregated.tags = this.mergeStringLists(aggregated.tags, result.tags);
      }
      if (result.certifications && result.certifications.length > 0) {
        aggregated.certifications = this.mergeStringLists(
          aggregated.certifications,
          result.certifications
        );
      }

      // Merge contact info (prefer non-empty)
      if (result.contactEmail && !aggregated.contactEmail) {
        aggregated.contactEmail = result.contactEmail;
      }
      if (result.contactPhone && !aggregated.contactPhone) {
        aggregated.contactPhone = result.contactPhone;
      }

      // Merge addresses (combine unique addresses)
      if (result.addresses && result.addresses.length > 0) {
        const existingAddresses = aggregated.addresses || [];
        const newAddresses = result.addresses.filter(
          newAddr =>
            !existingAddresses.some(
              existing =>
                existing.street === newAddr.street &&
                existing.city === newAddr.city &&
                existing.country === newAddr.country
            )
        );
        aggregated.addresses = [...existingAddresses, ...newAddresses];
      }

      // Merge other fields (prefer non-empty)
      if (result.industry && !aggregated.industry) aggregated.industry = result.industry;
      if (result.location && !aggregated.location) aggregated.location = result.location;
      if (result.employees && !aggregated.employees) aggregated.employees = result.employees;
      if (result.founded && !aggregated.founded) aggregated.founded = result.founded;
      if (result.website && !aggregated.website) aggregated.website = result.website;
      if (result.revenue && !aggregated.revenue) aggregated.revenue = result.revenue;
      if (result.businessType && !aggregated.businessType)
        aggregated.businessType = result.businessType;
      if (result.taxId && !aggregated.taxId) aggregated.taxId = result.taxId;
      if (result.registrationNumber && !aggregated.registrationNumber)
        aggregated.registrationNumber = result.registrationNumber;
      if (result.vatNumber && !aggregated.vatNumber) aggregated.vatNumber = result.vatNumber;
      if (result.currency && !aggregated.currency) aggregated.currency = result.currency;
      if (result.paymentTerms && !aggregated.paymentTerms)
        aggregated.paymentTerms = result.paymentTerms;
      if (result.leadTime && !aggregated.leadTime) aggregated.leadTime = result.leadTime;
      if (result.minimumOrderValue && !aggregated.minimumOrderValue)
        aggregated.minimumOrderValue = result.minimumOrderValue;

      // Merge social media (prefer non-empty)
      if (result.socialMedia) {
        aggregated.socialMedia = {
          ...aggregated.socialMedia,
          ...result.socialMedia,
        };
      }
    }

    console.log(
      `✅ Aggregation complete: ${aggregated.brands?.length || 0} brands, ${aggregated.products?.length || 0} products, ${aggregated.services?.length || 0} services`
    );

    return aggregated;
  }

  /**
   * Validate extracted data for quality
   */
  validateExtractedData(data: ExtractedSupplierData): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check required fields
    if (!data.companyName || data.companyName.trim().length < 2) {
      issues.push('Company name is missing or too short');
    }

    if (!data.contactEmail && !data.contactPhone) {
      issues.push('No contact information available');
      suggestions.push('Consider adding at least an email or phone number');
    }

    // Validate email format
    if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
      issues.push('Invalid email format');
    }

    // Check data quality
    const confidence = this.calculateConfidence(data);
    if (confidence < 50) {
      issues.push('Low confidence score for extracted data');
      suggestions.push('Consider manual verification of extracted information');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Analyze supplier performance and metrics
   */
  async analyzeSupplier(supplierId: string): Promise<{
    performanceScore: number;
    recommendations: string[];
    metrics: Record<string, number>;
  }> {
    // Placeholder implementation - would integrate with actual performance data
    const normalizedSupplierId = supplierId.trim().toLowerCase();
    const supplierHash = normalizedSupplierId
      ? normalizedSupplierId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
      : 0;
    const performanceBase = 0.5 + (supplierHash % 50) / 100;
    const performanceScore = Math.min(0.99, performanceBase);
    const modifier = (supplierHash % 10) / 100;

    return {
      performanceScore,
      recommendations: [
        'Strong delivery performance',
        'Good quality metrics',
        'Responsive communication',
      ],
      metrics: {
        onTimeDelivery: Math.min(0.99, 0.85 + modifier),
        qualityScore: Math.min(0.99, 0.83 + modifier / 2),
        responsiveness: Math.min(0.99, 0.8 + modifier / 3),
      },
    };
  }

  /**
   * Find similar suppliers based on characteristics
   */
  async findSimilarSuppliers(
    supplierId: string,
    options?: {
      maxResults?: number;
      minSimilarity?: number;
    }
  ): Promise<
    Array<{
      id: string;
      name: string;
      similarity: number;
      matchingAttributes: string[];
    }>
  > {
    // Placeholder implementation - would use actual similarity algorithms
    const { maxResults = 5, minSimilarity = 0.7 } = options || {};
    const normalizedSupplierId = supplierId.trim().toLowerCase();
    const supplierHash = normalizedSupplierId
      ? normalizedSupplierId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
      : 0;

    const baseResults = [
      {
        id: 'similar_1',
        name: 'Similar Supplier 1',
        similarity: 0.85,
        matchingAttributes: ['industry', 'location', 'certifications'],
      },
      {
        id: 'similar_2',
        name: 'Similar Supplier 2',
        similarity: 0.78,
        matchingAttributes: ['industry', 'services'],
      },
      {
        id: 'similar_3',
        name: 'Similar Supplier 3',
        similarity: 0.72,
        matchingAttributes: ['location', 'services'],
      },
    ];

    const adjustedResults = baseResults
      .map((result, index) => {
        const adjustment = ((supplierHash + index * 7) % 10) / 200; // small deterministic tweak
        return {
          ...result,
          similarity: Math.max(0, Math.min(1, result.similarity - adjustment)),
        };
      })
      .filter(result => result.similarity >= minSimilarity)
      .slice(0, maxResults);

    return adjustedResults;
  }
}

// Export singleton instance
export const supplierIntelligenceService = new SupplierIntelligenceService();

export default supplierIntelligenceService;
