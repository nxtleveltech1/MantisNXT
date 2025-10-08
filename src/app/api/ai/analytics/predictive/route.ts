/**
 * AI Predictive Analytics API
 * Advanced predictive modeling for supplier and procurement metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { PredictiveAnalyticsService } from '@/services/ai/PredictiveAnalyticsService';

// Initialize the predictive analytics service
const predictiveAnalytics = new PredictiveAnalyticsService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validationError = validatePredictiveRequest(body);
    if (validationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validationError
      }, { status: 400 });
    }

    console.log('🔮 Generating predictive analytics for:', body.metrics);

    // Generate predictions using AI
    const result = await predictiveAnalytics.generatePredictions({
      supplierId: body.supplierId,
      category: body.category,
      timeHorizon: body.timeHorizon,
      metrics: body.metrics
    });

    console.log(`✅ Generated predictions for ${body.metrics.length} metrics`);

    return NextResponse.json({
      success: true,
      data: {
        predictions: result.predictions,
        modelInfo: result.modelInfo,
        request: {
          supplierId: body.supplierId,
          category: body.category,
          timeHorizon: body.timeHorizon,
          metrics: body.metrics
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Predictive analytics generation failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Predictive analytics generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      code: 'PREDICTIVE_ANALYTICS_ERROR'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId');
    const months = parseInt(searchParams.get('months') || '6');

    if (!supplierId) {
      return NextResponse.json({
        success: false,
        error: 'Supplier ID is required for performance forecasting'
      }, { status: 400 });
    }

    if (months < 1 || months > 24) {
      return NextResponse.json({
        success: false,
        error: 'Forecast period must be between 1 and 24 months'
      }, { status: 400 });
    }

    console.log(`📈 Forecasting supplier performance for ${months} months:`, supplierId);

    // Generate supplier performance forecast
    const forecast = await predictiveAnalytics.forecastSupplierPerformance(supplierId, months);

    return NextResponse.json({
      success: true,
      data: {
        supplierId,
        forecastPeriod: months,
        performanceForecast: forecast.performanceForecast,
        riskTrend: forecast.riskTrend,
        recommendations: forecast.recommendations,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Supplier performance forecasting failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Supplier performance forecasting failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Validation function
function validatePredictiveRequest(body: any): string | null {
  // Validate timeHorizon
  const validHorizons = ['3months', '6months', '1year', '2years'];
  if (!body.timeHorizon || !validHorizons.includes(body.timeHorizon)) {
    return `Time horizon must be one of: ${validHorizons.join(', ')}`;
  }

  // Validate metrics
  const validMetrics = ['cost', 'performance', 'risk', 'demand', 'availability'];
  if (!body.metrics || !Array.isArray(body.metrics)) {
    return 'Metrics must be an array';
  }

  if (body.metrics.length === 0) {
    return 'At least one metric must be specified';
  }

  for (const metric of body.metrics) {
    if (!validMetrics.includes(metric)) {
      return `Invalid metric: ${metric}. Valid metrics: ${validMetrics.join(', ')}`;
    }
  }

  // Validate optional fields
  if (body.supplierId && typeof body.supplierId !== 'string') {
    return 'Supplier ID must be a string';
  }

  if (body.category && typeof body.category !== 'string') {
    return 'Category must be a string';
  }

  return null;
}