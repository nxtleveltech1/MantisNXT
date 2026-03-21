export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/api-auth';
import { getOrgId } from '@/app/api/v1/sales/_helpers';
import { sohPricingService } from '@/lib/services/SOHPricingService';

const itemSchema = z.object({
  soh_id: z.string().min(1),
  supplier_product_id: z.string().min(1),
  unit_cost: z.number().finite(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).max(500),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const orgId = await getOrgId(request, json as Record<string, unknown>);
    const results: Array<{
      soh_id: string;
      selling_price: number;
      calculated_margin_pct: number;
      pricing_rule_id: string | null;
      reasoning: string;
    }> = [];

    for (const item of parsed.data.items) {
      const calc = await sohPricingService.calculatePrice({
        supplier_product_id: item.supplier_product_id,
        unit_cost: item.unit_cost,
        org_id: orgId,
      });
      results.push({
        soh_id: item.soh_id,
        selling_price: calc.selling_price,
        calculated_margin_pct: calc.calculated_margin_pct,
        pricing_rule_id: calc.pricing_rule_id,
        reasoning: calc.reasoning,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Preview failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
});
