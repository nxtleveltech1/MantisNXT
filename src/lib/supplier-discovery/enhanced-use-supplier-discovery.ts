/**
 * Enhanced Supplier Discovery Hook with Web Search Capabilities
 * Provides comprehensive supplier discovery using web search, scraping, and AI
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  WebSearchRequest,
  WebSearchResult,
  WebsiteContent,
  ExtractedDataField,
  StructuredData,
  DiscoverySession,
  DiscoveryProgress,
  BulkDiscoveryRequest,
  BulkDiscoveryResponse,
  WebAddressInput,
  DiscoveryConfiguration,
} from './enhanced-types';

import { webSearchService } from './web-search-service';
import { webScrapingService } from './web-scraping-service';
import { enhancedDataProcessor } from './enhanced-data-processor';
import type { SupplierDiscoveryRequest, DiscoveredSupplierData } from './types';

interface EnhancedDiscoveryState {
  // Session management
  session: DiscoverySession | null;
  activeSessions: Map<string, DiscoverySession>;

  // Current discovery results
  webResults: WebSearchResult[];
  websiteContents: WebsiteContent[];
  extractedFields: ExtractedDataField[];
  structuredData: StructuredData | null;
  legacyData: DiscoveredSupplierData | null;

  // Progress tracking
  progress: DiscoveryProgress | null;

  // UI state
  isLoading: boolean;
  isSearching: boolean;
  isExtracting: boolean;
  isProcessing: boolean;
  error: string | null;
  warnings: string[];

  // Performance metrics
  processingTime: number;
  sourcesUsed: string[];
  confidenceScore: number;
  completenessScore: number;
  costEstimate: number;
}

interface EnhancedDiscoveryOptions {
  // Web search configuration
  enableWebSearch?: boolean;
  maxSearchResults?: number;
  searchEngines?: string[];
  includeWebsites?: boolean;
  includeBusinessDirectories?: boolean;
  includeSocialMedia?: boolean;

  // Extraction configuration
  enableWebScraping?: boolean;
  maxConcurrentScraping?: number;
  extractionTimeout?: number;

  // AI configuration
  enableAIEnhancement?: boolean;
  confidenceThreshold?: number;

  // UI preferences
  showProgress?: boolean;
  enableBulkOperations?: boolean;
  autoSave?: boolean;
}

interface EnhancedDiscoveryActions {
  // Basic discovery
  discoverSupplier: (request: SupplierDiscoveryRequest | string) => Promise<void>;

  // Enhanced discovery with web search
  discoverWithWebSearch: (request: SupplierDiscoveryRequest | WebAddressInput) => Promise<void>;

  // Direct website discovery
  discoverFromWebsite: (websiteUrl: string, companyName?: string) => Promise<void>;

  // Bulk discovery
  discoverMultipleSuppliers: (requests: BulkDiscoveryRequest) => Promise<BulkDiscoveryResponse>;

  // Session management
  startDiscoverySession: (
    query: string,
    options?: Partial<DiscoveryConfiguration>
  ) => Promise<string>;
  cancelSession: (sessionId: string) => void;

  // Progress tracking
  getSessionProgress: (sessionId: string) => DiscoveryProgress | null;

  // Utility functions
  validateWebAddress: (input: string) => WebAddressInput;
  generateSearchQuery: (supplierName: string, context?: unknown) => string;

  // Cleanup and reset
  reset: () => void;
  clearResults: () => void;
}

export function useEnhancedSupplierDiscovery(
  initialOptions: EnhancedDiscoveryOptions = {}
): [EnhancedDiscoveryState, EnhancedDiscoveryActions] {
  const [state, setState] = useState<EnhancedDiscoveryState>({
    session: null,
    activeSessions: new Map(),
    webResults: [],
    websiteContents: [],
    extractedFields: [],
    structuredData: null,
    legacyData: null,
    progress: null,
    isLoading: false,
    isSearching: false,
    isExtracting: false,
    isProcessing: false,
    error: null,
    warnings: [],
    processingTime: 0,
    sourcesUsed: [],
    confidenceScore: 0,
    completenessScore: 0,
    costEstimate: 0,
  });

  const options: Required<EnhancedDiscoveryOptions> = useMemo(
    () => ({
      enableWebSearch: true,
      maxSearchResults: 20,
      searchEngines: ['google', 'bing', 'duckduckgo'],
      includeWebsites: true,
      includeBusinessDirectories: true,
      includeSocialMedia: true,
      enableWebScraping: true,
      maxConcurrentScraping: 5,
      extractionTimeout: 30000,
      enableAIEnhancement: false,
      confidenceThreshold: 0.7,
      showProgress: true,
      enableBulkOperations: true,
      autoSave: false,
      ...initialOptions,
    }),
    [initialOptions]
  );

  /**
   * Main discovery function with web capabilities
   */
  const discoverSupplier = useCallback(
    async (request: SupplierDiscoveryRequest | string) => {
      const supplierName = typeof request === 'string' ? request : request.supplierName;
      const context = typeof request === 'string' ? {} : request.additionalContext;

      setState(prev => ({
        ...prev,
        isLoading: true,
        isSearching: true,
        error: null,
        warnings: [],
        processingTime: 0,
      }));

      const startTime = Date.now();

      try {
        // Start discovery session
        const sessionId = await startDiscoverySession(supplierName, {
          sources: {
            webSearch: {
              enabled: options.enableWebSearch,
              providers: [],
              maxResults: options.maxSearchResults,
              timeout: options.extractionTimeout,
            },
            webScraping: {
              enabled: options.enableWebScraping,
              maxConcurrent: options.maxConcurrentScraping,
              timeout: options.extractionTimeout,
              retryAttempts: 3,
              userAgents: [],
            },
            socialMedia: { enabled: options.includeSocialMedia, platforms: [], rateLimit: 60 },
            businessDirectories: {
              enabled: options.includeBusinessDirectories,
              directories: [],
              priority: 1,
            },
          },
          ai: {
            enabled: options.enableAIEnhancement,
            provider: 'openai',
            model: 'gpt-4.1',
            confidenceThreshold: options.confidenceThreshold,
            maxTokens: 2000,
            temperature: 0.1,
          },
          data: {
            validation: { strict: true, requiredFields: ['name'], optionalFields: ['email'] },
            enrichment: { enabled: true, sources: [], autoValidate: true },
            storage: { cacheResults: true, storeRawData: true, retentionDays: 30 },
          },
          output: {
            format: 'both',
            includeMetadata: true,
            includeSources: true,
            includeConfidence: true,
          },
        });

        // Update progress
        updateProgress(sessionId, 'web_search', 'Starting web search...', 10);

        let webResults: WebSearchResult[] = [];
        const websiteContents: WebsiteContent[] = [];
        const extractedFields: ExtractedDataField[] = [];

        // Phase 1: Web Search (if enabled)
        if (options.enableWebSearch) {
          const searchRequest: WebSearchRequest = {
            searchQuery: generateSearchQuery(supplierName, context),
            searchType: 'supplier',
            region: context?.region || 'za',
            maxResults: options.maxSearchResults,
          };

          updateProgress(sessionId, 'web_search', 'Searching web for supplier information...', 20);
          webResults = await webSearchService.searchSuppliers(searchRequest);

          updateProgress(sessionId, 'web_search', `Found ${webResults.length} search results`, 30);
          console.log(`Web search found ${webResults.length} results for ${supplierName}`);
        }

        // Phase 2: Website Content Extraction (if enabled)
        if (options.enableWebScraping && webResults.length > 0) {
          updateProgress(sessionId, 'extraction', 'Extracting content from websites...', 40);

          // Extract content from top search results
          const topUrls = webResults.slice(0, 5).map(result => result.url);

          const extractionPromises = topUrls.map(async (url, index) => {
            try {
              updateProgress(
                sessionId,
                'extraction',
                `Extracting from ${new URL(url).hostname}...`,
                40 + index * 10
              );
              const content = await webScrapingService.extractWebsiteContent(url);

              if (content.status === 'success') {
                const fields = await webScrapingService.extractStructuredData(content);
                return { content, fields };
              }
              return null;
            } catch (error) {
              console.warn(`Failed to extract from ${url}:`, error);
              return null;
            }
          });

          const extractionResults = await Promise.allSettled(extractionPromises);

          extractionResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
              websiteContents.push(result.value.content);
              extractedFields.push(...result.value.fields);
            }
          });

          console.log(`Extracted content from ${websiteContents.length} websites`);
        }

        // Phase 3: Data Processing
        if (extractedFields.length > 0) {
          updateProgress(sessionId, 'processing', 'Processing and structuring data...', 80);

          const discoveryResult = await enhancedDataProcessor.processDiscovery(
            webResults,
            websiteContents,
            extractedFields
          );

          if (discoveryResult.success && discoveryResult.data) {
            setState(prev => ({
              ...prev,
              structuredData: discoveryResult.data.structured,
              webResults,
              websiteContents,
              extractedFields,
              sourcesUsed: discoveryResult.data.raw.sources.map(s => s.name),
              confidenceScore: discoveryResult.data.metadata.confidenceScore,
              completenessScore: discoveryResult.data.metadata.completenessScore,
              costEstimate: discoveryResult.data.metadata.costEstimate,
            }));

            // Convert to legacy format for compatibility
            const legacyData = convertToLegacyFormat(discoveryResult.data.structured);
            setState(prev => ({
              ...prev,
              legacyData,
              processingTime: Date.now() - startTime,
            }));
          } else {
            throw new Error(discoveryResult.error?.message || 'Failed to process discovery data');
          }
        } else {
          throw new Error('No data could be extracted from web sources');
        }

        updateProgress(sessionId, 'completed', 'Discovery completed successfully', 100);
      } catch (error) {
        console.error('Enhanced discovery failed:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Discovery failed',
          processingTime: Date.now() - startTime,
        }));
      } finally {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isSearching: false,
          isExtracting: false,
          isProcessing: false,
        }));
      }
    },
    [generateSearchQuery, options, startDiscoverySession, updateProgress]
  );

  /**
   * Discover supplier using web address input
   */
  const discoverWithWebSearch = useCallback(
    async (request: SupplierDiscoveryRequest | WebAddressInput) => {
      const webInput = validateWebAddress(typeof request === 'string' ? request : request.value);

      if (webInput.type === 'website_url') {
        return discoverFromWebsite(
          webInput.value,
          typeof request === 'string' ? undefined : request.value
        );
      }

      // For other types, use regular discovery
      return discoverSupplier(
        typeof request === 'string' ? request : { supplierName: request.value }
      );
    },
    [discoverFromWebsite, discoverSupplier, validateWebAddress]
  );

  /**
   * Direct website discovery
   */
  const discoverFromWebsite = useCallback(
    async (websiteUrl: string, companyName?: string) => {
      setState(prev => ({
        ...prev,
        isLoading: true,
        isExtracting: true,
        error: null,
        warnings: [],
      }));

      const startTime = Date.now();

      try {
        updateProgress('website', 'extraction', `Extracting from ${websiteUrl}...`, 25);

        // Extract content from website
        const content = await webScrapingService.extractWebsiteContent(websiteUrl);

        if (content.status !== 'success') {
          throw new Error(`Failed to extract content from ${websiteUrl}`);
        }

        updateProgress('website', 'extraction', 'Processing extracted content...', 50);

        // Extract structured data
        const extractedFields = await webScrapingService.extractStructuredData(content);

        if (extractedFields.length === 0) {
          throw new Error('No meaningful data could be extracted from the website');
        }

        updateProgress('website', 'processing', 'Structuring supplier data...', 75);

        // Process into supplier format
        const discoveryResult = await enhancedDataProcessor.processDiscovery(
          [], // No search results for direct website extraction
          [content],
          extractedFields
        );

        if (discoveryResult.success && discoveryResult.data) {
          setState(prev => ({
            ...prev,
            structuredData: discoveryResult.data.structured,
            websiteContents: [content],
            extractedFields,
            sourcesUsed: discoveryResult.data.raw.sources.map(s => s.name),
            confidenceScore: discoveryResult.data.metadata.confidenceScore,
            completenessScore: discoveryResult.data.metadata.completenessScore,
            costEstimate: discoveryResult.data.metadata.costEstimate,
            processingTime: Date.now() - startTime,
          }));

          // Convert to legacy format
          const legacyData = convertToLegacyFormat(discoveryResult.data.structured);
          setState(prev => ({
            ...prev,
            legacyData,
          }));
        } else {
          throw new Error(discoveryResult.error?.message || 'Failed to process website data');
        }

        updateProgress('website', 'completed', 'Website discovery completed', 100);
      } catch (error) {
        console.error('Website discovery failed:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Website discovery failed',
          processingTime: Date.now() - startTime,
        }));
      } finally {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isExtracting: false,
          isProcessing: false,
        }));
      }
    },
    [updateProgress]
  );

  /**
   * Start a discovery session
   */
  const startDiscoverySession = useCallback(
    async (query: string, config?: Partial<DiscoveryConfiguration>): Promise<string> => {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const session: DiscoverySession = {
        id: sessionId,
        query,
        startTime: new Date(),
        status: 'pending',
        progress: 0,
        currentStep: 'Initializing...',
        totalSteps: 7,
        cacheKey: `cache_${query}_${Date.now()}`,
      };

      setState(prev => ({
        ...prev,
        session,
        activeSessions: new Map(prev.activeSessions).set(sessionId, session),
      }));

      return sessionId;
    },
    []
  );

  /**
   * Cancel a discovery session
   */
  const cancelSession = useCallback((sessionId: string) => {
    setState(prev => {
      const activeSessions = new Map(prev.activeSessions);
      const session = activeSessions.get(sessionId);

      if (session) {
        session.status = 'cancelled';
        session.endTime = new Date();
        activeSessions.set(sessionId, session);
      }

      return {
        ...prev,
        activeSessions,
      };
    });
  }, []);

  /**
   * Get session progress
   */
  const getSessionProgress = useCallback(
    (sessionId: string): DiscoveryProgress | null => {
      const session = state.activeSessions.get(sessionId);

      if (!session) return null;

      return {
        sessionId,
        status: session.status,
        progress: session.progress,
        currentStep: session.currentStep,
        estimatedTimeRemaining: 0, // Could calculate based on history
        steps: [], // Would populate with detailed step tracking
      };
    },
    [state.activeSessions]
  );

  /**
   * Validate web address input
   */
  const validateWebAddress = useCallback((input: string): WebAddressInput => {
    const trimmed = input.trim();

    // Check if it's a URL
    try {
      const url = new URL(trimmed);
      return {
        type: 'website_url',
        value: trimmed,
        confidence: 1.0,
        validation: { isValid: true, format: 'url' },
      };
    } catch {
      // Not a URL, check other formats
    }

    // Check if it's an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(trimmed)) {
      return {
        type: 'email',
        value: trimmed,
        confidence: 0.9,
        validation: { isValid: true, format: 'email' },
      };
    }

    // Check if it's a phone number
    const phoneRegex = /(\+27|0)[0-9\s\-()]{8,15}/;
    if (phoneRegex.test(trimmed.replace(/\s/g, ''))) {
      return {
        type: 'phone',
        value: trimmed,
        confidence: 0.8,
        validation: { isValid: true, format: 'phone' },
      };
    }

    // Default to supplier name
    return {
      type: 'supplier_name',
      value: trimmed,
      confidence: 0.7,
      validation: { isValid: trimmed.length >= 2, format: 'text' },
    };
  }, []);

  /**
   * Generate optimized search query
   */
  const generateSearchQuery = useCallback((supplierName: string, context?: unknown): string => {
    let query = `"${supplierName}"`;

    if (context?.industry) {
      query += ` ${context.industry}`;
    }

    if (context?.region === 'za' || !context?.region) {
      query += ' South Africa';
    }

    // Add common business terms
    query += ' contact information';

    return query;
  }, []);

  /**
   * Bulk discovery (placeholder implementation)
   */
  const discoverMultipleSuppliers = useCallback(
    async (requests: BulkDiscoveryRequest): Promise<BulkDiscoveryResponse> => {
      // This would implement bulk discovery logic
      // For now, return a placeholder response
      const results: BulkDiscoveryResponse = {
        totalRequests: requests.requests.length,
        successful: 0,
        failed: 0,
        pending: requests.requests.length,
        results: [],
        summary: {
          averageConfidence: 0,
          averageProcessingTime: 0,
          totalCost: 0,
          topSources: [],
          commonErrors: [],
        },
      };

      return results;
    },
    []
  );

  /**
   * Update progress for a session
   */
  const updateProgress = useCallback(
    (sessionId: string, step: string, message: string, progress: number) => {
      setState(prev => {
        const activeSessions = new Map(prev.activeSessions);
        const session = activeSessions.get(sessionId);

        if (session) {
          session.currentStep = message;
          session.progress = progress;
          session.status = 'running';
          activeSessions.set(sessionId, session);
        }

        return {
          ...prev,
          activeSessions,
          progress: session
            ? {
                sessionId,
                status: session.status,
                progress: session.progress,
                currentStep: session.currentStep,
                estimatedTimeRemaining: 0,
                steps: [],
              }
            : null,
        };
      });
    },
    []
  );

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setState({
      session: null,
      activeSessions: new Map(),
      webResults: [],
      websiteContents: [],
      extractedFields: [],
      structuredData: null,
      legacyData: null,
      progress: null,
      isLoading: false,
      isSearching: false,
      isExtracting: false,
      isProcessing: false,
      error: null,
      warnings: [],
      processingTime: 0,
      sourcesUsed: [],
      confidenceScore: 0,
      completenessScore: 0,
      costEstimate: 0,
    });
  }, []);

  /**
   * Clear results but keep session state
   */
  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      webResults: [],
      websiteContents: [],
      extractedFields: [],
      structuredData: null,
      legacyData: null,
      error: null,
      warnings: [],
      sourcesUsed: [],
      confidenceScore: 0,
      completenessScore: 0,
      costEstimate: 0,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup browser instances if needed
      webScrapingService.cleanup();
    };
  }, []);

  const actions: EnhancedDiscoveryActions = {
    discoverSupplier,
    discoverWithWebSearch,
    discoverFromWebsite,
    discoverMultipleSuppliers,
    startDiscoverySession,
    cancelSession,
    getSessionProgress,
    validateWebAddress,
    generateSearchQuery,
    reset,
    clearResults,
  };

  return [state, actions];
}

