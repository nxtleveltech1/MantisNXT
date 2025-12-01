/**
 * Individual Pricing Rule API Endpoints
 *
 * GET /api/v1/pricing/rules/[id] - Get specific rule
 * PUT /api/v1/pricing/rules/[id] - Update rule
 * DELETE /api/v1/pricing/rules/[id] - Delete rule
 * POST /api/v1/pricing/rules/[id]/activate - Toggle activation
 *
 * Author: Aster
 * Date: 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { PricingRuleService } from '@/lib/services/PricingRuleService';

export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const rule = await PricingRuleService.getRuleById(id);

    if (!rule) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const rule = await PricingRuleService.updateRule(id, body);

    if (!rule) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: rule,
      message: 'Rule updated successfully',
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const success = await PricingRuleService.deleteRule(id);

    if (!success) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
