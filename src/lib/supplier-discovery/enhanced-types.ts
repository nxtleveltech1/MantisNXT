// @ts-nocheck

/**
 * Enhanced Types for Web-Based Supplier Discovery
 * Includes advanced web search, scraping, and data extraction capabilities
 */

export interface WebSearchRequest {
  searchQuery: string;
  searchType: 'general' | 'supplier' | 'business' | 'company';
  region?: string;
  language?: string;
  maxResults?: number;
  excludeDomains?: string[];
  includeDomains?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface WebSearchResult {
  title: string;
  url: string;
  description: string;
  displayedUrl: string;
  score: number;
  source: 'google' | 'bing' | 'duckduckgo' | 'custom';
  crawlDate: Date;
  relevanceScore: number;
  snippet?: string;
}

export interface WebsiteContent {
  url: string;
  title: string;
  content: string;
  extractedAt: Date;
  contentHash: string;
  extractionMethod: 'cheerio' | 'puppeteer' | 'api';
  responseTime: number;
  status: 'success' | 'failed' | 'timeout';
  contentType: 'text' | 'json' | 'xml';
  wordCount: number;
}

export interface ScrapingTarget {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  payload?: unknown;
  waitForSelector?: string;
  waitTimeout?: number;
  extractSelectors: Record<string, string>;
  attributes?: Record<string, string[]>;
  contentType: 'static' | 'dynamic' | 'api';
  rateLimit?: {
    requestsPerSecond: number;
    maxConcurrent: number;
  };
}

export interface ExtractedDataField {
  fieldName: string;
  value: string | number | boolean | null;
  confidence: number;
  extractionMethod: 'selector' | 'regex' | 'ai' | 'pattern';
  sourceElement?: string;
  xpath?: string;
  validation?: {
    isValid: boolean;
    reason?: string;
  };
  context?: string;
}

export interface StructuredData {
  supplier: {
    name: string;
    legalName?: string;
    tradingName?: string;
    registrationNumber?: string;
    taxId?: string;
    vatNumber?: string;
    industry?: string;
    subcategory?: string;
    employeeCount?: number;
    annualRevenue?: number;
    foundedYear?: number;
    businessType?: string;
    description?: string;
  };
  contact: {
    primaryEmail?: string;
    secondaryEmails?: string[];
    primaryPhone?: string;
    secondaryPhones?: string[];
    website?: string;
    socialMedia?: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
      instagram?: string;
    };
  };
  location: {
    primaryAddress?: {
      street: string;
      city: string;
      province: string;
      postalCode: string;
      country: string;
    };
    additionalAddresses?: Array<{
      type: string;
      address: string;
    }>;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    timeZone?: string;
  };
  compliance: {
    beeLevel?: string;
    certifications?: Array<{
      name: string;
      issuer: string;
      validUntil?: Date;
      certificateUrl?: string;
    }>;
    licenses?: string[];
    insurance?: {
      provider: string;
      coverage: string;
      validUntil: Date;
    };
  };
  financial: {
    bankDetails?: {
      bankName: string;
      accountNumber: string;
      branchCode: string;
      accountType: string;
    };
    paymentTerms?: string[];
    creditRating?: string;
  };
  operations: {
    capacity?: {
      monthly: number;
      unit: string;
    };
    leadTime?: {
      minDays: number;
      maxDays: number;
    };
    minimumOrder?: number;
    currencies?: string[];
    shippingMethods?: string[];
  };
}

export interface DiscoverySource {
  type: 'web_search' | 'website_scraping' | 'social_media' | 'business_directory' | 'government_registry' | 'news_article';
  url: string;
  name: string;
  reliability: number; // 0-1
  lastUpdated: Date;
  extractionDate: Date;
  dataFields: string[];
  method: string;
  cost?: number;
  rateLimit?: {
    requestsPerHour: number;
    requestsUsed: number;
    resetTime: Date;
  };
}

export interface DiscoveryResult {
  success: boolean;
  data?: {
    structured: StructuredData;
    raw: {
      extractedFields: ExtractedDataField[];
      sources: DiscoverySource[];
      websiteContents: WebsiteContent[];
      searchResults: WebSearchResult[];
    };
    metadata: {
      totalSources: number;
      confidenceScore: number;
      completenessScore: number;
      extractionTime: number;
      costEstimate: number;
      processingSteps: string[];
    };
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: Date;
  };
  warnings?: string[];
}

