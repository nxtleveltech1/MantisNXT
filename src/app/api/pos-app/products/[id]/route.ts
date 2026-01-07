import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/pos-app/neon';

// GET /api/pos-app/products/[id] - Get a single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await queryOne(`
      SELECT 
        p.*,
        COALESCE(i.quantity_available, 0) as stock
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.id = $1
    `, [id]);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/pos-app/products/[id] - Update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, price, sku, category, image_url, stock } = body;

    // Validate price if provided
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await queryOne(`
      SELECT id FROM products WHERE id = $1
    `, [id]);

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      values.push(price);
    }
    if (sku !== undefined) {
      updates.push(`sku = $${paramIndex++}`);
      values.push(sku);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramIndex++}`);
      values.push(image_url);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(id);
      await query(`
        UPDATE products
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
      `, values);
    }

    // Update inventory if stock is provided
    if (stock !== undefined) {
      await query(`
        INSERT INTO inventory (product_id, quantity_available, minimum_stock)
        VALUES ($1, $2, $3)
        ON CONFLICT (product_id)
        DO UPDATE SET quantity_available = $2, last_updated = NOW()
      `, [id, stock, 5]);
    }

    // Fetch updated product with stock
    const product = await queryOne(`
      SELECT 
        p.*,
        COALESCE(i.quantity_available, 0) as stock
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.id = $1
    `, [id]);

    if (!product) {
      return NextResponse.json(
        { error: 'Failed to fetch updated product' },
        { status: 500 }
      );
    }

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/pos-app/products/[id] - Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if product exists
    const existingProduct = await queryOne(`
      SELECT id FROM products WHERE id = $1
    `, [id]);

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    await query('DELETE FROM products WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

