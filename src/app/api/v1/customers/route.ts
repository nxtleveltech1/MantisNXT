import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { CustomerService } from '@/lib/services/CustomerService';
import { getOrgId } from '../sales/_helpers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const orgId = await getOrgId(request);

    let data: unknown[];
    let count: number;

    if (search) {
      // Use search method for filtered results
      data = await CustomerService.searchCustomers(search, limit, orgId);
      count = data.length; // Search doesn't return count, approximate
    } else {
      // Use regular getCustomers for pagination
      const result = await CustomerService.getCustomers(limit, offset, orgId);
      data = result.data;
      count = result.count;
    }

    return NextResponse.json({
      success: true,
      data,
      total: count,
      limit,
      offset,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/customers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch customers',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orgId = await getOrgId(request, body);

    // Basic validation
    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer name is required',
        },
        { status: 400 }
      );
    }

    // Email is optional for walk-in/POS customers
    // For POS walk-in, use a generated local email
    const email = body.email || (body.is_walk_in ? `walkin-${Date.now()}@pos.local` : null);
    
    if (!email && !body.is_walk_in) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer email is required',
        },
        { status: 400 }
      );
    }

    const customer = await CustomerService.createCustomer({
      org_id: orgId,
      name: body.name,
      email: email,
      phone: body.phone || null,
      company: body.company || null,
      segment: body.segment || 'individual',
      status: body.status || 'active',
      lifetime_value: body.lifetime_value || null,
      acquisition_date: body.acquisition_date || null,
      last_interaction_date: body.last_interaction_date || null,
      address: body.address || null,
      tags: body.tags || null,
      metadata: body.metadata || { is_walk_in: body.is_walk_in || false },
      notes: body.notes || null,
    });

    return NextResponse.json(
      {
        success: true,
        data: customer,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/v1/customers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create customer',
      },
      { status: 500 }
    );
  }
}
