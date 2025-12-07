import { query } from '@/lib/database/unified-connection';

export interface SalesSummary {
    period: string;
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    orders: number;
}

export interface TagSalesData {
    tagId: string;
    tagName: string;
    totalSales: number;
    totalUnits: number;
    orderCount: number;
}

export interface SalesDashboardData {
    summary: {
        totalSales: number;
        orderCount: number;
        avgOrderValue: number;
    };
    trend: {
        date: string;
        value: number;
    }[];
    recentOrders: {
        id: string;
        orderNumber: string;
        total: number;
        status: string;
        date: string;
    }[];
}

export async function getSalesDashboardData(
    channel: 'online' | 'in-store' | 'all',
    startDate?: Date,
    endDate?: Date
): Promise<SalesDashboardData> {
    const params: any[] = [];
    let whereClause = 'WHERE 1=1';

    if (channel !== 'all') {
        // Determine connector type based on channel
        // 'online' -> 'woocommerce', 'in-store' -> 'odoo' (assumption)
        // Need to join integration_connector
        whereClause += ` AND EXISTS (
      SELECT 1 FROM integration_connector ic 
      WHERE ic.id = so.connector_id 
      AND ic.provider = $${params.length + 1}
    )`;
        params.push(channel === 'online' ? 'woocommerce' : 'odoo');
    }

    if (startDate) {
        whereClause += ` AND so.created_at >= $${params.length + 1}`;
        params.push(startDate);
    }

    if (endDate) {
        whereClause += ` AND so.created_at <= $${params.length + 1}`;
        params.push(endDate);
    }

    // Summary
    const summaryRes = await query<{
        total_sales: number;
        order_count: number;
    }>(`
    SELECT 
      COALESCE(SUM(total), 0) as total_sales,
      COUNT(*) as order_count
    FROM sales_orders so
    ${whereClause}
  `, params);

    const summary = summaryRes.rows[0];
    const totalSales = Number(summary?.total_sales || 0);
    const orderCount = Number(summary?.order_count || 0);

    // Trend (Daily)
    const trendRes = await query<{
        day: string;
        daily_sales: number;
    }>(`
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM-DD') as day,
      SUM(total) as daily_sales
    FROM sales_orders so
    ${whereClause}
    GROUP BY day
    ORDER BY day ASC
  `, params);

    // Recent Orders
    const recentOrdersRes = await query<{
        id: string;
        order_number: string;
        total: number;
        status: string;
        created_at: Date;
    }>(`
    SELECT id, order_number, total, status, created_at
    FROM sales_orders so
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 10
  `, params);

    return {
        summary: {
            totalSales,
            orderCount,
            avgOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
        },
        trend: trendRes.rows.map(row => ({
            date: row.day,
            value: Number(row.daily_sales),
        })),
        recentOrders: recentOrdersRes.rows.map(row => ({
            id: row.id,
            orderNumber: row.order_number || row.id.substring(0, 8),
            total: Number(row.total),
            status: row.status || 'completed',
            date: new Date(row.created_at).toISOString(),
        })),
    };
}

export async function getTagSalesAnalytics(startDate?: Date, endDate?: Date): Promise<TagSalesData[]> {
    const params: any[] = [];
    let dateFilter = '';

    if (startDate) {
        dateFilter += ` AND so.created_at >= $${params.length + 1}`;
        params.push(startDate);
    }
    if (endDate) {
        dateFilter += ` AND so.created_at <= $${params.length + 1}`;
        params.push(endDate);
    }

    // Aggregate sales by tag
    // We join sales_order_items -> core.supplier_product -> core.ai_tag_assignment -> core.ai_tag_library
    const sql = `
    SELECT 
      t.tag_id,
      t.name as tag_name,
      SUM(soi.total) as total_sales,
      SUM(soi.quantity) as total_units,
      COUNT(DISTINCT soi.sales_order_id) as order_count
    FROM sales_order_items soi
    JOIN sales_orders so ON soi.sales_order_id = so.id
    JOIN core.supplier_product sp ON soi.product_id = sp.supplier_product_id
    JOIN core.ai_tag_assignment ta ON sp.supplier_product_id = ta.supplier_product_id
    JOIN core.ai_tag_library t ON ta.tag_id = t.tag_id
    WHERE 1=1 ${dateFilter}
    GROUP BY t.tag_id, t.name
    ORDER BY total_sales DESC
  `;

    try {
        const result = await query(sql, params);

        return result.rows.map((row: any) => ({
            tagId: row.tag_id,
            tagName: row.tag_name,
            totalSales: Number(row.total_sales || 0),
            totalUnits: Number(row.total_units || 0),
            orderCount: Number(row.order_count || 0),
        }));
    } catch (error) {
        console.error('Error fetching tag sales analytics:', error);
        return [];
    }
}
