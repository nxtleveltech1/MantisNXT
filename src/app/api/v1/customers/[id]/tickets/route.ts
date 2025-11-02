import { NextRequest, NextResponse } from 'next/server';
import { CustomerService } from '@/lib/services/CustomerService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tickets = await CustomerService.getCustomerTickets(params.id);

    return NextResponse.json({
      success: true,
      data: tickets
    });
  } catch (error: any) {
    console.error('Error in GET /api/v1/customers/[id]/tickets:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch customer tickets'
      },
      { status: 500 }
    );
  }
}