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
        // Filter by connector name or config channel
        // In-Store: 'In-Store POS' connector or config->>'channel' = 'in-store'
        // Online: 'Online Store' connector or config->>'channel' = 'online'
        whereClause += ` AND EXISTS (
      SELECT 1 FROM integration_connector ic 
      WHERE ic.id = so.connector_id 
      AND (
        ic.name ILIKE $${params.length + 1}
        OR ic.config->>'channel' = $${params.length + 2}
        OR ic.provider::text = ANY($${params.length + 3}::text[])
      )
    )`;
        if (channel === 'online') {
            params.push('%Online%', 'online', ['shopify', 'woocommerce']);
        } else {
            params.push('%In-Store%', 'in-store', ['custom_api', 'odoo']);
        }
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
      TO_CHAR(created_at, 'DD-MON''YY') as day,
      SUM(total) as daily_sales
    FROM sales_orders so
    ${whereClause}
    GROUP BY TO_CHAR(created_at, 'DD-MON''YY'), DATE(created_at)
    ORDER BY DATE(created_at) ASC
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
        recentOrders: recentOrdersRes.rows.map(row => {
            const d = new Date(row.created_at);
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const formattedDate = `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}'${d.getFullYear().toString().slice(-2)}`;
            return {
                id: row.id,
                orderNumber: row.order_number || row.id.substring(0, 8),
                total: Number(row.total),
                status: row.status || 'completed',
                date: formattedDate,
            };
        }),
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
