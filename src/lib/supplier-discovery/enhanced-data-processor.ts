/**
 * Enhanced Data Extraction Engine
 * Processes and structures data from multiple sources into comprehensive supplier information
 */

import type {
  WebSearchResult,
  WebsiteContent,
  ExtractedDataField,
  StructuredData,
  DiscoveryResult,
  DiscoverySource,
  DiscoveryConfiguration
} from './enhanced-types';

interface ProcessingStats {
  sourcesProcessed: number;
  totalFields: number;
  highConfidenceFields: number;
  averageConfidence: number;
  processingTime: number;
  errors: string[];
}

export class EnhancedDataProcessor {
  private configuration: DiscoveryConfiguration;
  private processingStats: ProcessingStats;

  constructor(config: DiscoveryConfiguration) {
    this.configuration = config;
    this.resetStats();
  }

  /**
   * Process comprehensive discovery results
   */
  async processDiscovery(
    searchResults: WebSearchResult[],
    websiteContents: WebsiteContent[],
    extractedFields: ExtractedDataField[]
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();

    console.log(`Processing discovery data:
      - Search results: ${searchResults.length}
      - Website contents: ${websiteContents.length}
      - Extracted fields: ${extractedFields.length}`);

    try {
      // Combine and organize all extracted data
      const organizedData = this.organizeExtractedData(extractedFields, websiteContents, searchResults);
      
      // Validate and clean data
      const validatedData = this.validateAndCleanData(organizedData);
      
      // Structure into supplier format
      const structuredData = this.structureSupplierData(validatedData);
      
      // Calculate confidence and completeness scores
      const confidence = this.calculateConfidenceScore(extractedFields);
      const completeness = this.calculateCompletenessScore(structuredData);
      
      // Generate sources metadata
      const sources = this.generateSourcesMetadata(websiteContents, searchResults, extractedFields);
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;

      this.updateStats(sources.length, extractedFields.length, confidence, processingTime);

      const result: DiscoveryResult = {
        success: true,
        data: {
          structured: structuredData,
          raw: {
            extractedFields,
            sources,
            websiteContents,
            searchResults
          },
          metadata: {
            totalSources: sources.length,
            confidenceScore: confidence,
            completenessScore: completeness,
            extractionTime: processingTime,
            costEstimate: this.estimateCost(sources),
            processingSteps: this.getProcessingSteps()
          }
        }
      };

      console.log(`Discovery processing completed successfully in ${processingTime}ms`);
      return result;

    } catch (error) {
      console.error('Discovery processing failed:', error);
      return {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown processing error',
          timestamp: new Date()
        },
        warnings: this.processingStats.errors
      };
    }
  }

  /**
   * Organize extracted data by category and source
   */
  private organizeExtractedData(
    extractedFields: ExtractedDataField[],
    websiteContents: WebsiteContent[],
    searchResults: WebSearchResult[]
  ) {
    const organized = {
      basicInfo: [] as ExtractedDataField[],
      contact: [] as ExtractedDataField[],
      location: [] as ExtractedDataField[],
      business: [] as ExtractedDataField[],
      compliance: [] as ExtractedDataField[],
      social: [] as ExtractedDataField[],
      metadata: [] as ExtractedDataField[]
    };

    // Categorize extracted fields
    extractedFields.forEach(field => {
      const category = this.categorizeField(field.fieldName);
      if (organized[category]) {
        organized[category].push(field);
      }
    });

    // Add website content analysis
    const websiteData = this.analyzeWebsiteContents(websiteContents);
    
    // Add search result context
    const searchData = this.analyzeSearchResults(searchResults);

    return {
      fields: organized,
      websiteData,
      searchData,
      allFields: extractedFields
    };
  }

  /**
   * Categorize data fields by type
   */
  private categorizeField(fieldName: string): keyof typeof this.organizeExtractedData {
    const name = fieldName.toLowerCase();
    
    if (name.includes('name') || name.includes('company')) {
      return 'basicInfo';
    }
    if (name.includes('phone') || name.includes('email') || name.includes('website')) {
      return 'contact';
    }
    if (name.includes('address') || name.includes('location') || name.includes('city')) {
      return 'location';
    }
    if (name.includes('industry') || name.includes('employee') || name.includes('revenue')) {
      return 'business';
    }
    if (name.includes('vat') || name.includes('certification') || name.includes('bee')) {
      return 'compliance';
    }
    if (name.includes('social') || name.includes('linkedin') || name.includes('facebook')) {
      return 'social';
    }
    
    return 'metadata';
  }

  /**
   * Analyze website content for additional insights
   */
  private analyzeWebsiteContents(websiteContents: WebsiteContent[]) {
    const analysis = {
      totalSites: websiteContents.length,
      successfulExtractions: 0,
      averageResponseTime: 0,
      contentTypes: {} as Record<string, number>,
      commonPatterns: [] as string[]
    };

    if (websiteContents.length === 0) return analysis;

    let totalResponseTime = 0;
    let successfulCount = 0;

    websiteContents.forEach(content => {
      if (content.status === 'success') {
        successfulCount++;
        
        // Analyze content size and type
        const wordCount = content.wordCount;
        if (wordCount > 0) {
          analysis.contentTypes[content.contentType] = 
            (analysis.contentTypes[content.contentType] || 0) + 1;
        }
      }
      
      totalResponseTime += content.responseTime;
    });

    analysis.successfulExtractions = successfulCount;
    analysis.averageResponseTime = totalResponseTime / websiteContents.length;

    return analysis;
  }

  /**
   * Analyze search results for context and relevance
   */
  private analyzeSearchResults(searchResults: WebSearchResult[]) {
    const analysis = {
      totalResults: searchResults.length,
      averageRelevance: 0,
      sourceDistribution: {} as Record<string, number>,
      topDomains: [] as string[]
    };

    if (searchResults.length === 0) return analysis;

    let totalRelevance = 0;
    const domainCounts: Record<string, number> = {};

    searchResults.forEach(result => {
      totalRelevance += result.relevanceScore;
      
      // Track domain distribution
      try {
        const domain = new URL(result.url).hostname;
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      } catch {
        // Handle invalid URLs
      }
    });

    analysis.averageRelevance = totalRelevance / searchResults.length;
    analysis.sourceDistribution = this.groupBySource(searchResults);
    analysis.topDomains = Object.entries(domainCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([domain]) => domain);

    return analysis;
  }

  /**
   * Group search results by source
   */
  private groupBySource(searchResults: WebSearchResult[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    searchResults.forEach(result => {
      distribution[result.source] = (distribution[result.source] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Validate and clean extracted data
   */
  private validateAndCleanData(organizedData: unknown) {
    const cleaned = {
      ...organizedData,
      fields: {} as unknown
    };

    // Clean each category of fields
    for (const [category, fields] of Object.entries(organizedData.fields)) {
      const cleanedFields = this.cleanFieldCategory(fields as ExtractedDataField[]);
      (cleaned.fields as unknown)[category] = cleanedFields;
    }

    return cleaned;
  }

  /**
   * Clean and deduplicate fields in a category
   */
  private cleanFieldCategory(fields: ExtractedDataField[]): ExtractedDataField[] {
    const cleaned: ExtractedDataField[] = [];
    const seen = new Set<string>();

    fields.forEach(field => {
      const key = `${field.fieldName}:${field.value}`;
      if (!seen.has(key) && this.isValidFieldValue(field)) {
        seen.add(key);
        cleaned.push({
          ...field,
          value: this.normalizeFieldValue(field)
        });
      }
    });

    return cleaned.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Check if field value is valid
   */
  private isValidFieldValue(field: ExtractedDataField): boolean {
    const value = field.value;
    
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim().length === 0) return false;
    if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) return false;
    
    // Field-specific validation
    switch (field.fieldName.toLowerCase()) {
      case 'email':
        return this.isValidEmail(String(value));
      case 'phone':
        return this.isValidPhone(String(value));
      case 'website':
        return this.isValidUrl(String(value));
      default:
        return true;
    }
  }

  /**
   * Normalize field values
   */
  private normalizeFieldValue(field: ExtractedDataField): string | number | boolean {
    const value = field.value;
    
    switch (field.fieldName.toLowerCase()) {
      case 'email':
        return String(value).toLowerCase().trim();
      case 'phone':
        return this.formatPhoneNumber(String(value));
      case 'website':
        return this.formatUrl(String(value));
      case 'companyname':
      case 'name':
        return this.cleanCompanyName(String(value));
      default:
        return value;
    }
  }

  /**
   * Structure data into supplier format
   */
  private structureSupplierData(validatedData: unknown): StructuredData {
    const fields = validatedData.fields;
    
    // Extract the best values for each field
    const getBestValue = (category: string, fieldNames: string[]) => {
      for (const name of fieldNames) {
        const categoryFields = fields[category] || [];
        const field = categoryFields.find((f: ExtractedDataField) => 
          f.fieldName.toLowerCase().includes(name.toLowerCase())
        );
        if (field && field.confidence > 0.5) {
          return field.value;
        }
      }
      return undefined;
    };

    const structuredData: StructuredData = {
      supplier: {
        name: String(getBestValue('basicInfo', ['name', 'company']) || ''),
        legalName: String(getBestValue('basicInfo', ['legal']) || ''),
        tradingName: String(getBestValue('basicInfo', ['trading']) || ''),
        registrationNumber: String(getBestValue('compliance', ['registration']) || ''),
        taxId: String(getBestValue('compliance', ['tax']) || ''),
        vatNumber: String(getBestValue('compliance', ['vat']) || ''),
        industry: String(getBestValue('business', ['industry', 'category']) || ''),
        subcategory: String(getBestValue('business', ['subcategory']) || ''),
        employeeCount: this.parseNumber(getBestValue('business', ['employee']) || 0),
        annualRevenue: this.parseNumber(getBestValue('business', ['revenue']) || 0),
        foundedYear: this.parseNumber(getBestValue('business', ['founded', 'established']) || 0),
        businessType: String(getBestValue('business', ['type']) || ''),
        description: String(getBestValue('metadata', ['description']) || '')
      },
      contact: {
        primaryEmail: String(getBestValue('contact', ['email']) || ''),
        secondaryEmails: this.extractMultipleValues(fields.contact, 'email'),
        primaryPhone: String(getBestValue('contact', ['phone', 'tel']) || ''),
        secondaryPhones: this.extractMultipleValues(fields.contact, 'phone'),
        website: String(getBestValue('contact', ['website', 'url']) || ''),
        socialMedia: {
          linkedin: String(getBestValue('social', ['linkedin']) || ''),
          twitter: String(getBestValue('social', ['twitter']) || ''),
          facebook: String(getBestValue('social', ['facebook']) || ''),
          instagram: String(getBestValue('social', ['instagram']) || '')
        }
      },
      location: {
        primaryAddress: this.parseAddress(fields.location),
        additionalAddresses: [],
        coordinates: undefined,
        timeZone: undefined
      },
      compliance: {
        beeLevel: String(getBestValue('compliance', ['bee']) || ''),
        certifications: [],
        licenses: [],
        insurance: undefined
      },
      financial: {
        bankDetails: undefined,
        paymentTerms: [],
        creditRating: undefined
      },
      operations: {
        capacity: undefined,
        leadTime: undefined,
        minimumOrder: undefined,
        currencies: [],
        shippingMethods: []
      }
    };

    return structuredData;
  }

  /**
   * Extract multiple values of the same type
   */
  private extractMultipleValues(fields: ExtractedDataField[], type: string): string[] {
    return fields
      .filter(f => f.fieldName.toLowerCase().includes(type.toLowerCase()))
      .map(f => String(f.value))
      .filter((value, index, array) => array.indexOf(value) === index); // Remove duplicates
  }

  /**
   * Parse address information
   */
  private parseAddress(addressFields: ExtractedDataField[]) {
    if (!addressFields || addressFields.length === 0) return undefined;

    // Combine all address-related fields
    const addressText = addressFields
      .map(f => String(f.value))
      .join(', ');

    // Simple address parsing (could be enhanced with more sophisticated parsing)
    const parts = addressText.split(',').map(p => p.trim());
    
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      province: parts[2] || '',
      postalCode: this.extractPostalCode(addressText),
      country: 'South Africa'
    };
  }

  /**
   * Extract postal code from address text
   */
  private extractPostalCode(addressText: string): string {
    const match = addressText.match(/\b\d{4}\b/);
    return match ? match[0] : '';
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidenceScore(extractedFields: ExtractedDataField[]): number {
    if (extractedFields.length === 0) return 0;

    const totalConfidence = extractedFields.reduce((sum, field) => sum + field.confidence, 0);
    const averageConfidence = totalConfidence / extractedFields.length;

    // Weight by field importance
    const weightedSum = extractedFields.reduce((sum, field) => {
      const weight = this.getFieldWeight(field.fieldName);
      return sum + (field.confidence * weight);
    }, 0);

    const totalWeight = extractedFields.reduce((sum, field) => 
      sum + this.getFieldWeight(field.fieldName), 0
    );

    return totalWeight > 0 ? weightedSum / totalWeight : averageConfidence;
  }

  /**
   * Get importance weight for field type
   */
  private getFieldWeight(fieldName: string): number {
    const weights: Record<string, number> = {
      companyname: 3,
      email: 2,
      phone: 2,
      registrationnumber: 3,
      vatnumber: 2,
      address: 1,
      website: 1,
      industry: 1
    };

    const lowerName = fieldName.toLowerCase();
    return weights[lowerName] || 1;
  }

  /**
   * Calculate data completeness score
   */
  private calculateCompletenessScore(structuredData: StructuredData): number {
    const requiredFields = [
      'supplier.name',
      'contact.primaryEmail',
      'location.primaryAddress.street'
    ];

    const optionalFields = [
      'supplier.registrationNumber',
      'supplier.vatNumber',
      'supplier.industry',
      'contact.primaryPhone',
      'contact.website',
      'compliance.beeLevel'
    ];

    let requiredScore = 0;
    let optionalScore = 0;

    // Check required fields
    requiredFields.forEach(field => {
      const value = this.getNestedValue(structuredData, field);
      if (value && String(value).trim().length > 0) {
        requiredScore += 1;
      }
    });

    // Check optional fields
    optionalFields.forEach(field => {
      const value = this.getNestedValue(structuredData, field);
      if (value && String(value).trim().length > 0) {
        optionalScore += 1;
      }
    });

    const requiredPercentage = requiredScore / requiredFields.length;
    const optionalPercentage = optionalScore / optionalFields.length;

    // Weight required fields more heavily
    return (requiredPercentage * 0.7) + (optionalPercentage * 0.3);
  }

  /**
   * Get nested object value using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Generate sources metadata
   */
  private generateSourcesMetadata(
    websiteContents: WebsiteContent[],
    searchResults: WebSearchResult[],
    extractedFields: ExtractedDataField[]
  ): DiscoverySource[] {
    const sources: DiscoverySource[] = [];

    // Add website sources
    websiteContents.forEach(content => {
      sources.push({
        type: 'website_scraping',
        url: content.url,
        name: new URL(content.url).hostname,
        reliability: content.status === 'success' ? 0.8 : 0.3,
        lastUpdated: content.extractedAt,
        extractionDate: content.extractedAt,
        dataFields: this.getDataFieldsFromContent(content, extractedFields),
        method: content.extractionMethod,
        cost: 0
      });
    });

    // Add search result sources
    const uniqueDomains = new Set(searchResults.map(r => {
      try {
        return new URL(r.url).hostname;
      } catch {
        return 'unknown';
      }
    }));

    uniqueDomains.forEach(domain => {
      sources.push({
        type: 'web_search',
        url: `https://${domain}`,
        name: domain,
        reliability: 0.6,
        lastUpdated: new Date(),
        extractionDate: new Date(),
        dataFields: this.getDataFieldsFromDomain(domain, extractedFields),
        method: 'search_engine',
        cost: 0
      });
    });

    return sources;
  }

  /**
   * Get data fields extracted from website content
   */
  private getDataFieldsFromContent(content: WebsiteContent, extractedFields: ExtractedDataField[]): string[] {
    // This would be enhanced to track which fields came from which sources
    return extractedFields
      .filter(f => f.sourceElement) // Fields with source tracking
      .map(f => f.fieldName);
  }

  /**
   * Get data fields extracted from domain
   */
  private getDataFieldsFromDomain(domain: string, extractedFields: ExtractedDataField[]): string[] {
    // Simplified - in reality would track source URLs for each field
    return extractedFields.slice(0, 5).map(f => f.fieldName);
  }

  /**
   * Estimate processing cost
   */
  private estimateCost(sources: DiscoverySource[]): number {
    // Simplified cost calculation
    const baseCost = 0.01; // Base cost per source
    const scrapingCost = 0.05; // Additional cost for website scraping
    const searchCost = 0.02; // Cost for search API calls

    return sources.reduce((total, source) => {
      switch (source.type) {
        case 'website_scraping':
          return total + baseCost + scrapingCost;
        case 'web_search':
          return total + baseCost + searchCost;
        default:
          return total + baseCost;
      }
    }, 0);
  }

  /**
   * Get processing steps
   */
  private getProcessingSteps(): string[] {
    return [
      'Web search execution',
      'Website content extraction',
      'Data field extraction',
      'Data validation and cleaning',
      'Supplier data structuring',
      'Confidence calculation',
      'Source metadata generation'
    ];
  }

  /**
   * Reset processing statistics
   */
  private resetStats(): void {
    this.processingStats = {
      sourcesProcessed: 0,
      totalFields: 0,
      highConfidenceFields: 0,
      averageConfidence: 0,
      processingTime: 0,
      errors: []
    };
  }

  /**
   * Update processing statistics
   */
  private updateStats(
    sourcesProcessed: number,
    totalFields: number,
    averageConfidence: number,
    processingTime: number
  ): void {
    this.processingStats.sourcesProcessed = sourcesProcessed;
    this.processingStats.totalFields = totalFields;
    this.processingStats.highConfidenceFields = totalFields * 0.6; // Estimated
    this.processingStats.averageConfidence = averageConfidence;
    this.processingStats.processingTime = processingTime;
  }

  /**
   * Validation utility methods
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /(\+27|0)[0-9\s\-()]{8,15}/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private parseNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const match = value.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }
    return 0;
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

  private cleanCompanyName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s&().-]/g, '')
      .replace(/\b(pty|ltd|inc|corp|llc|limited|proprietary)\b\.?/gi, match =>
        match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()
      );
  }

  /**
   * Get processing statistics
   */
  getStatistics(): ProcessingStats {
    return { ...this.processingStats };
  }
}

// Export singleton with default configuration
export const enhancedDataProcessor = new EnhancedDataProcessor({
  sources: {
    webSearch: { enabled: true, providers: [], maxResults: 20, timeout: 30000 },
    webScraping: { enabled: true, maxConcurrent: 5, timeout: 30000, retryAttempts: 3, userAgents: [] },
    socialMedia: { enabled: true, platforms: [], rateLimit: 60 },
    businessDirectories: { enabled: true, directories: [], priority: 1 }
  },
  ai: { enabled: false, provider: 'openai', model: 'gpt-4.1', confidenceThreshold: 0.7, maxTokens: 2000, temperature: 0.1 },
  data: { 
    validation: { strict: true, requiredFields: ['name'], optionalFields: ['email'] },
    enrichment: { enabled: true, sources: [], autoValidate: true },
    storage: { cacheResults: true, storeRawData: true, retentionDays: 30 }
  },
  output: { format: 'both', includeMetadata: true, includeSources: true, includeConfidence: true }
});
