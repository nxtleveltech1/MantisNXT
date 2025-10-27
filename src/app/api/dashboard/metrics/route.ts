import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Mock dashboard metrics for testing
    const mockMetrics = {
      totalSuppliers: 247,
      activeSuppliers: 198,
      totalOrders: 1245,
      totalValue: 2500000,
      averageOrderValue: 2008,
      topSuppliers: [
        { name: 'Acme Suppliers', orders: 45, value: 125000 },
        { name: 'Tech Solutions Ltd', orders: 32, value: 89000 },
        { name: 'Office Supplies SA', orders: 78, value: 156000 }
      ],
      recentActivity: [
        { type: 'order', description: 'New order from Acme Suppliers', timestamp: '2025-10-24T10:30:00Z' },
        { type: 'supplier', description: 'New supplier Tech Solutions Ltd added', timestamp: '2025-10-24T09:15:00Z' },
        { type: 'pricelist', description: 'Pricelist updated for Office Supplies SA', timestamp: '2025-10-24T08:45:00Z' }
      ],
      alerts: [
        { type: 'warning', message: 'Low stock alert for Product A', severity: 'medium' },
        { type: 'info', message: 'New pricelist available from Acme Suppliers', severity: 'low' }
      ]
    };

    return NextResponse.json({
      success: true,
      data: mockMetrics,
      message: 'Dashboard metrics retrieved successfully'
    });
  } catch (error) {
    console.error('Dashboard metrics API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve dashboard metrics',
        error: 'DASHBOARD_METRICS_ERROR'
      },
      { status: 500 }
    );
  }
}