/**
 * Convert structured data to legacy format for compatibility
 */
function convertToLegacyFormat(structuredData: StructuredData): DiscoveredSupplierData {
  return {
    supplierName: structuredData.supplier.name || '',
    registrationNumber: structuredData.supplier.registrationNumber || '',
    address: {
      street: structuredData.location.primaryAddress?.street || '',
      city: structuredData.location.primaryAddress?.city || '',
      province: structuredData.location.primaryAddress?.province || '',
      postalCode: structuredData.location.primaryAddress?.postalCode || '',
      country: structuredData.location.primaryAddress?.country || 'South Africa',
    },
    contactInfo: {
      phone: structuredData.contact.primaryPhone || '',
      email: structuredData.contact.primaryEmail || '',
      website: structuredData.contact.website || '',
    },
    businessInfo: {
      industry: structuredData.supplier.industry || '',
      establishedDate: structuredData.supplier.foundedYear?.toString() || '',
      employeeCount: structuredData.supplier.employeeCount || 0,
      annualRevenue: structuredData.supplier.annualRevenue || 0,
    },
    compliance: {
      vatNumber: structuredData.supplier.vatNumber || '',
      beeRating: structuredData.compliance.beeLevel || '',
      certifications: structuredData.compliance.certifications?.map(c => c.name) || [],
    },
    confidence: {
      overall: 0.8, // Would calculate from actual confidence scores
      individual: {},
    },
    sources: [], // Would populate from metadata
    discoveredAt: new Date(),
  };
}
