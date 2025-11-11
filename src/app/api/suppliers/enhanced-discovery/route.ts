/**
 * Enhanced Supplier Discovery API with Web Search and Scraping
 * Endpoint: /api/suppliers/enhanced-discovery
 * 
 * Provides comprehensive supplier discovery using:
 * - Web search across multiple engines
 * - Website content extraction and scraping
 * - Data validation and structuring
 * - AI-powered data enhancement
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  WebSearchRequest,
  DiscoveryConfiguration,
  BulkDiscoveryRequest,
  BulkDiscoveryResponse,
  WebAddressInput
} from '@/lib/supplier-discovery/enhanced-types';
import { useEnhancedSupplierDiscovery } from '@/lib/supplier-discovery/enhanced-use-supplier-discovery';
import { webSearchService } from '@/lib/supplier-discovery/web-search-service';
import { webScrapingService } from '@/lib/supplier-discovery/web-scraping-service';
import { enhancedDataProcessor } from '@/lib/supplier-discovery/enhanced-data-processor';

// Request validation schemas
const enhancedDiscoverySchema = z.object({
  supplierName: z.string().min(2, 'Supplier name must be at least 2 characters'),
  websiteUrl: z.string().url().optional(),
  additionalContext: z.object({
    industry: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    businessType: z.string().optional()
  }).optional(),
  options: z.object({
    enableWebSearch: z.boolean().default(true),
    maxSearchResults: z.number().min(1).max(50).default(20),
    searchEngines: z.array(z.string()).default(['google', 'bing']),
    enableWebScraping: z.boolean().default(true),
    enableAIEnhancement: z.boolean().default(false),
    confidenceThreshold: z.number().min(0).max(1).default(0.7),
    extractionTimeout: z.number().min(5000).max(60000).default(30000)
  }).optional()
});

const webAddressDiscoverySchema = z.object({
  webAddress: z.string().min(1, 'Web address is required'),
  companyName: z.string().optional(),
  context: z.object({
    industry: z.string().optional(),
    region: z.string().optional()
  }).optional()
});

const bulkDiscoverySchema = z.object({
  requests: z.array(z.object({
    supplierName: z.string().min(2),
    websiteUrl: z.string().url().optional(),
    additionalContext: z.any().optional(),
    priority: z.enum(['low', 'normal', 'high']).default('normal')
  })).min(1).max(20),
  options: z.object({
    maxConcurrent: z.number().min(1).max(10).default(5),
    timeoutPerRequest: z.number().min(10000).max(120000).default(60000),
    retryAttempts: z.number().min(0).max(3).default(1),
    stopOnFirstError: z.boolean().default(false),
    priorityMode: z.enum(['sequential', 'parallel', 'mixed']).default('parallel')
  }).optional()
});

/**
 * POST /api/suppliers/enhanced-discovery
 * Enhanced supplier discovery with web search and scraping
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Validate request
    const validatedData = enhancedDiscoverySchema.parse(body);
    
    const { supplierName, websiteUrl, additionalContext, options } = validatedData;
    
    console.log(`🚀 Enhanced discovery started for: ${supplierName}`, {
      hasWebsite: !!websiteUrl,
      context: additionalContext,
      options
    });

    let discoveryResult;
    
    // If website URL is provided, do direct website extraction
    if (websiteUrl) {
      discoveryResult = await discoverFromWebsite(websiteUrl, supplierName, options);
    } else {
      // Do comprehensive discovery with web search
      discoveryResult = await discoverWithWebSearch(supplierName, additionalContext, options);
    }

    const processingTime = Date.now() - startTime;
    
    if (discoveryResult.success) {
      console.log(`✅ Enhanced discovery completed for ${supplierName} in ${processingTime}ms`);
      
      return NextResponse.json({
        success: true,
        data: {
          supplier: discoveryResult.data?.structured,
          legacy: convertToLegacyFormat(discoveryResult.data?.structured),
          raw: discoveryResult.data?.raw,
          metadata: {
            processingTime,
            sourcesUsed: discoveryResult.data?.raw.sources.map(s => s.name) || [],
            confidenceScore: discoveryResult.data?.metadata.confidenceScore || 0,
            completenessScore: discoveryResult.data?.metadata.completenessScore || 0,
            costEstimate: discoveryResult.data?.metadata.costEstimate || 0,
            webSearchUsed: options?.enableWebSearch || false,
            webScrapingUsed: options?.enableWebScraping || false,
            aiEnhanced: options?.enableAIEnhancement || false
          }
        },
        message: 'Enhanced supplier discovery completed successfully'
      });
    } else {
      throw new Error(discoveryResult.error?.message || 'Discovery failed');
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Enhanced discovery failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
          metadata: { processingTime }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Enhanced discovery failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        metadata: { processingTime }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppliers/enhanced-discovery/web-address
 * Discover supplier from web address (URL, email, phone, etc.)
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Validate request
    const validatedData = webAddressDiscoverySchema.parse(body);
    
    const { webAddress, companyName, context } = validatedData;
    
    console.log(`🌐 Web address discovery: ${webAddress}`);
    
    // Determine input type and process accordingly
    const addressType = detectWebAddressType(webAddress);
    
    let discoveryResult;
    
    switch (addressType) {
      case 'website_url':
        discoveryResult = await discoverFromWebsite(webAddress, companyName);
        break;
      case 'email':
        const domain = extractDomainFromEmail(webAddress);
        discoveryResult = await discoverWithWebSearch(companyName || domain, { ...context, domain });
        break;
      case 'phone':
        discoveryResult = await discoverWithWebSearch(companyName || 'business', context);
        break;
      default:
        discoveryResult = await discoverWithWebSearch(webAddress, context);
    }
    
    const processingTime = Date.now() - startTime;
    
    if (discoveryResult.success) {
      return NextResponse.json({
        success: true,
        data: {
          inputType: addressType,
          inputValue: webAddress,
          supplier: discoveryResult.data?.structured,
          legacy: convertToLegacyFormat(discoveryResult.data?.structured),
          metadata: {
            processingTime,
            confidenceScore: discoveryResult.data?.metadata.confidenceScore || 0,
            sourcesUsed: discoveryResult.data?.raw.sources.map(s => s.name) || []
          }
        },
        message: `Web address discovery completed for ${addressType}`
      });
    } else {
      throw new Error(discoveryResult.error?.message || 'Discovery failed');
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Web address discovery failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
          metadata: { processingTime }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Web address discovery failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        metadata: { processingTime }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppliers/enhanced-discovery/bulk
 * Bulk supplier discovery for multiple suppliers
 */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Validate request
    const validatedData = bulkDiscoverySchema.parse(body);
    
    const { requests, options } = validatedData;
    
    console.log(`📦 Bulk discovery started for ${requests.length} suppliers`);
    
    const results = [];
    const errors = [];
    
    // Process requests based on priority mode
    switch (options?.priorityMode) {
      case 'sequential':
        for (const req of requests) {
          try {
            const result = await processSingleDiscovery(req);
            results.push(result);
          } catch (error) {
            errors.push({ supplier: req.supplierName, error: error instanceof Error ? error.message : String(error) });
            if (options?.stopOnFirstError) break;
          }
        }
        break;
        
      case 'parallel':
        const promises = requests.map(async (req) => {
          try {
            return await processSingleDiscovery(req);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push({ supplier: req.supplierName, error: errorMessage });
            return { success: false, error: errorMessage };
          }
        });
        
        const settledResults = await Promise.allSettled(promises);
        settledResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
            errors.push({ supplier: requests[index].supplierName, error: errorMessage });
          }
        });
        break;
        
      case 'mixed':
        // Process high priority first, then others
        const highPriority = requests.filter(r => r.priority === 'high');
        const normalPriority = requests.filter(r => r.priority === 'normal');
        const lowPriority = requests.filter(r => r.priority === 'low');
        
        const priorityGroups = [highPriority, normalPriority, lowPriority].filter(group => group.length > 0);
        
        for (const group of priorityGroups) {
          const groupPromises = group.map(async (req) => {
            try {
              return await processSingleDiscovery(req);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              errors.push({ supplier: req.supplierName, error: errorMessage });
              return { success: false, error: errorMessage };
            }
          });
          
          const groupResults = await Promise.allSettled(groupPromises);
          groupResults.forEach((result) => {
            if (result.status === 'fulfilled') {
              results.push(result.value);
            }
          });
        }
        break;
    }
    
    const processingTime = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    console.log(`📦 Bulk discovery completed: ${successful}/${results.length} successful in ${processingTime}ms`);
    
    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          totalRequests: requests.length,
          successful,
          failed,
          processingTime,
          averageProcessingTime: processingTime / Math.max(results.length, 1),
          errorCount: errors.length,
          topErrors: errors.slice(0, 5)
        }
      },
      message: `Bulk discovery completed: ${successful}/${requests.length} successful`
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Bulk discovery failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
          metadata: { processingTime }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Bulk discovery failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        metadata: { processingTime }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/suppliers/enhanced-discovery/stats
 * Get discovery service statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'overview';
    
    let stats;
    
    switch (type) {
      case 'search':
        stats = webSearchService.getStatistics();
        break;
      case 'scraping':
        stats = webScrapingService.getStatistics();
        break;
      case 'processing':
        stats = enhancedDataProcessor.getStatistics();
        break;
      default:
        stats = {
          search: webSearchService.getStatistics(),
          scraping: webScrapingService.getStatistics(),
          processing: enhancedDataProcessor.getStatistics(),
          timestamp: new Date().toISOString()
        };
    }
    
    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to get discovery stats:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper Functions
 */

