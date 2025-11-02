/**
 * Customer Loyalty API
 *
 * Handles customer loyalty program data
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Fetch customer loyalty data
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
        program_id,
        current_tier::text as current_tier,
        total_points_earned,
        total_points_redeemed,
        points_balance,
        tier_qualified_date,
        lifetime_value,
        referral_count,
        created_at,
        updated_at
      FROM public.customer_loyalty
      WHERE customer_id = $1
      LIMIT 1
    `;

    const result = await query<any>(sql, [customerId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching customer loyalty:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch loyalty data',
      },
      { status: 500 }
    );
  }
}
