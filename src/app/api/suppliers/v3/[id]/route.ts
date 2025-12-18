/**
 * Individual Supplier Operations API v3
 * Handle single supplier CRUD operations
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PostgreSQLSupplierRepository } from '@/lib/suppliers/core/SupplierRepository';
import { SupplierService } from '@/lib/suppliers/services/SupplierService';
import type { UpdateSupplierData, APIResponse } from '@/lib/suppliers/types/SupplierDomain';
import { CacheInvalidator } from '@/lib/cache/invalidation';
import { query } from '@/lib/database';

// Initialize services
const repository = new PostgreSQLSupplierRepository();
const supplierService = new SupplierService(repository);

// Validation Schema for updates
const UpdateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional(),
  tier: z.enum(['strategic', 'preferred', 'approved', 'conditional']).optional(),
  category: z.string().min(1).optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),

  businessInfo: z
    .object({
      legalName: z.string().min(1).optional(),
      website: z.string().url().optional(),
      foundedYear: z.number().min(1800).max(new Date().getFullYear()).optional(),
      employeeCount: z.number().min(1).optional(),
      annualRevenue: z.number().min(0).optional(),
      currency: z.string().length(3).optional(),
    })
    .optional(),

  contacts: z
    .array(
      z.object({
        type: z.enum(['primary', 'billing', 'technical', 'sales', 'support']),
        name: z.string().min(1),
        title: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(10),
        mobile: z.string().optional(),
        department: z.string().optional(),
        isPrimary: z.boolean().default(false),
        isActive: z.boolean().default(true),
      })
    )
    .optional(),

  addresses: z
    .array(
      z.object({
        type: z.enum(['headquarters', 'billing', 'shipping', 'warehouse', 'manufacturing']),
        name: z.string().optional(),
        addressLine1: z.string().min(1),
        addressLine2: z.string().optional(),
        city: z.string().min(1),
        state: z.string().min(1),
        postalCode: z.string().min(1),
        country: z.string().min(1),
        isPrimary: z.boolean().default(false),
        isActive: z.boolean().default(true),
      })
    )
    .optional(),

  notes: z.string().optional(),

  // Discount settings
  baseDiscountPercent: z.number().min(0).max(100).optional(),
});

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

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/suppliers/v3/[id] - Get supplier by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return createErrorResponse('Supplier ID is required');
    }

    const supplier = await supplierService.getSupplierById(id);

    if (!supplier) {
      return createErrorResponse('Supplier not found', 404);
    }

    // Fetch additional fields not in standard service (JSON feed, discount)
    try {
      const additionalFields = await query<{
        json_feed_url: string | null;
        json_feed_enabled: boolean;
        json_feed_type: string;
        json_feed_interval_minutes: number;
        json_feed_last_sync: Date | null;
        json_feed_last_status: Record<string, unknown> | null;
        base_discount_percent: number | null;
      }>(
        `SELECT 
          json_feed_url, json_feed_enabled, json_feed_type, 
          json_feed_interval_minutes, json_feed_last_sync, json_feed_last_status,
          base_discount_percent
         FROM core.supplier WHERE supplier_id = $1`,
        [id]
      );

      // Merge additional fields into supplier response
      const enrichedSupplier = {
        ...supplier,
        jsonFeedUrl: additionalFields.rows[0]?.json_feed_url || null,
        jsonFeedEnabled: additionalFields.rows[0]?.json_feed_enabled || false,
        jsonFeedType: additionalFields.rows[0]?.json_feed_type || 'woocommerce',
        jsonFeedIntervalMinutes: additionalFields.rows[0]?.json_feed_interval_minutes || 60,
        jsonFeedLastSync: additionalFields.rows[0]?.json_feed_last_sync || null,
        jsonFeedLastStatus: additionalFields.rows[0]?.json_feed_last_status || null,
        baseDiscountPercent: additionalFields.rows[0]?.base_discount_percent || 0,
      };

      return createSuccessResponse(enrichedSupplier);
    } catch (queryError) {
      console.error('[Supplier API] Error fetching additional fields:', queryError);
      // If query fails, return supplier without additional fields
      const enrichedSupplier = {
        ...supplier,
        jsonFeedUrl: null,
        jsonFeedEnabled: false,
        jsonFeedType: 'woocommerce',
        jsonFeedIntervalMinutes: 60,
        jsonFeedLastSync: null,
        jsonFeedLastStatus: null,
        baseDiscountPercent: 0,
      };
      return createSuccessResponse(enrichedSupplier);
    }
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return createErrorResponse('Failed to fetch supplier', 500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// PUT /api/suppliers/v3/[id] - Update supplier
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return createErrorResponse('Supplier ID is required');
    }

    const body = await request.json();

    // Normalize baseDiscountPercent to ensure it's a number
    if (body.baseDiscountPercent !== undefined) {
      const discountValue = typeof body.baseDiscountPercent === 'number' 
        ? body.baseDiscountPercent 
        : parseFloat(String(body.baseDiscountPercent));
      
      if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
        return createErrorResponse('baseDiscountPercent must be a number between 0 and 100', 400);
      }
      
      body.baseDiscountPercent = discountValue;
    }

    const validationResult = UpdateSupplierSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('[Supplier API] Validation error:', validationResult.error.issues);
      return createErrorResponse('Validation failed', 400, validationResult.error.issues);
    }

    const updateData: UpdateSupplierData = validationResult.data;

    // Check if supplier exists
    const existingSupplier = await supplierService.getSupplierById(id);
    if (!existingSupplier) {
      return createErrorResponse('Supplier not found', 404);
    }

    // Business logic validation
    const validation = await supplierService.validateSupplierUpdate(id, updateData);
    if (!validation.isValid) {
      return createErrorResponse('Business validation failed', 400, validation.errors);
    }

    const updatedSupplier = await supplierService.updateSupplier(id, updateData);

    // Handle base discount update directly (not part of standard SupplierService)
    if (body.baseDiscountPercent !== undefined) {
      await query(
        `UPDATE core.supplier 
         SET base_discount_percent = $1, updated_at = NOW() 
         WHERE supplier_id = $2`,
        [body.baseDiscountPercent, id]
      );
      // Add to returned supplier object
      (updatedSupplier as any).baseDiscountPercent = body.baseDiscountPercent;
    }

    // Invalidate cache after successful update
    CacheInvalidator.invalidateSupplier(id, updatedSupplier.name);

    return createSuccessResponse(updatedSupplier, 'Supplier updated successfully');
  } catch (error) {
    console.error('Error updating supplier:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return createErrorResponse('Supplier not found', 404);
      }
      if (error.message.includes('validation')) {
        return createErrorResponse('Validation error', 400, { error: error.message });
      }
    }

    return createErrorResponse('Failed to update supplier', 500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// DELETE /api/suppliers/v3/[id] - Delete supplier
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return createErrorResponse('Supplier ID is required');
    }

    // Check if supplier exists
    const existingSupplier = await supplierService.getSupplierById(id);
    if (!existingSupplier) {
      return createErrorResponse('Supplier not found', 404);
    }

    // Check if supplier can be deleted (business rules)
    const canDelete = await supplierService.canDeleteSupplier(id);
    if (!canDelete.allowed) {
      return createErrorResponse('Cannot delete supplier', 409, { reason: canDelete.reason });
    }

    // Get supplier name before deletion (for cache invalidation)
    const supplierName = existingSupplier.name;

    await supplierService.deleteSupplier(id);

    // Invalidate cache after successful deletion
    CacheInvalidator.invalidateSupplier(id, supplierName);

    return createSuccessResponse(null, 'Supplier deleted successfully');
  } catch (error) {
    console.error('Error deleting supplier:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return createErrorResponse('Supplier not found', 404);
      }
      if (error.message.includes('foreign key') || error.message.includes('constraint')) {
        return createErrorResponse('Cannot delete supplier - has associated records', 409);
      }
    }

    return createErrorResponse('Failed to delete supplier', 500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
