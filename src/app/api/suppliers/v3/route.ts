/**
 * Unified Supplier API v3 - Production-Ready Implementation
 * Replaces all conflicting supplier endpoints with single, robust API
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { APIResponse, PaginatedAPIResponse } from '@/lib/suppliers/types/SupplierDomain';
import { listSuppliers, upsertSupplier, deactivateSupplier } from '@/services/ssot/supplierService';
import { CacheInvalidator } from '@/lib/cache/invalidation';

// SSOT services used directly

// Validation Schemas - All fields optional to match form
const CreateSupplierSchema = z.object({
  name: z.string().optional().or(z.literal('')),
  code: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional(),
  tier: z.enum(['strategic', 'preferred', 'approved', 'conditional']).optional(),
  categories: z.array(z.string()).default([]), // Changed from category to categories (array)
  tags: z.array(z.string()).default([]),
  brands: z.array(z.string()).default([]),

  businessInfo: z
    .object({
      legalName: z.string().optional().or(z.literal('')),
      tradingName: z.string().optional().or(z.literal('')),
      taxId: z.string().optional().or(z.literal('')),
      registrationNumber: z.string().optional().or(z.literal('')),
      website: z.string().url().optional().or(z.literal('')),
      foundedYear: z.number().min(1800).max(new Date().getFullYear()).optional(),
      employeeCount: z.number().min(1).optional(),
      annualRevenue: z.number().min(0).optional(),
      currency: z.string().optional().or(z.literal('')),
    })
    .optional(),

  contacts: z
    .array(
      z.object({
        type: z.enum(['primary', 'billing', 'technical', 'sales', 'support']).optional(),
        name: z.string().optional().or(z.literal('')),
        title: z.string().optional().or(z.literal('')),
        email: z.string().email('Invalid email address').optional().or(z.literal('')),
        phone: z.string().optional().or(z.literal('')),
        mobile: z.string().optional().or(z.literal('')),
        department: z.string().optional().or(z.literal('')),
        isPrimary: z.boolean().default(false),
        isActive: z.boolean().default(true),
      })
    )
    .optional()
    .default([]),

  addresses: z
    .array(
      z.object({
        type: z
          .enum(['headquarters', 'billing', 'shipping', 'warehouse', 'manufacturing'])
          .optional(),
        name: z.string().optional().or(z.literal('')),
        addressLine1: z.string().optional().or(z.literal('')),
        addressLine2: z.string().optional().or(z.literal('')),
        city: z.string().optional().or(z.literal('')),
        state: z.string().optional().or(z.literal('')),
        postalCode: z.string().optional().or(z.literal('')),
        country: z.string().optional().or(z.literal('')),
        isPrimary: z.boolean().default(false),
        isActive: z.boolean().default(true),
      })
    )
    .optional()
    .default([]),

  capabilities: z
    .object({
      products: z.array(z.string()).default([]),
      services: z.array(z.string()).default([]),
      leadTime: z.number().optional(),
      paymentTerms: z.string().optional().or(z.literal('')),
    })
    .optional(),

  financial: z
    .object({
      creditRating: z.string().optional().or(z.literal('')),
      paymentTerms: z.string().optional().or(z.literal('')),
      currency: z.string().optional().or(z.literal('')),
    })
    .optional(),

  notes: z.string().optional().or(z.literal('')),
});

const UpdateSupplierSchema = CreateSupplierSchema.partial();

const STATUS_VALUES = ['active', 'inactive', 'pending', 'suspended'] as const;
const TIER_VALUES = ['strategic', 'preferred', 'approved', 'conditional'] as const;

const SupplierFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.enum(STATUS_VALUES)).optional(),
  tier: z.array(z.enum(TIER_VALUES)).optional(),
  category: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  country: z.array(z.string()).optional(),
  state: z.array(z.string()).optional(),
  city: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxRating: z.number().min(0).max(5).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(1000).default(50),
  sortBy: z.enum(['name', 'code', 'status', 'tier', 'rating', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Error handling utility
function createErrorResponse(
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse {
  const response: APIResponse<null> = {
    success: false,
    data: null,
    error: message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

function createSuccessResponse<T>(data: T, message?: string): NextResponse {
  const response: APIResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response);
}

function createPaginatedResponse<T>(data: T, pagination: unknown, message?: string): NextResponse {
  const response: PaginatedAPIResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    pagination,
  };

  return NextResponse.json(response);
}

// GET /api/suppliers/v3 - List suppliers with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and normalize query parameters (tolerate tier values in status)
    const rawStatus = (searchParams.get('status')?.split(',') || []).filter(Boolean);
    const rawTier = (searchParams.get('tier')?.split(',') || []).filter(Boolean);
    const statusOnly = rawStatus.filter(v =>
      (STATUS_VALUES as readonly string[]).includes(v)
    ) as (typeof STATUS_VALUES)[number][];
    const tierFromStatus = rawStatus.filter(v =>
      (TIER_VALUES as readonly string[]).includes(v)
    ) as (typeof TIER_VALUES)[number][];
    const tierOnly = rawTier.filter(v =>
      (TIER_VALUES as readonly string[]).includes(v)
    ) as (typeof TIER_VALUES)[number][];
    const tierNormalized = Array.from(
      new Set([...tierOnly, ...tierFromStatus])
    ) as (typeof TIER_VALUES)[number][];

    const rawFilters = {
      search: searchParams.get('search') || undefined,
      status: statusOnly.length ? statusOnly : undefined,
      tier: tierNormalized.length ? tierNormalized : undefined,
      category: searchParams.get('category')?.split(',') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      country: searchParams.get('country')?.split(',') || undefined,
      state: searchParams.get('state')?.split(',') || undefined,
      city: searchParams.get('city')?.split(',') || undefined,
      minRating: searchParams.get('minRating')
        ? parseFloat(searchParams.get('minRating')!)
        : undefined,
      maxRating: searchParams.get('maxRating')
        ? parseFloat(searchParams.get('maxRating')!)
        : undefined,
      createdAfter: searchParams.get('createdAfter') || undefined,
      createdBefore: searchParams.get('createdBefore') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 500,
      sortBy: searchParams.get('sortBy') || 'name',
      sortOrder: searchParams.get('sortOrder') || 'asc',
    };

    const validationResult = SupplierFiltersSchema.safeParse(rawFilters);
    if (!validationResult.success) {
      return createErrorResponse('Invalid query parameters', 400, validationResult.error.issues);
    }

    const page = validationResult.data.page;
    const limit = validationResult.data.limit;
    const result = await listSuppliers({
      search: validationResult.data.search,
      status: validationResult.data.status as unknown,
      page,
      limit,
      sortBy: validationResult.data.sortBy as unknown,
      sortOrder: validationResult.data.sortOrder,
    });

    return createPaginatedResponse(
      result.data,
      {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page * limit < result.total,
        hasPrev: page > 1,
      },
      `Retrieved ${result.data.length} suppliers`
    );
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return createErrorResponse('Failed to fetch suppliers', 500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get organization ID from request context
 * Tries: request body -> auth context -> env var -> database -> fallback
 */
