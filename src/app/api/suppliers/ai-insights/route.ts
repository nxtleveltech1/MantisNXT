/**
 * API Route for Supplier AI Insights
 * Endpoint: /api/suppliers/ai-insights
 *
 * Provides AI-powered supplier analytics including:
 * - Comprehensive scoring
 * - Risk assessment
 * - Performance predictions
 * - Comparative analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supplierDiscoveryEngine } from '@/lib/supplier-discovery/engine';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const scoreRequestSchema = z.object({
  supplierId: z.number().int().positive('Supplier ID must be a positive integer'),
});

const riskRequestSchema = z.object({
  supplierId: z.number().int().positive('Supplier ID must be a positive integer'),
});

const predictionRequestSchema = z.object({
  supplierId: z.number().int().positive('Supplier ID must be a positive integer'),
  predictionType: z.enum(['on_time_delivery', 'quality_score', 'cost_trend', 'order_volume']).optional(),
  forecastDays: z.number().int().min(7).max(90).optional(),
});

const compareRequestSchema = z.object({
  supplierIds: z.array(z.number().int().positive()).min(2, 'At least 2 supplier IDs required').max(10, 'Maximum 10 suppliers for comparison'),
});

const comprehensiveRequestSchema = z.object({
  supplierId: z.number().int().positive('Supplier ID must be a positive integer'),
});

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * POST /api/suppliers/ai-insights?type=score
 * Score a supplier using AI-powered analysis
 */
