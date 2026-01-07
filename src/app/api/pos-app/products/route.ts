import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/pos-app/neon';

// GET /api/pos-app/products - Fetch all products with inventory
export async function GET(request: NextRequest) {
  try {
    // Fetch all products (including inactive ones for now to debug)
    // Filter by is_active only if the column exists and has a value
    const products = await query(`
      SELECT 
        p.*,
        COALESCE(i.quantity_available, 0) as stock
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE (p.is_active IS NULL OR p.is_active = true)
      ORDER BY p.created_at DESC
    `);

    // Ensure we always return an array
    const result = Array.isArray(products) ? products : [];
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// POST /api/pos-app/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, price, sku, category, image_url, stock } = body;

    // Validate required fields
    if (!name || !price || !sku) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price, and sku are required' },
        { status: 400 }
      );
    }

    // Validate price is a number
    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }

    // Insert product
    const products = await query(`
      INSERT INTO products (name, description, price, sku, category, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description || null, price, sku, category || null, image_url || null]);

    const product = products[0];
    if (!product) {
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }

    // Insert inventory
    if (stock !== undefined) {
      await query(`
        INSERT INTO inventory (product_id, quantity_available, minimum_stock)
        VALUES ($1, $2, $3)
        ON CONFLICT (product_id) 
        DO UPDATE SET quantity_available = $2, last_updated = NOW()
      `, [product.id, stock || 0, 5]);
    }

    // Fetch product with stock
    const productsWithStock = await query(`
      SELECT 
        p.*,
        COALESCE(i.quantity_available, 0) as stock
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.id = $1
    `, [product.id]);

    const productWithStock = productsWithStock[0];
    if (!productWithStock) {
      return NextResponse.json(
        { error: 'Failed to fetch created product' },
        { status: 500 }
      );
    }

    return NextResponse.json(productWithStock, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

