/**
 * API Route for AI Supplier Discovery
 * Endpoint: /api/suppliers/discovery
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supplierDiscoveryEngine } from '@/lib/supplier-discovery/engine';

// Request validation schema
const discoveryRequestSchema = z.object({
  supplierName: z.string().min(2, 'Supplier name must be at least 2 characters'),
  additionalContext: z.object({
    industry: z.string().optional(),
    region: z.string().optional(),
    website: z.string().url().optional()
  }).optional()
});

const bulkDiscoveryRequestSchema = z.object({
  suppliers: z.array(discoveryRequestSchema).min(1).max(10) // Limit bulk requests
});

const refreshRequestSchema = z.object({
  supplierName: z.string().min(2),
  additionalContext: z.any().optional()
});

/**
 * POST /api/suppliers/discovery
 * Discover supplier information by name
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validatedData = discoveryRequestSchema.parse(body);

    console.log(`API: Starting supplier discovery for: ${validatedData.supplierName}`);

    // Initialize discovery engine if needed
    if (!supplierDiscoveryEngine['isInitialized']) {
      await supplierDiscoveryEngine.initialize();
    }

    // Perform discovery
    const result = await supplierDiscoveryEngine.discoverSupplier(validatedData);

    // Log result
    console.log(`API: Discovery completed for ${validatedData.supplierName}: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        metadata: {
          processingTime: result.processingTime,
          sourcesUsed: result.sourcesUsed,
          confidence: result.data?.confidence.overall || 0
        },
        message: 'Supplier information discovered successfully'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          metadata: {
            processingTime: result.processingTime,
            sourcesUsed: result.sourcesUsed
          }
        },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Supplier discovery API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/suppliers/discovery
 * Bulk supplier discovery
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate bulk request
    const validatedData = bulkDiscoveryRequestSchema.parse(body);

    console.log(`API: Starting bulk discovery for ${validatedData.suppliers.length} suppliers`);

    // Initialize discovery engine if needed
    if (!supplierDiscoveryEngine['isInitialized']) {
      await supplierDiscoveryEngine.initialize();
    }

    // Perform bulk discovery
    const results = await supplierDiscoveryEngine.discoverMultipleSuppliers(validatedData.suppliers);

    // Calculate summary statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    const averageProcessingTime = totalProcessingTime / results.length;

    console.log(`API: Bulk discovery completed: ${successful}/${results.length} successful`);

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        totalRequests: results.length,
        successful,
        failed,
        totalProcessingTime,
        averageProcessingTime
      },
      message: `Bulk discovery completed: ${successful}/${results.length} successful`
    });

  } catch (error) {
    console.error('Bulk supplier discovery API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/suppliers/discovery
 * Refresh cached supplier data
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate refresh request
    const validatedData = refreshRequestSchema.parse(body);

    console.log(`API: Refreshing supplier data for: ${validatedData.supplierName}`);

    // Initialize discovery engine if needed
    if (!supplierDiscoveryEngine['isInitialized']) {
      await supplierDiscoveryEngine.initialize();
    }

    // Refresh supplier data
    const result = await supplierDiscoveryEngine.refreshSupplierData(
      validatedData.supplierName,
      validatedData.additionalContext
    );

    console.log(`API: Refresh completed for ${validatedData.supplierName}: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        metadata: {
          processingTime: result.processingTime,
          sourcesUsed: result.sourcesUsed,
          confidence: result.data?.confidence.overall || 0,
          refreshed: true
        },
        message: 'Supplier data refreshed successfully'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          metadata: {
            processingTime: result.processingTime,
            sourcesUsed: result.sourcesUsed,
            refreshed: false
          }
        },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Supplier refresh API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}