async function handleScoreRequest(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = scoreRequestSchema.parse(body);

    console.log(`AI Insights API: Scoring supplier ${validatedData.supplierId}`);

    const score = await supplierDiscoveryEngine.scoreSupplier(validatedData.supplierId);

    return NextResponse.json({
      success: true,
      data: score,
      metadata: {
        type: 'supplier_score',
        supplierId: validatedData.supplierId,
        timestamp: new Date().toISOString(),
      },
      message: 'Supplier scored successfully',
    });
  } catch (error) {
    console.error('AI Insights API: Score request failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to score supplier',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppliers/ai-insights?type=risk
 * Assess supplier risks using anomaly detection
 */
async function handleRiskRequest(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = riskRequestSchema.parse(body);

    console.log(`AI Insights API: Assessing risk for supplier ${validatedData.supplierId}`);

    const riskAssessment = await supplierDiscoveryEngine.assessSupplierRisk(validatedData.supplierId);

    return NextResponse.json({
      success: true,
      data: riskAssessment,
      metadata: {
        type: 'supplier_risk',
        supplierId: validatedData.supplierId,
        timestamp: new Date().toISOString(),
      },
      message: 'Supplier risk assessed successfully',
    });
  } catch (error) {
    console.error('AI Insights API: Risk assessment failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to assess supplier risk',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppliers/ai-insights?type=prediction
 * Predict supplier performance using AI forecasting
 */
async function handlePredictionRequest(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = predictionRequestSchema.parse(body);

    console.log(`AI Insights API: Predicting performance for supplier ${validatedData.supplierId}`);

    const prediction = await supplierDiscoveryEngine.predictSupplierPerformance(
      validatedData.supplierId,
      validatedData.predictionType || 'on_time_delivery',
      validatedData.forecastDays || 30
    );

    return NextResponse.json({
      success: true,
      data: prediction,
      metadata: {
        type: 'supplier_prediction',
        supplierId: validatedData.supplierId,
        predictionType: validatedData.predictionType || 'on_time_delivery',
        forecastDays: validatedData.forecastDays || 30,
        timestamp: new Date().toISOString(),
      },
      message: 'Supplier performance predicted successfully',
    });
  } catch (error) {
    console.error('AI Insights API: Prediction failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to predict supplier performance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppliers/ai-insights?type=compare
 * Compare multiple suppliers with AI-powered analysis
 */
async function handleCompareRequest(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = compareRequestSchema.parse(body);

    console.log(`AI Insights API: Comparing ${validatedData.supplierIds.length} suppliers`);

    const comparison = await supplierDiscoveryEngine.compareSuppliers(validatedData.supplierIds);

    return NextResponse.json({
      success: true,
      data: comparison,
      metadata: {
        type: 'supplier_comparison',
        supplierCount: validatedData.supplierIds.length,
        timestamp: new Date().toISOString(),
      },
      message: 'Suppliers compared successfully',
    });
  } catch (error) {
    console.error('AI Insights API: Comparison failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compare suppliers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppliers/ai-insights?type=comprehensive
 * Get comprehensive AI insights for a supplier (score + risk + predictions)
 */
async function handleComprehensiveRequest(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = comprehensiveRequestSchema.parse(body);

    console.log(`AI Insights API: Getting comprehensive insights for supplier ${validatedData.supplierId}`);

    const insights = await supplierDiscoveryEngine.getSupplierAIInsights(validatedData.supplierId);

    return NextResponse.json({
      success: true,
      data: insights,
      metadata: {
        type: 'comprehensive_insights',
        supplierId: validatedData.supplierId,
        timestamp: new Date().toISOString(),
      },
      message: 'Comprehensive supplier insights generated successfully',
    });
  } catch (error) {
    console.error('AI Insights API: Comprehensive insights failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get comprehensive insights',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppliers/ai-insights
 * Main handler that routes to specific insight types based on query parameter
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const insightType = searchParams.get('type') || 'comprehensive';

    console.log(`AI Insights API: Processing ${insightType} request`);

    switch (insightType) {
      case 'score':
        return handleScoreRequest(request);

      case 'risk':
        return handleRiskRequest(request);

      case 'prediction':
        return handlePredictionRequest(request);

      case 'compare':
        return handleCompareRequest(request);

      case 'comprehensive':
        return handleComprehensiveRequest(request);

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid insight type',
            details: `Supported types: score, risk, prediction, compare, comprehensive. Received: ${insightType}`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('AI Insights API: Request failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/suppliers/ai-insights
 * Get available insight types and documentation
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get('supplierId');

  // If supplierId is provided, return comprehensive insights
  if (supplierId) {
    try {
      const id = parseInt(supplierId, 10);
      if (isNaN(id) || id <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid supplier ID',
          },
          { status: 400 }
        );
      }

      console.log(`AI Insights API: GET comprehensive insights for supplier ${id}`);

      const insights = await supplierDiscoveryEngine.getSupplierAIInsights(id);

      return NextResponse.json({
        success: true,
        data: insights,
        metadata: {
          type: 'comprehensive_insights',
          supplierId: id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('AI Insights API: GET insights failed:', error);

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get supplier insights',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }

  // Return API documentation
  return NextResponse.json({
    success: true,
    data: {
      endpoint: '/api/suppliers/ai-insights',
      description: 'AI-powered supplier analytics and insights',
      version: '1.0.0',
      methods: {
        POST: {
          description: 'Generate AI insights based on type parameter',
          queryParameters: {
            type: {
              required: false,
              default: 'comprehensive',
              values: ['score', 'risk', 'prediction', 'compare', 'comprehensive'],
              description: 'Type of insight to generate',
            },
          },
          types: {
            score: {
              description: 'AI-powered supplier scoring',
              body: { supplierId: 'number (required)' },
              example: { supplierId: 123 },
            },
            risk: {
              description: 'Risk assessment with anomaly detection',
              body: { supplierId: 'number (required)' },
              example: { supplierId: 123 },
            },
            prediction: {
              description: 'Performance predictions and forecasting',
              body: {
                supplierId: 'number (required)',
                predictionType: 'string (optional): on_time_delivery | quality_score | cost_trend | order_volume',
                forecastDays: 'number (optional, default: 30, min: 7, max: 90)',
              },
              example: {
                supplierId: 123,
                predictionType: 'on_time_delivery',
                forecastDays: 30,
              },
            },
            compare: {
              description: 'Compare multiple suppliers',
              body: { supplierIds: 'number[] (required, min: 2, max: 10)' },
              example: { supplierIds: [123, 456, 789] },
            },
            comprehensive: {
              description: 'Complete insights (score + risk + predictions)',
              body: { supplierId: 'number (required)' },
              example: { supplierId: 123 },
            },
          },
        },
        GET: {
          description: 'Get comprehensive insights for a supplier',
          queryParameters: {
            supplierId: {
              required: false,
              description: 'Supplier ID to get insights for. If omitted, returns API documentation.',
            },
          },
          example: '/api/suppliers/ai-insights?supplierId=123',
        },
      },
      features: [
        'AI-powered supplier scoring with detailed breakdowns',
        'Risk assessment using anomaly detection',
        'Performance predictions with confidence intervals',
        'Comparative analysis of multiple suppliers',
        'Automatic caching for improved performance',
        'Database storage of insights and predictions',
      ],
    },
  });
}

/**
 * OPTIONS /api/suppliers/ai-insights
 * CORS preflight handler
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    { success: true },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
