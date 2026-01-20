/**
 * Xero Single Contact Sync API
 * 
 * POST /api/xero/sync/contacts/[id]
 * GET /api/xero/sync/contacts/[id]/status
 * 
 * Sync a single contact (supplier or customer) by NXT ID to Xero
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { syncSupplierToXero, syncCustomerToXero } from '@/lib/xero/sync/contacts';
import { validateXeroRequest, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';
import { query } from '@/lib/database';
import type { Supplier } from '@/types/supplier';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected' },
        { status: 400 }
      );
    }

    // Try to fetch as supplier first
    const supplierResult = await query<Supplier>(
      `SELECT * FROM core.supplier WHERE supplier_id = $1`,
      [id]
    );

    if (supplierResult.rows.length > 0) {
      const supplier = supplierResult.rows[0];
      // Transform to Supplier type format
      const supplierData: Supplier = {
        id: supplier.id || supplier.supplier_id,
        name: supplier.name,
        code: supplier.code || supplier.supplier_id,
        status: supplier.status || 'active',
        tier: supplier.tier || 'approved',
        category: supplier.category,
        subcategory: supplier.subcategory,
        categories: supplier.categories || [],
        tags: supplier.tags || [],
        contacts: supplier.contacts || [],
        addresses: supplier.addresses || [],
        businessInfo: supplier.businessInfo || {
          legalName: supplier.name,
          taxId: '',
          registrationNumber: '',
          currency: 'ZAR',
        },
        capabilities: supplier.capabilities || {
          products: [],
          services: [],
          certifications: [],
          leadTime: 0,
          paymentTerms: '',
        },
        performance: supplier.performance || {
          onTimeDelivery: 0,
          qualityRating: 0,
          responseTime: 0,
          totalOrders: 0,
          totalSpend: 0,
        },
        financial: supplier.financial || {
          currency: 'ZAR',
          paymentTerms: '',
        },
        createdAt: supplier.createdAt || new Date(),
        updatedAt: supplier.updatedAt || new Date(),
        createdBy: supplier.createdBy || '',
      };

      const result = await syncSupplierToXero(orgId, supplierData);
      return successResponse(result);
    }

    // Try to fetch as customer
    const customerResult = await query<{
      id: string;
      name: string;
      email?: string;
      phone?: string;
      company?: string;
      tax_number?: string;
      registration_number?: string;
      bank_account_details?: string;
      discount?: number;
      address?: Record<string, unknown>;
    }>(
      `SELECT 
        id, name, email, phone, company, tax_number, registration_number,
        bank_account_details, discount, billing_address as address
       FROM customers WHERE id = $1 AND org_id = $2`,
      [id, orgId]
    );

    if (customerResult.rows.length > 0) {
      const customer = customerResult.rows[0];
      const customerData = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        taxNumber: customer.tax_number,
        registrationNumber: customer.registration_number,
        bankAccountDetails: customer.bank_account_details,
        discount: customer.discount,
        address: customer.address as {
          street?: string;
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
        } | undefined,
      };

      const result = await syncCustomerToXero(orgId, customerData);
      return successResponse(result);
    }

    return NextResponse.json(
      { error: 'Contact not found' },
      { status: 404 }
    );

  } catch (error) {
    return handleApiError(error, 'Xero Sync Contact');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected' },
        { status: 400 }
      );
    }

    // Check sync status
    const result = await query<{
      xero_entity_id: string;
      sync_status: string;
      last_synced_at: Date | null;
    }>(
      `SELECT xero_entity_id, sync_status, last_synced_at 
       FROM xero_entity_mappings 
       WHERE org_id = $1 AND entity_type = 'contact' AND nxt_entity_id = $2`,
      [orgId, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        synced: false,
      });
    }

    const mapping = result.rows[0];
    return NextResponse.json({
      synced: mapping.sync_status === 'synced',
      xeroEntityId: mapping.xero_entity_id,
      lastSyncedAt: mapping.last_synced_at?.toISOString(),
    });

  } catch (error) {
    return handleApiError(error, 'Xero Contact Status');
  }
}