export interface DiscoverySession {
  id: string;
  query: string;
  websiteUrl?: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: string;
  totalSteps: number;
  results?: DiscoveryResult;
  cacheKey: string;
  userId?: string;
  sessionType: 'manual' | 'ai_assisted' | 'bulk';
}

export interface DiscoveryConfiguration {
  sources: {
    webSearch: {
      enabled: boolean;
      providers: Array<{
        name: string;
        apiKey?: string;
        enabled: boolean;
        rateLimit: number;
        costPerRequest: number;
      }>;
      maxResults: number;
      timeout: number;
    };
    webScraping: {
      enabled: boolean;
      maxConcurrent: number;
      timeout: number;
      retryAttempts: number;
      userAgents: string[];
      proxy?: {
        enabled: boolean;
        servers: string[];
        rotation: boolean;
      };
    };
    socialMedia: {
      enabled: boolean;
      platforms: string[];
      rateLimit: number;
    };
    businessDirectories: {
      enabled: boolean;
      directories: string[];
      priority: number;
    };
  };
  ai: {
    enabled: boolean;
    provider: 'openai' | 'claude' | 'gemini';
    model: string;
    confidenceThreshold: number;
    maxTokens: number;
    temperature: number;
  };
  data: {
    validation: {
      strict: boolean;
      requiredFields: string[];
      optionalFields: string[];
    };
    enrichment: {
      enabled: boolean;
      sources: string[];
      autoValidate: boolean;
    };
    storage: {
      cacheResults: boolean;
      storeRawData: boolean;
      retentionDays: number;
    };
  };
  output: {
    format: 'structured' | 'raw' | 'both';
    includeMetadata: boolean;
    includeSources: boolean;
    includeConfidence: boolean;
  };
}

export interface DiscoveryProgress {
  sessionId: string;
  status: DiscoverySession['status'];
  progress: number;
  currentStep: string;
  estimatedTimeRemaining: number;
  steps: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime?: Date;
    endTime?: Date;
    result?: unknown;
    error?: string;
  }>;
}

export interface BulkDiscoveryRequest {
  requests: Array<{
    supplierName: string;
    websiteUrl?: string;
    additionalContext?: Record<string, unknown>;
    priority?: 'low' | 'normal' | 'high';
  }>;
  options: {
    maxConcurrent: number;
    timeoutPerRequest: number;
    retryAttempts: number;
    stopOnFirstError: boolean;
    priorityMode: 'sequential' | 'parallel' | 'mixed';
  };
}

export interface BulkDiscoveryResponse {
  totalRequests: number;
  successful: number;
  failed: number;
  pending: number;
  results: DiscoveryResult[];
  summary: {
    averageConfidence: number;
    averageProcessingTime: number;
    totalCost: number;
    topSources: string[];
    commonErrors: Array<{
      error: string;
      count: number;
    }>;
  };
}

export interface DiscoveryMetrics {
  session: {
    totalSessions: number;
    successfulSessions: number;
    averageSessionTime: number;
    activeSessions: number;
  };
  sources: {
    webSearch: {
      requests: number;
      averageResults: number;
      averageCost: number;
      successRate: number;
    };
    webScraping: {
      requests: number;
      averageContentSize: number;
      successRate: number;
      averageResponseTime: number;
    };
    totalSources: Record<string, number>;
  };
  data: {
    averageConfidence: number;
    averageCompleteness: number;
    totalExtractedFields: number;
    validationRate: number;
  };
  performance: {
    averageProcessingTime: number;
    peakConcurrentSessions: number;
    cacheHitRate: number;
    apiUsage: Record<string, number>;
  };
}

export interface WebAddressInput {
  type: 'supplier_name' | 'website_url' | 'email' | 'phone' | 'registration_number';
  value: string;
  confidence: number;
  validation: {
    isValid: boolean;
    format: string;
    reason?: string;
  };
  suggestions?: Array<{
    value: string;
    confidence: number;
    reason: string;
  }>;
}

// Export commonly used types
export type {
  StructuredData,
  DiscoveryResult,
  DiscoverySession,
  WebAddressInput,
  BulkDiscoveryRequest,
  BulkDiscoveryResponse
};