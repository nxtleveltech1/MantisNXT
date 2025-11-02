/**
 * Pricing Rules API Endpoints
 *
 * GET /api/v1/pricing/rules - List all pricing rules
 * POST /api/v1/pricing/rules - Create a new pricing rule
 *
 * Author: Aster (Principal Full-Stack & Architecture Expert)
 * Date: 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import { PricingRuleService } from '@/lib/services/PricingRuleService';
import { PricingRuleType, PricingStrategy } from '@/lib/db/pricing-schema';
import { z } from 'zod';

// Validation schema for creating pricing rules
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

/**
 * GET /api/v1/pricing/rules
 *
 * List all pricing rules with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filter: any = {};

    if (searchParams.has('rule_type')) {
      filter.rule_type = searchParams.get('rule_type') as PricingRuleType;
    }

    if (searchParams.has('strategy')) {
      filter.strategy = searchParams.get('strategy') as PricingStrategy;
    }

    if (searchParams.has('is_active')) {
      filter.is_active = searchParams.get('is_active') === 'true';
    }

    if (searchParams.has('search')) {
      filter.search = searchParams.get('search');
    }

    const rules = await PricingRuleService.getAllRules(filter);

    return NextResponse.json({
      success: true,
      data: rules,
      count: rules.length,
    });
  } catch (error: any) {
    console.error('Error fetching pricing rules:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pricing rules',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/pricing/rules
 *
 * Create a new pricing rule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = CreatePricingRuleSchema.parse(body);

    // Create the rule
    const rule = await PricingRuleService.createRule(validatedData);

    return NextResponse.json(
      {
        success: true,
        data: rule,
        message: 'Pricing rule created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error creating pricing rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create pricing rule',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
