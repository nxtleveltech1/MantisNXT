/**
 * Individual Pricing Rule API Endpoints
 *
 * GET /api/v1/pricing/rules/[id] - Get specific rule
 * PUT /api/v1/pricing/rules/[id] - Update rule
 * DELETE /api/v1/pricing/rules/[id] - Delete rule
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { PricingRuleService } from '@/lib/services/PricingRuleService';
import { requireAuthOrg } from '@/lib/auth/require-org';
import { handleError } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireAuthOrg(request);
    const { id } = await context.params;
    const rule = await PricingRuleService.getRuleById(orgId, id);

    if (!rule) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireAuthOrg(request);
    const { id } = await context.params;
    const body = await request.json();
    const rule = await PricingRuleService.updateRule(orgId, id, body);

    if (!rule) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rule, message: 'Rule updated successfully' });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireAuthOrg(request);
    const { id } = await context.params;
    const success = await PricingRuleService.deleteRule(orgId, id);

    if (!success) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Rule deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}
