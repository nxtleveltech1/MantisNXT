import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/ai/api-utils';
import { getSupplierDiscoveryConfig } from '@/lib/ai/supplier-discovery-config';
import { SupplierIntelligenceService } from '@/services/ai/SupplierIntelligenceService';

/**
 * API endpoint for extracting supplier information from a website URL
 * POST /api/ai/suppliers/extract-from-website
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and get organization ID
    const user = await authenticateRequest(request);
    const orgId = user.org_id;

    // Load configuration from database
    const config = await getSupplierDiscoveryConfig(orgId);

    // Create service instance with config
    const supplierService = new SupplierIntelligenceService(config);

    // Parse request body
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Website URL is required',
        },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid URL format',
        },
        { status: 400 }
      );
    }

    console.log('🌐 Extracting data from website:', url);

    // Extract supplier data from website
    const result = await supplierService.extractFromWebsite(url);

    // Format the response for the WebSupplierDiscovery component
    if (result.success && result.data && result.data.length > 0) {
      // Use transformToFormData to get properly formatted data
      const extractedSupplier = result.data[0];
      const transformedData = supplierService.transformToFormData(extractedSupplier, url);

      // Format source label from metadata sources
      let sourceLabel = 'website_extraction';
      if (result.metadata?.sources && result.metadata.sources.length > 0) {
        const providers = result.metadata.sources.filter(
          (s: string) => s !== new URL(url).hostname
        );
        if (providers.length > 0) {
          // Format: "default, provider1, provider2" or just "default" if single provider
          sourceLabel = providers.length === 1 ? providers[0] : providers.join(', ');
        }
      }

      // Format for component consumption
      const formattedData = [
        {
          id: `web_ext_${Date.now()}`,
          url: url,
          title: `${extractedSupplier.companyName || 'Unknown Company'} - ${extractedSupplier.industry || 'Professional Services'}`,
          description:
            extractedSupplier.description || `Website content from ${new URL(url).hostname}`,
          // Include all extracted fields
          companyName: extractedSupplier.companyName,
          industry: extractedSupplier.industry,
          location: extractedSupplier.location,
          contactEmail: extractedSupplier.contactEmail,
          contactPhone: extractedSupplier.contactPhone,
          employees: extractedSupplier.employees,
          founded: extractedSupplier.founded,
          confidence: result.metadata?.confidence || 80,
          source: sourceLabel,
          services: extractedSupplier.services || [],
          products: extractedSupplier.products || [],
          certifications: extractedSupplier.certifications || [],
          // Include transformed form data
          ...transformedData,
          // Ensure these are explicitly included
          categories: transformedData.categories || [],
          tags: transformedData.tags || extractedSupplier.tags || [],
          brands: transformedData.brands || [],
          tradingName: transformedData.businessInfo?.tradingName,
          website: transformedData.businessInfo?.website || extractedSupplier.website || url,
          addresses: transformedData.addresses || [],
        },
      ];

      console.log('✅ Website extraction completed:', formattedData.length, 'suppliers found');

      return NextResponse.json({
        success: true,
        data: formattedData,
        metadata: result.metadata,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log('❌ No supplier data found on website');
      return NextResponse.json({
        success: false,
        error: 'No supplier data found on website',
        data: [],
        metadata: {
          searchType: 'website',
          totalResults: 0,
          confidence: 0,
          sources: [],
        },
      });
    }
  } catch (error) {
    console.error('❌ API error in extract-from-website:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        data: [],
        metadata: {
          searchType: 'website',
          totalResults: 0,
          confidence: 0,
          sources: [],
        },
      },
      { status: 500 }
    );
  }
}