async function getOrgIdFromRequest(
  request: NextRequest,
  body?: Record<string, unknown>
): Promise<string> {
  // 1. Check request body
  if (body) {
    const bodyOrgId =
      typeof body.orgId === 'string'
        ? body.orgId
        : typeof body.org_id === 'string'
          ? body.org_id
          : null;
    if (
      bodyOrgId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bodyOrgId)
    ) {
      return bodyOrgId;
    }
  }

  // 2. Try to get from auth context (if available)
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      // TODO: Parse JWT and extract orgId from token
      // For now, skip auth-based extraction
    }
  } catch (error) {
    // Continue to next method
  }

  // 3. Check environment variable
  const envOrgId = process.env.DEFAULT_ORG_ID;
  if (
    envOrgId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(envOrgId)
  ) {
    return envOrgId;
  }

  // 4. Try database
  try {
    const { query } = await import('@/lib/database');
    const result = await query<{ id: string }>(
      'SELECT id FROM public.organization ORDER BY created_at LIMIT 1'
    );
    if (result.rows && result.rows.length > 0) {
      return result.rows[0].id;
    }
  } catch (error) {
    console.warn('Failed to fetch organization from database:', error);
  }

  // 5. Fallback to known default
  return 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
}

// POST /api/suppliers/v3 - Create new supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = CreateSupplierSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse('Validation failed', 400, validationResult.error.issues);
    }

    // Get org_id from request context
    const orgId = await getOrgIdFromRequest(request, body);

    const created = await upsertSupplier({
      name: validationResult.data.name || 'Unnamed Supplier',
      code: validationResult.data.code || 'TEMP-' + Date.now(),
      status: validationResult.data.status || 'pending',
      currency: validationResult.data.businessInfo?.currency || 'ZAR',
      orgId, // Pass org_id to supplier creation
      contact:
        validationResult.data.contacts?.[0] && validationResult.data.contacts[0].email
          ? {
              email: validationResult.data.contacts[0].email,
              phone: validationResult.data.contacts[0].phone || '',
              website: validationResult.data.businessInfo?.website || '',
            }
          : undefined,
    });

    // Invalidate cache after creating supplier
    CacheInvalidator.invalidateSupplier(created.id, created.name);

    return createSuccessResponse(created, 'Supplier created in canonical layer');
  } catch (error) {
    console.error('Error creating supplier:', error);

    // Handle specific business errors
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return createErrorResponse('Supplier code already exists', 409);
      }
      if (error.message.includes('validation')) {
        return createErrorResponse('Validation error', 400, { error: error.message });
      }
    }

    return createErrorResponse('Failed to create supplier', 500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// PUT /api/suppliers/v3 - Batch operations
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle different batch operation types
    if (body.operation === 'bulk_update') {
      const { updates } = body;

      if (!Array.isArray(updates)) {
        return createErrorResponse('Updates must be an array');
      }

      const updated: unknown[] = [];
      for (const u of updates) {
        const res = await upsertSupplier({ id: u.id, name: u.data?.name, status: u.data?.status });
        updated.push(res);
      }
      return createSuccessResponse(updated, `Updated ${updated.length} suppliers`);
    }

    if (body.operation === 'bulk_delete') {
      const { ids } = body;

      if (!Array.isArray(ids)) {
        return createErrorResponse('IDs must be an array');
      }

      for (const id of ids) {
        await deactivateSupplier(id);
      }
      return createSuccessResponse(null, `Deactivated ${ids.length} suppliers`);
    }

    return createErrorResponse('Unknown batch operation');
  } catch (error) {
    console.error('Error in batch operation:', error);
    return createErrorResponse('Batch operation failed', 500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// DELETE /api/suppliers/v3 - Batch delete (alternative to PUT)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return createErrorResponse('Must provide array of supplier IDs to delete');
    }

    for (const id of ids) {
      await deactivateSupplier(id);
    }
    return createSuccessResponse(null, `Deactivated ${ids.length} suppliers`);
  } catch (error) {
    console.error('Error deleting suppliers:', error);
    return createErrorResponse('Failed to delete suppliers', 500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
