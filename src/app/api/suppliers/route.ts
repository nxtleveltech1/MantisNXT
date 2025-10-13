import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/api-auth';
import { z } from 'zod';
import { CacheInvalidator } from '@/lib/cache/invalidation';
import { CacheManager } from '@/lib/cache/query-cache';
import { SupplierService, createErrorResponse } from '@/lib/services/UnifiedDataService';

// Simple schema for basic supplier creation
const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  contact_person: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  tax_id: z.string().optional(),
  payment_terms: z.string().optional(),
  primary_category: z.string().optional(),
  geographic_region: z.string().optional(),
  preferred_supplier: z.boolean().default(false),
  bee_level: z.string().optional(),
  local_content_percentage: z.number().min(0).max(100).optional(),
});

// Enhanced schema for complex supplier form data
const enhancedSupplierSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  legalName: z.string().optional(),
  website: z.string().optional().or(z.literal('')),
  industry: z.string().optional(),
  tier: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  primaryContact: z
    .object({
      name: z.string().optional(),
      title: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      department: z.string().optional(),
    })
    .optional(),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  foundedYear: z.number().optional(),
  employeeCount: z.number().optional(),
  annualRevenue: z.number().optional(),
  currency: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  products: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  leadTime: z.number().optional(),
  minimumOrderValue: z.number().optional(),
  paymentTerms: z.string().optional(),
});

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);

    // Extract and validate query parameters
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status')?.split(',');
    const page = parseInt(searchParams.get('page') || '1');
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(Math.max(1, limitParam), 1000);
    const cursor = searchParams.get('cursor') || undefined;
    const sortBy = searchParams.get('sort_by') || 'name';
    const sortOrder = (searchParams.get('sort_order') || 'asc') as 'asc' | 'desc';

    // Request validation
    if (page > 10000) {
      const errorResponse = createErrorResponse(
        'Page number too large',
        'Use cursor-based pagination for large offsets'
      );
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (search && search.length < 2) {
      const errorResponse = createErrorResponse(
        'Search term too short',
        'Search term must be at least 2 characters'
      );
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Use unified service
    const result = await SupplierService.getSuppliers({
      page,
      limit,
      cursor,
      search,
      filters: { status },
      sortBy,
      sortOrder,
    });

    // Return error if service failed
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    // Create response with performance headers
    const response = NextResponse.json(result);

    if (result.meta?.queryTime) {
      response.headers.set('X-Query-Duration-Ms', result.meta.queryTime.toFixed(2));
    }
    if (result.meta?.queryFingerprint) {
      response.headers.set('X-Query-Fingerprint', result.meta.queryFingerprint);
    }

    return response;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    const errorResponse = createErrorResponse(
      'Failed to fetch suppliers',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    // Try enhanced schema first (from EnhancedSupplierForm), fall back to simple schema
    let validatedData: any;
    let isEnhanced = false;

    try {
      validatedData = enhancedSupplierSchema.parse(body);
      isEnhanced = true;
    } catch {
      validatedData = supplierSchema.parse(body);
    }

    // Prepare supplier data for unified service
    const supplierData = {
      name: validatedData.name,
      code: isEnhanced ? validatedData.code : undefined,
      email: isEnhanced ? validatedData.primaryContact?.email : validatedData.email,
      phone: isEnhanced ? validatedData.primaryContact?.phone : validatedData.phone,
      website: validatedData.website,
      currency: isEnhanced ? validatedData.currency : 'ZAR',
      paymentTerms: validatedData.paymentTerms || validatedData.payment_terms,
      taxNumber: isEnhanced
        ? validatedData.taxId || validatedData.registrationNumber
        : validatedData.tax_id,
      active: true,
    };

    // Use unified service
    const result = await SupplierService.createSupplier(supplierData);

    // Return error if service failed
    if (!result.success) {
      return NextResponse.json(result, {
        status: result.error?.includes('already exists') ? 409 : 500,
      });
    }

    // Invalidate cache after successful creation
    if (result.data && typeof result.data === 'object' && 'id' in result.data) {
      CacheInvalidator.invalidateSupplier(result.data.id, supplierData.name);
      // Invalidate query cache for supplier lists
      CacheManager.invalidateByTag('suppliers:');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating supplier:', error);

    if (error instanceof z.ZodError) {
      const errorResponse = createErrorResponse(
        'Validation failed',
        error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = createErrorResponse(
      'Failed to create supplier',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
});
