import { NextRequest, NextResponse } from 'next/server';
import { CustomerService } from '@/lib/services/CustomerService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data, count } = await CustomerService.getCustomers(limit, offset);

    return NextResponse.json({
      success: true,
      data,
      total: count,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Error in GET /api/v1/customers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch customers'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer name is required'
        },
        { status: 400 }
      );
    }

    if (!body.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer email is required'
        },
        { status: 400 }
      );
    }

    const customer = await CustomerService.createCustomer({
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      company: body.company || null,
      status: body.status || 'active',
      notes: body.notes || null
    });

    return NextResponse.json({
      success: true,
      data: customer
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/v1/customers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create customer'
      },
      { status: 500 }
    );
  }
}