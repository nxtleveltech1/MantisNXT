import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { CustomerService } from '@/lib/services/CustomerService';

export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tickets = await CustomerService.getCustomerTickets(id);

    return NextResponse.json({
      success: true,
      data: tickets
    });
  } catch (error: unknown) {
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