/**
 * Discover supplier from website URL
 */
async function discoverFromWebsite(
  websiteUrl: string, 
  companyName?: string, 
  options?: any
) {
  try {
    console.log(`🌐 Extracting from website: ${websiteUrl}`);
    
    // Extract website content
    const content = await webScrapingService.extractWebsiteContent(websiteUrl);
    
    if (content.status !== 'success') {
      throw new Error(`Failed to extract content from ${websiteUrl}`);
    }
    
    // Extract structured data
    const extractedFields = await webScrapingService.extractStructuredData(content);
    
    if (extractedFields.length === 0) {
      throw new Error('No meaningful data could be extracted from the website');
    }
    
    // Process into supplier format
    const discoveryResult = await enhancedDataProcessor.processDiscovery(
      [], // No search results for direct website extraction
      [content],
      extractedFields
    );
    
    return discoveryResult;
    
  } catch (error) {
    console.error('Website discovery failed:', error);
    return {
      success: false,
      error: {
        code: 'WEBSITE_DISCOVERY_FAILED',
        message: error instanceof Error ? error.message : 'Website discovery failed',
        timestamp: new Date()
      }
    };
  }
}

/**
 * Discover supplier with web search
 */
async function discoverWithWebSearch(
  supplierName: string, 
  context?: any, 
  options?: any
) {
  try {
    console.log(`🔍 Web search for: ${supplierName}`);
    
    // Prepare search request
    const searchRequest: WebSearchRequest = {
      searchQuery: generateSearchQuery(supplierName, context),
      searchType: 'supplier',
      region: context?.region || 'za',
      maxResults: options?.maxSearchResults || 20
    };
    
    // Perform web search
    const webResults = await webSearchService.searchSuppliers(searchRequest);
    
    console.log(`Found ${webResults.length} search results`);
    
    if (webResults.length === 0) {
      throw new Error('No search results found');
    }
    
    // Extract content from top results
    const topUrls = webResults.slice(0, 5).map(result => result.url);
    const websiteContents = [];
    const allExtractedFields = [];
    
    for (const url of topUrls) {
      try {
        const content = await webScrapingService.extractWebsiteContent(url);
        
        if (content.status === 'success') {
          websiteContents.push(content);
          const fields = await webScrapingService.extractStructuredData(content);
          allExtractedFields.push(...fields);
        }
      } catch (error) {
        console.warn(`Failed to extract from ${url}:`, error);
      }
    }
    
    if (allExtractedFields.length === 0) {
      throw new Error('No data could be extracted from search results');
    }
    
    // Process all data
    const discoveryResult = await enhancedDataProcessor.processDiscovery(
      webResults,
      websiteContents,
      allExtractedFields
    );
    
    return discoveryResult;
    
  } catch (error) {
    console.error('Web search discovery failed:', error);
    return {
      success: false,
      error: {
        code: 'WEB_SEARCH_DISCOVERY_FAILED',
        message: error instanceof Error ? error.message : 'Web search discovery failed',
        timestamp: new Date()
      }
    };
  }
}

