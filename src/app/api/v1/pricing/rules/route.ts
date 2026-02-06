/**
 * Pricing Rules API Endpoints
 *
 * GET /api/v1/pricing/rules - List all pricing rules
 * POST /api/v1/pricing/rules - Create a new pricing rule
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { PricingRuleService, type PricingRuleFilter } from '@/lib/services/PricingRuleService';
import { PricingRuleType, PricingStrategy } from '@/lib/db/pricing-schema';
import { requireAuthOrg } from '@/lib/auth/require-org';
import { handleError } from '@/lib/auth/middleware';
import { z } from 'zod';

const CreatePricingRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  rule_type: z.nativeEnum(PricingRuleType),
  priority: z.number().int().min(1).max(100),
  strategy: z.nativeEnum(PricingStrategy),
  config: z.object({
    margin_percent: z.number().optional(),
    markup_percent: z.number().optional(),
    min_price: z.number().positive().optional(),
    max_price: z.number().positive().optional(),
    competitor_offset_percent: z.number().optional(),
    elasticity_factor: z.number().optional(),
    bundle_discount_percent: z.number().min(0).max(100).optional(),
  }),
  applies_to_categories: z.array(z.string()).optional(),
  applies_to_brands: z.array(z.string()).optional(),
  applies_to_suppliers: z.array(z.string()).optional(),
  applies_to_products: z.array(z.string()).optional(),
  created_by: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuthOrg(request);
    const { searchParams } = new URL(request.url);

    const filter: PricingRuleFilter = {};
    if (searchParams.has('rule_type')) filter.rule_type = searchParams.get('rule_type') as PricingRuleType;
    if (searchParams.has('strategy')) filter.strategy = searchParams.get('strategy') as PricingStrategy;
    if (searchParams.has('is_active')) filter.is_active = searchParams.get('is_active') === 'true';
    if (searchParams.has('search')) filter.search = searchParams.get('search') ?? undefined;

    const rules = await PricingRuleService.getAllRules(orgId, filter);

    return NextResponse.json({ success: true, data: rules, count: rules.length });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireAuthOrg(request);
    const body = await request.json();
    const validatedData = CreatePricingRuleSchema.parse(body);

    const rule = await PricingRuleService.createRule(orgId, validatedData);

    return NextResponse.json(
      { success: true, data: rule, message: 'Pricing rule created successfully' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return handleError(error);
  }
}
