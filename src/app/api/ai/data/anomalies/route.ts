/**
 * AI Anomaly Detection API
 *
 * POST /api/ai/data/anomalies
 *
 * Detects anomalies in database tables using AI.
 *
 * Example Request:
 * {
 *   "table": "inventory_items",
 *   "checks": ["data_quality", "statistical", "business_rule"]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiDatabase } from '@/lib/ai/database-integration';
import { z } from 'zod';

const AnomalyRequestSchema = z.object({
  table: z.string().optional().describe('Table name to check'),
  query: z.string().optional().describe('Custom SQL query'),
  checks: z.array(z.enum(['data_quality', 'statistical', 'business_rule', 'security'])).optional(),
}).refine(data => data.table || data.query, {
  message: 'Either table or query must be provided',
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const validatedInput = AnomalyRequestSchema.parse(body);

    // Detect anomalies
    const detection = await aiDatabase.detectAnomalies({
      table: validatedInput.table,
      query: validatedInput.query,
      checks: validatedInput.checks,
    });

    // Categorize by severity
    const categorized = {
      critical: detection.anomalies.filter(a => a.severity === 'critical'),
      high: detection.anomalies.filter(a => a.severity === 'high'),
      medium: detection.anomalies.filter(a => a.severity === 'medium'),
      low: detection.anomalies.filter(a => a.severity === 'low'),
    };

    return NextResponse.json({
      success: true,
      detection: {
        overall_health_score: detection.overall_health_score,
        total_anomalies: detection.anomalies.length,
        by_severity: {
          critical: categorized.critical.length,
          high: categorized.high.length,
          medium: categorized.medium.length,
          low: categorized.low.length,
        },
        anomalies: detection.anomalies,
        recommendations: detection.recommendations,
      },
      meta: {
        execution_time_ms: Date.now() - startTime,
        data_source: validatedInput.table || 'custom_query',
        checks_performed: validatedInput.checks || ['all'],
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Anomaly detection error:', error);

    // Validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      }, { status: 400 });
    }

    // General error
    return NextResponse.json({
      success: false,
      error: 'Anomaly detection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/ai/data/anomalies',
    method: 'POST',
    description: 'Detect data anomalies using AI',
    usage: {
      table: 'Name of table to check (optional)',
      query: 'Custom SQL query (optional)',
      checks: 'Types of checks to perform (optional)',
    },
    check_types: [
      'data_quality - NULL values, invalid formats, duplicates',
      'statistical - Outliers, unexpected distributions',
      'business_rule - Invalid states, constraint violations',
      'security - Suspicious patterns, unauthorized access',
    ],
    severity_levels: ['low', 'medium', 'high', 'critical'],
    examples: [
      {
        description: 'Check inventory data quality',
        request: {
          table: 'inventory_items',
          checks: ['data_quality', 'statistical'],
        }
      },
      {
        description: 'Full anomaly scan on suppliers',
        request: {
          table: 'suppliers',
          checks: ['data_quality', 'statistical', 'business_rule', 'security'],
        }
      },
    ],
  });
}
