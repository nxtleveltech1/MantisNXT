/**
 * Pricing Rules Conflicts API Endpoint
 *
 * GET /api/v1/pricing/rules/conflicts - Detect conflicts between pricing rules
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { PricingRuleService } from '@/lib/services/PricingRuleService';
import { requireAuthOrg } from '@/lib/auth/require-org';
import { handleError } from '@/lib/auth/middleware';
import { z } from 'zod';

const ConflictsQuerySchema = z.object({
  rule_id: z.string().uuid().optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  conflict_type: z.enum(['priority', 'scope_overlap', 'contradictory_config']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuthOrg(request);
    const { searchParams } = new URL(request.url);

    const queryParams = {
      rule_id: searchParams.get('rule_id') || undefined,
      severity: searchParams.get('severity') || undefined,
      conflict_type: searchParams.get('conflict_type') || undefined,
    };

    const validatedParams = ConflictsQuerySchema.parse(queryParams);

    const allConflicts = await PricingRuleService.detectConflicts(orgId);

    let filteredConflicts = allConflicts;
    if (validatedParams.rule_id) {
      filteredConflicts = filteredConflicts.filter(
        c => c.rule1.rule_id === validatedParams.rule_id || c.rule2.rule_id === validatedParams.rule_id
      );
    }
    if (validatedParams.severity) {
      filteredConflicts = filteredConflicts.filter(c => c.severity === validatedParams.severity);
    }
    if (validatedParams.conflict_type) {
      filteredConflicts = filteredConflicts.filter(c => c.conflict_type === validatedParams.conflict_type);
    }

    return NextResponse.json({
      success: true,
      data: {
        conflicts: filteredConflicts,
        summary: {
          total: filteredConflicts.length,
          by_severity: {
            high: filteredConflicts.filter(c => c.severity === 'high').length,
            medium: filteredConflicts.filter(c => c.severity === 'medium').length,
            low: filteredConflicts.filter(c => c.severity === 'low').length,
          },
        },
      },
      count: filteredConflicts.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return handleError(error);
  }
}
