import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Mock suppliers data for testing
    const mockSuppliers = [
      {
        id: 'supplier-1',
        name: 'Acme Suppliers',
        email: 'contact@acmesuppliers.com',
        phone: '+27 11 123 4567',
        status: 'active',
        category: 'Electronics',
        rating: 4.5,
        lastOrderDate: '2025-10-20',
        totalOrders: 45,
        totalValue: 125000
      },
      {
        id: 'supplier-2',
        name: 'Tech Solutions Ltd',
        email: 'info@techsolutions.co.za',
        phone: '+27 21 987 6543',
        status: 'active',
        category: 'Technology',
        rating: 4.8,
        lastOrderDate: '2025-10-22',
        totalOrders: 32,
        totalValue: 89000
      },
      {
        id: 'supplier-3',
        name: 'Office Supplies SA',
        email: 'orders@officesupplies.co.za',
        phone: '+27 31 555 1234',
        status: 'preferred',
        category: 'Office Supplies',
        rating: 4.2,
        lastOrderDate: '2025-10-23',
        totalOrders: 78,
        totalValue: 156000
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockSuppliers,
      total: mockSuppliers.length,
      message: 'Suppliers retrieved successfully'
    });
  } catch (error) {
    console.error('Suppliers API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve suppliers',
        error: 'SUPPLIERS_API_ERROR'
      },
      { status: 500 }
    );
  }
}