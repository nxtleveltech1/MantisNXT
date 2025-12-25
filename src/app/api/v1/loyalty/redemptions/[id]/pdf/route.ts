// UPDATE: [2025-12-25] Created loyalty redemption receipt PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../../../sales/_helpers';
import { LoyaltyPDFService, type RedemptionReceiptData } from '@/lib/services/loyalty/loyalty-pdf-service';
import { query } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RedemptionRow {
  id: string;
  redemption_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  membership_number: string;
  redemption_date: string;
  points_redeemed: number;
  points_remaining: number;
  reward_name: string;
  reward_description: string | null;
  reward_value: number | null;
  expiry_date: string | null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);
    const userId = request.headers.get('x-user-id') || undefined;

    // Fetch redemption details
    const redemptionResult = await query<RedemptionRow>(
      `SELECT 
         r.id, r.redemption_number, r.customer_id,
         c.name as customer_name, c.email as customer_email,
         la.membership_number,
         r.redemption_date, r.points_redeemed,
         la.current_balance as points_remaining,
         rw.name as reward_name, rw.description as reward_description,
         rw.value as reward_value, r.expiry_date
       FROM loyalty.redemptions r
       JOIN customers.customers c ON c.id = r.customer_id
       JOIN loyalty.accounts la ON la.customer_id = r.customer_id
       JOIN loyalty.rewards rw ON rw.id = r.reward_id
       WHERE r.id = $1 AND r.org_id = $2`,
      [id, orgId]
    );

    if (redemptionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Redemption not found' },
        { status: 404 }
      );
    }

    const redemption = redemptionResult.rows[0];

    const data: RedemptionReceiptData = {
      redemptionId: redemption.id,
      redemptionNumber: redemption.redemption_number,
      orgId,
      customerId: redemption.customer_id,
      customer: {
        name: redemption.customer_name,
        email: redemption.customer_email || undefined,
        membershipNumber: redemption.membership_number,
      },
      redemptionDate: redemption.redemption_date,
      pointsRedeemed: redemption.points_redeemed,
      pointsRemaining: redemption.points_remaining,
      reward: {
        name: redemption.reward_name,
        description: redemption.reward_description || undefined,
        value: redemption.reward_value || undefined,
      },
      expiryDate: redemption.expiry_date || undefined,
    };

    const { pdfBuffer } = await LoyaltyPDFService.generateRedemptionReceipt(data, userId);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${redemption.redemption_number}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating redemption receipt PDF:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

