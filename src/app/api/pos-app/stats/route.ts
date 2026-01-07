import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/pos-app/neon';

// GET /api/pos-app/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get total sales (last 30 days)
    const salesResult = await queryOne(`
      SELECT COALESCE(SUM(total_amount), 0) as total_sales
      FROM orders
      WHERE status = 'completed'
        AND created_at >= $1
    `, [thirtyDaysAgo]);

    // Get today's orders
    const todayOrdersResult = await queryOne(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
    `, [startOfDay, endOfDay]);

    // Get low stock items
    const lowStockResult = await queryOne(`
      SELECT COUNT(*) as count
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.quantity_available <= i.minimum_stock
        AND p.is_active = true
    `);

    // Get total products
    const totalProductsResult = await queryOne(`
      SELECT COUNT(*) as count
      FROM products
      WHERE is_active = true
    `);

    const stats = {
      totalSales: parseFloat(salesResult?.total_sales || '0'),
      todayOrders: parseInt(todayOrdersResult?.count || '0'),
      lowStockItems: parseInt(lowStockResult?.count || '0'),
      totalProducts: parseInt(totalProductsResult?.count || '0'),
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

