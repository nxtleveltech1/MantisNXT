/**
 * Pricing Rules Conflicts API Endpoint
 *
 * GET /api/v1/pricing/rules/conflicts - Detect conflicts between pricing rules
 *
 * Author: Auto-generated
 * Date: 2025-11-24
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { PricingRuleService } from '@/lib/services/PricingRuleService';
import { z } from 'zod';

// Query parameter validation schema
const ConflictsQuerySchema = z.object({
  rule_id: z.string().uuid().optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  conflict_type: z.enum(['priority', 'scope_overlap', 'contradictory_config']).optional(),
});

/**
 * GET /api/v1/pricing/rules/conflicts
 *
 * Detect conflicts between pricing rules
 * Query parameters:
 *   - rule_id (optional): Filter conflicts for a specific rule
 *   - severity (optional): Filter by severity level
 *   - conflict_type (optional): Filter by conflict type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams = {
      rule_id: searchParams.get('rule_id') || undefined,
      severity: searchParams.get('severity') || undefined,
      conflict_type: searchParams.get('conflict_type') || undefined,
    };

    const validatedParams = ConflictsQuerySchema.parse(queryParams);

    // Get all conflicts
    const allConflicts = await PricingRuleService.detectConflicts();

    // Apply filters if provided
    let filteredConflicts = allConflicts;

    if (validatedParams.rule_id) {
      filteredConflicts = filteredConflicts.filter(
        conflict =>
          conflict.rule1.rule_id === validatedParams.rule_id ||
          conflict.rule2.rule_id === validatedParams.rule_id
      );
    }

    if (validatedParams.severity) {
      filteredConflicts = filteredConflicts.filter(
        conflict => conflict.severity === validatedParams.severity
      );
    }

    if (validatedParams.conflict_type) {
      filteredConflicts = filteredConflicts.filter(
        conflict => conflict.conflict_type === validatedParams.conflict_type
      );
    }

    // Group conflicts by severity for better organization
    const conflictsBySeverity = {
      high: filteredConflicts.filter(c => c.severity === 'high'),
      medium: filteredConflicts.filter(c => c.severity === 'medium'),
      low: filteredConflicts.filter(c => c.severity === 'low'),
    };

    return NextResponse.json({
      success: true,
      data: {
        conflicts: filteredConflicts,
        summary: {
          total: filteredConflicts.length,
          by_severity: {
            high: conflictsBySeverity.high.length,
            medium: conflictsBySeverity.medium.length,
            low: conflictsBySeverity.low.length,
          },
          by_type: {
            priority: filteredConflicts.filter(c => c.conflict_type === 'priority').length,
            scope_overlap: filteredConflicts.filter(c => c.conflict_type === 'scope_overlap').length,
            contradictory_config: filteredConflicts.filter(c => c.conflict_type === 'contradictory_config').length,
          },
        },
      },
      count: filteredConflicts.length,
    });
  } catch (error: unknown) {
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

    console.error('Error detecting rule conflicts:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to detect rule conflicts',
        details: message,
      },
      { status: 500 }
    );
  }
}

