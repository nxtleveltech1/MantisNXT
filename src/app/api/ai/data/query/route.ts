/**
 * Natural Language Database Query API
 *
 * POST /api/ai/data/query
 *
 * Converts natural language questions to SQL and executes them safely.
 *
 * Example Request:
 * {
 *   "query": "Show me the top 5 suppliers by total inventory value",
 *   "options": {
 *     "explain": true,
 *     "limit": 100
 *   }
 * }
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { aiDatabase } from '@/lib/ai/database-integration';
import { z } from 'zod';

const QueryRequestSchema = z.object({
  query: z.string().min(5).max(500).describe('Natural language query'),
  options: z
    .object({
      explain: z.boolean().optional().default(true).describe('Include query explanation'),
      limit: z.number().min(1).max(1000).optional().describe('Maximum rows to return'),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const validatedInput = QueryRequestSchema.parse(body);

    // Execute natural language query
    const result = await aiDatabase.executeNaturalLanguageQuery(validatedInput.query);

    // Apply limit if specified
    let limitedData = result.data;
    if (validatedInput.options?.limit && result.data.length > validatedInput.options.limit) {
      limitedData = result.data.slice(0, validatedInput.options.limit);
    }

    return NextResponse.json({
      success: true,
      data: limitedData,
      meta: {
        total_rows: result.rowCount,
        returned_rows: limitedData.length,
        execution_time_ms: result.execution_time_ms,
        query_generated: result.query_generated,
        explanation: validatedInput.options?.explain ? result.explanation : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Natural language query error:', error);

    // Validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    // Query safety error
    if (error instanceof Error && error.message.includes('safety')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query rejected for safety reasons',
          message: error.message,
        },
        { status: 403 }
      );
    }

    // General error
    return NextResponse.json(
      {
        success: false,
        error: 'Query execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    const duration = Date.now() - startTime;
    console.log(`AI Query executed in ${duration}ms`);
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/ai/data/query',
    method: 'POST',
    description: 'Convert natural language to SQL and execute queries',
    usage: {
      query: 'Natural language question about your data',
      options: {
        explain: 'Include query explanation (default: true)',
        limit: 'Maximum rows to return (default: no limit)',
      },
    },
    examples: [
      'Show me the top 5 suppliers by total inventory value',
      'Which products have low stock levels?',
      'Find suppliers with the most products',
      'What are the recent purchase orders?',
      'Show inventory items that need reordering',
    ],
  });
}
