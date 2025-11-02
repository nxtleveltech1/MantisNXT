/**
 * Customer Loyalty Transactions API
 *
 * Handles customer loyalty transaction history
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Fetch customer loyalty transactions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;

    const sql = `
      SELECT
        id,
        customer_id,
        transaction_type::text as transaction_type,
        points_amount,
        reference_type,
        reference_id,
        description,
        expires_at,
        created_by,
        created_at
      FROM public.loyalty_transaction
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const result = await query<any>(sql, [customerId]);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching loyalty transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch transactions',
      },
      { status: 500 }
    );
  }
}
