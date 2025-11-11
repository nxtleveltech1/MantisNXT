/**
 * AI Supplier Web Search API
 * Searches the internet for real supplier information using the SupplierIntelligenceService
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/ai/api-utils';
import { getSupplierDiscoveryConfig } from '@/lib/ai/supplier-discovery-config';
import { SupplierIntelligenceService } from '@/services/ai/SupplierIntelligenceService';

export async function POST(request: NextRequest) {
  try {
    // Authenticate and get organization ID
    const user = await authenticateRequest(request);
    const orgId = user.org_id;

    // Load configuration from database
    const config = await getSupplierDiscoveryConfig(orgId);

    // Create service instance with config
    const supplierService = new SupplierIntelligenceService(config);

    const body = await request.json();
    // Support both query and supplierName for backwards compatibility
    const { query, supplierName, maxResults = 10 } = body;
    const searchQuery = query || supplierName;

    if (!searchQuery || typeof searchQuery !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Query or supplier name is required',
        },
        { status: 400 }
      );
    }

    console.log('🔍 Web searching for supplier:', searchQuery);

    // Use the real web discovery service with correct parameters
    const webResult = await supplierService.discoverSuppliers(searchQuery, {
      maxResults,
      filters: { minConfidence: 50 },
    });

    if (!webResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: webResult.error || 'Web search failed',
          data: [],
          metadata: webResult.metadata,
        },
        { status: 500 }
      );
    }

    // Return the extracted data in the format expected by the component
    // Use transformToFormData to get properly formatted data with all fields
    const formattedData =
      webResult.data && webResult.data.length > 0
        ? webResult.data.map((supplier, index) => {
            const transformedData = supplierService.transformToFormData(supplier, searchQuery);
            return {
              id: `web_sup_${Date.now()}_${index}`,
              url:
                supplier.website ||
                transformedData.businessInfo?.website ||
                `https://www.${(supplier.companyName || 'company').toLowerCase().replace(/\s+/g, '')}.com`,
              title: `${supplier.companyName || 'Unknown Company'} - ${supplier.industry || 'Professional Services'}`,
              description:
                supplier.description ||
                `${supplier.companyName || 'Company'} provides ${supplier.services?.slice(0, 3).join(', ') || 'professional services'}`,
              // Include all extracted fields
              companyName: supplier.companyName,
              industry: supplier.industry,
              location: supplier.location,
              contactEmail: supplier.contactEmail,
              contactPhone: supplier.contactPhone,
              employees: supplier.employees,
              founded: supplier.founded,
              confidence: webResult.metadata?.confidence || 80,
              source: 'web_search',
              services: supplier.services || [],
              products: supplier.products || [],
              certifications: supplier.certifications || [],
              addresses: supplier.addresses || [],
              socialMedia: supplier.socialMedia || {},
              // Include transformed form data fields
              categories: transformedData.categories || [],
              tags: transformedData.tags || supplier.tags || [],
              brands: transformedData.brands || [],
              tradingName: transformedData.businessInfo?.tradingName,
              website: transformedData.businessInfo?.website || supplier.website,
              code: transformedData.code,
              // Include full transformed data for comprehensive mapping
              ...transformedData,
            };
          })
        : [];

    console.log('✅ Web search completed, found:', formattedData.length, 'suppliers');

    return NextResponse.json({
      success: true,
      data: formattedData,
      metadata: webResult.metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Web search failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Web search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
