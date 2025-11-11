/**
 * AI Predictions API
 *
 * POST /api/ai/data/predictions
 *
 * Generate predictions for inventory, supplier performance, etc.
 *
 * Example Request:
 * {
 *   "type": "inventory_demand",
 *   "target_id": 123,
 *   "forecast_days": 30
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiDatabase } from '@/lib/ai/database-integration';
import { executeWithOptionalAsync } from '@/lib/queue/taskQueue';
import { z } from 'zod';

const PredictionRequestSchema = z.object({
  type: z.enum(['inventory_demand', 'supplier_performance', 'price_trends', 'stock_levels']),
  target_id: z.number().optional().describe('Specific product/supplier ID'),
  forecast_days: z.number().min(1).max(90).optional().default(30),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedInput = PredictionRequestSchema.parse(body)

    const execResult = await executeWithOptionalAsync(request, async () => {
      const startTime = Date.now()
      const prediction = await aiDatabase.generatePredictions({
        type: validatedInput.type,
        target_id: validatedInput.target_id?.toString(),
        forecast_days: validatedInput.forecast_days,
      })

      const values = prediction.predictions.map(p => p.value)
      const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length
      const maxValue = Math.max(...values)
      const minValue = Math.min(...values)
      const trend = values[values.length - 1] > values[0] ? 'increasing' : 'decreasing'

      return {
        success: true,
        prediction: {
          type: prediction.prediction_type,
          forecast_period_days: validatedInput.forecast_days,
          confidence: prediction.confidence,
          predictions: prediction.predictions,
          factors: prediction.factors,
          recommendations: prediction.recommendations,
          summary: {
            avg_value: avgValue,
            max_value: maxValue,
            min_value: minValue,
            trend,
          },
        },
        meta: {
          execution_time_ms: Date.now() - startTime,
          target_id: validatedInput.target_id?.toString(),
          generated_at: new Date().toISOString(),
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
    console.error('Prediction error:', error)

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
        error: 'Prediction generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/ai/data/predictions',
    method: 'POST',
    description: 'Generate AI-powered predictions',
    usage: {
      type: 'Type of prediction to generate',
      target_id: 'Specific product/supplier ID (optional)',
      forecast_days: 'Number of days to forecast (1-90, default: 30)',
    },
    prediction_types: [
      'inventory_demand - Predict future inventory demand',
      'supplier_performance - Forecast supplier performance',
      'price_trends - Predict price trends',
      'stock_levels - Forecast stock levels',
    ],
    examples: [
      {
        description: 'Predict inventory demand for product 123',
        request: {
          type: 'inventory_demand',
          target_id: 123,
          forecast_days: 30,
        }
      },
      {
        description: 'Forecast overall stock levels',
        request: {
          type: 'stock_levels',
          forecast_days: 60,
        }
      },
    ],
  });
}
