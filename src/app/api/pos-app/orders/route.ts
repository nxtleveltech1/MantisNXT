import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/pos-app/neon';

// GET /api/pos-app/orders - Fetch orders with items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const orders = await query(`
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'order_id', oi.order_id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal,
            'created_at', oi.created_at
          )
        ) FILTER (WHERE oi.id IS NOT NULL) as order_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $1
    `, [limit]);

    // Transform the data to match expected format
    const transformedOrders = orders.map((order: any) => ({
      ...order,
      order_items: order.order_items || [],
    }));

    return NextResponse.json(transformedOrders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/pos-app/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, total_amount, payment_method, notes, items } = body;

    // Start transaction by creating order
    const [order] = await query(`
      INSERT INTO orders (user_id, total_amount, payment_method, notes, status)
      VALUES ($1, $2, $3, $4, 'completed')
      RETURNING *
    `, [user_id || null, total_amount, payment_method, notes || null]);

    // Insert order items
    if (items && items.length > 0) {
      for (const item of items) {
        await query(`
          INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [order.id, item.product_id || null, item.product_name, item.quantity, item.unit_price, item.subtotal]);
      }

      // Update inventory for each item
      for (const item of items) {
        if (item.product_id) {
          await query(`
            UPDATE inventory
            SET quantity_available = quantity_available - $1,
                last_updated = NOW()
            WHERE product_id = $2
          `, [item.quantity, item.product_id]);
        }
      }
    }

    // Fetch complete order with items
    const [completeOrder] = await query(`
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'order_id', oi.order_id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal,
            'created_at', oi.created_at
          )
        ) FILTER (WHERE oi.id IS NOT NULL) as order_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id
    `, [order.id]);

    return NextResponse.json({
      ...completeOrder,
      order_items: completeOrder.order_items || [],
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

