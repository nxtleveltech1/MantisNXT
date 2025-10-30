/**
 * AI Data Analysis API
 *
 * POST /api/ai/data/analyze
 *
 * Analyzes database tables or query results with AI insights.
 *
 * Example Request:
 * {
 *   "table": "inventory_items",
 *   "focus": "trends"
 * }
 *
 * Or with custom query:
 * {
 *   "query": "SELECT * FROM suppliers WHERE status = 'active'",
 *   "focus": "patterns"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiDatabase } from '@/lib/ai/database-integration';
import { executeWithOptionalAsync } from '@/lib/queue/taskQueue';
import { z } from 'zod';

const AnalyzeRequestSchema = z.object({
  table: z.string().optional().describe('Table name to analyze'),
  query: z.string().optional().describe('Custom SQL query'),
  focus: z.enum(['trends', 'patterns', 'risks', 'opportunities', 'all']).optional().default('all'),
}).refine(data => data.table || data.query, {
  message: 'Either table or query must be provided',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedInput = AnalyzeRequestSchema.parse(body)

    const execResult = await executeWithOptionalAsync(request, async () => {
      const started = Date.now()
      const analysis = await aiDatabase.analyzeData({
        table: validatedInput.table,
        query: validatedInput.query,
        focus: validatedInput.focus,
      })

      return {
        success: true,
        analysis: {
          summary: analysis.summary,
          insights: analysis.insights,
          metrics: analysis.metrics,
          visualizations: analysis.visualizations,
        },
        meta: {
          execution_time_ms: Date.now() - started,
          focus_area: validatedInput.focus,
          data_source: validatedInput.table || 'custom_query',
        },
        timestamp: new Date().toISOString(),
      }
    })

    if (execResult.queued) {
      return NextResponse.json(
        {
          success: true,
          status: 'queued',
          taskId: execResult.taskId,
        },
        { status: 202 }
      )
    }

    return NextResponse.json(execResult.result)
  } catch (error) {
    console.error('Data analysis error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/ai/data/analyze',
    method: 'POST',
    description: 'Analyze database tables or query results with AI',
    usage: {
      table: 'Name of table to analyze (optional)',
      query: 'Custom SQL query (optional)',
      focus: 'Analysis focus: trends, patterns, risks, opportunities, or all',
    },
    examples: [
      {
        description: 'Analyze inventory trends',
        request: {
          table: 'inventory_items',
          focus: 'trends',
        }
      },
      {
        description: 'Find risks in supplier data',
        request: {
          table: 'suppliers',
          focus: 'risks',
        }
      },
      {
        description: 'Analyze custom query',
        request: {
          query: 'SELECT * FROM purchase_orders WHERE status = \'pending\'',
          focus: 'all',
        }
      },
    ],
    insight_categories: [
      'trend - Data trends over time',
      'pattern - Recurring patterns in data',
      'risk - Potential business risks',
      'opportunity - Business opportunities',
    ],
  });
}
