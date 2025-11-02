/**
 * Customer Details API
 *
 * Handles CRUD operations for individual customers
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Fetch customer by ID
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const sql = `
      SELECT
        id,
        org_id,
        name,
        email,
        phone,
        company,
        segment::text as segment,
        status::text as status,
        lifetime_value,
        acquisition_date,
        last_interaction_date,
        address,
        metadata,
        tags,
        created_at,
        updated_at
      FROM public.customer
      WHERE id = $1
    `;

    const result = await query<any>(sql, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch customer',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete customer
export async function DELETE(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const sql = `
      DELETE FROM public.customer
      WHERE id = $1
      RETURNING id
    `;

    const result = await query<any>(sql, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: result.rows[0].id },
    });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete customer',
      },
      { status: 500 }
    );
  }
}