/**
 * Process single discovery request
 */
async function processSingleDiscovery(request: any) {
  const startTime = Date.now();
  
  try {
    let discoveryResult;
    
    if (request.websiteUrl) {
      discoveryResult = await discoverFromWebsite(request.websiteUrl, request.supplierName);
    } else {
      discoveryResult = await discoverWithWebSearch(request.supplierName, request.additionalContext);
    }
    
    return {
      success: discoveryResult.success,
      supplierName: request.supplierName,
      data: discoveryResult.success ? discoveryResult.data : null,
      error: discoveryResult.success ? null : discoveryResult.error?.message,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      success: false,
      supplierName: request.supplierName,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Generate optimized search query
 */
function generateSearchQuery(supplierName: string, context?: any): string {
  let query = `"${supplierName}"`;
  
  if (context?.industry) {
    query += ` ${context.industry}`;
  }
  
  if (context?.region === 'za' || !context?.region) {
    query += ' South Africa';
  }
  
  query += ' contact information';
  
  return query;
}

/**
 * Detect web address type
 */
function detectWebAddressType(input: string): 'website_url' | 'email' | 'phone' | 'supplier_name' {
  const trimmed = input.trim();
  
  // Check if it's a URL
  try {
    new URL(trimmed);
    return 'website_url';
  } catch {
    // Not a URL, continue checking
  }
  
  // Check if it's an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(trimmed)) {
    return 'email';
  }
  
  // Check if it's a phone number
  const phoneRegex = /(\+27|0)[0-9\s\-()]{8,15}/;
  if (phoneRegex.test(trimmed.replace(/\s/g, ''))) {
    return 'phone';
  }
  
  // Default to supplier name
  return 'supplier_name';
}

/**
 * Extract domain from email address
 */
function extractDomainFromEmail(email: string): string {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : '';
}

/**
 * Convert structured data to legacy format for compatibility
 */
function convertToLegacyFormat(structuredData: any) {
  if (!structuredData) return null;
  
  return {
    supplierName: structuredData.supplier?.name || '',
    registrationNumber: structuredData.supplier?.registrationNumber || '',
    address: {
      street: structuredData.location?.primaryAddress?.street || '',
      city: structuredData.location?.primaryAddress?.city || '',
      province: structuredData.location?.primaryAddress?.province || '',
      postalCode: structuredData.location?.primaryAddress?.postalCode || '',
      country: structuredData.location?.primaryAddress?.country || 'South Africa'
    },
    contactInfo: {
      phone: structuredData.contact?.primaryPhone || '',
      email: structuredData.contact?.primaryEmail || '',
      website: structuredData.contact?.website || ''
    },
    businessInfo: {
      industry: structuredData.supplier?.industry || '',
      establishedDate: structuredData.supplier?.foundedYear?.toString() || '',
      employeeCount: structuredData.supplier?.employeeCount || 0,
      annualRevenue: structuredData.supplier?.annualRevenue || 0
    },
    compliance: {
      vatNumber: structuredData.supplier?.vatNumber || '',
      beeRating: structuredData.compliance?.beeLevel || '',
      certifications: structuredData.compliance?.certifications?.map((c: any) => c.name) || []
    },
    confidence: {
      overall: 0.8, // Would calculate from actual confidence scores
      individual: {}
    },
    sources: [], // Would populate from metadata
    discoveredAt: new Date()
  };
}