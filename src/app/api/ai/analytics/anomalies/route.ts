/**
 * AI Anomaly Detection API
 * Real-time anomaly detection for supplier and procurement metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { PredictiveAnalyticsService } from '@/services/ai/PredictiveAnalyticsService';

// Initialize the predictive analytics service for anomaly detection
const analyticsService = new PredictiveAnalyticsService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validationError = validateAnomalyRequest(body);
    if (validationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validationError
      }, { status: 400 });
    }

    console.log('🚨 Running AI anomaly detection for:', body.entityType);

    // Execute anomaly detection
    const result = await analyticsService.detectAnomalies({
      entityType: body.entityType,
      entityId: body.entityId,
      timeRange: body.timeRange,
      sensitivity: body.sensitivity,
      metrics: body.metrics
    });

    console.log(`🔍 Detected ${result.anomalies.length} anomalies (${result.summary.criticalCount} critical)`);

    return NextResponse.json({
      success: true,
      data: {
        anomalies: result.anomalies,
        summary: result.summary,
        request: {
          entityType: body.entityType,
          entityId: body.entityId,
          timeRange: body.timeRange,
          sensitivity: body.sensitivity,
          metrics: body.metrics
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Anomaly detection failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Anomaly detection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      code: 'ANOMALY_DETECTION_ERROR'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId');

    if (!supplierId) {
      return NextResponse.json({
        success: false,
        error: 'Supplier ID is required for risk monitoring'
      }, { status: 400 });
    }

    console.log('📊 Monitoring supplier risk:', supplierId);

    // Monitor supplier risk with AI
    const riskMonitoring = await analyticsService.monitorSupplierRisk(supplierId);

    return NextResponse.json({
      success: true,
      data: {
        supplierId,
        currentRisk: riskMonitoring.currentRisk,
        riskTrend: riskMonitoring.riskTrend,
        alerts: riskMonitoring.alerts,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Supplier risk monitoring failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Supplier risk monitoring failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Real-time anomaly stream endpoint (would typically use WebSocket in production)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, anomalyId } = body;

    if (!anomalyId) {
      return NextResponse.json({
        success: false,
        error: 'Anomaly ID is required'
      }, { status: 400 });
    }

    console.log(`🔧 Anomaly action: ${action} for anomaly ${anomalyId}`);

    // Handle anomaly actions
    let result;
    switch (action) {
      case 'acknowledge':
        result = await acknowledgeAnomaly(anomalyId, body.userId);
        break;
      case 'resolve':
        result = await resolveAnomaly(anomalyId, body.userId, body.resolution);
        break;
      case 'dismiss':
        result = await dismissAnomaly(anomalyId, body.userId, body.reason);
        break;
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        anomalyId,
        action,
        result,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Anomaly action failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Anomaly action failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Validation function
function validateAnomalyRequest(body: any): string | null {
  // Validate entityType
  const validEntityTypes = ['supplier', 'order', 'payment', 'performance'];
  if (!body.entityType || !validEntityTypes.includes(body.entityType)) {
    return `Entity type must be one of: ${validEntityTypes.join(', ')}`;
  }

  // Validate timeRange
  if (!body.timeRange || !body.timeRange.start || !body.timeRange.end) {
    return 'Time range with start and end dates is required';
  }

  // Validate dates
  const startDate = new Date(body.timeRange.start);
  const endDate = new Date(body.timeRange.end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 'Invalid date format in time range';
  }

  if (startDate >= endDate) {
    return 'Start date must be before end date';
  }

  // Validate sensitivity
  const validSensitivities = ['low', 'medium', 'high'];
  if (!body.sensitivity || !validSensitivities.includes(body.sensitivity)) {
    return `Sensitivity must be one of: ${validSensitivities.join(', ')}`;
  }

  // Validate metrics
  if (!body.metrics || !Array.isArray(body.metrics)) {
    return 'Metrics must be an array';
  }

  if (body.metrics.length === 0) {
    return 'At least one metric must be specified';
  }

  // Validate optional entityId
  if (body.entityId && typeof body.entityId !== 'string') {
    return 'Entity ID must be a string';
  }

  return null;
}

// Helper functions for anomaly management
async function acknowledgeAnomaly(anomalyId: string, userId: string): Promise<any> {
  // In production, this would update the anomaly status in the database
  console.log(`Anomaly ${anomalyId} acknowledged by user ${userId}`);

  return {
    status: 'acknowledged',
    acknowledgedBy: userId,
    acknowledgedAt: new Date().toISOString()
  };
}

async function resolveAnomaly(anomalyId: string, userId: string, resolution?: string): Promise<any> {
  // In production, this would update the anomaly status and record the resolution
  console.log(`Anomaly ${anomalyId} resolved by user ${userId}: ${resolution}`);

  return {
    status: 'resolved',
    resolvedBy: userId,
    resolvedAt: new Date().toISOString(),
    resolution: resolution || 'No resolution details provided'
  };
}

async function dismissAnomaly(anomalyId: string, userId: string, reason?: string): Promise<any> {
  // In production, this would mark the anomaly as dismissed
  console.log(`Anomaly ${anomalyId} dismissed by user ${userId}: ${reason}`);

  return {
    status: 'dismissed',
    dismissedBy: userId,
    dismissedAt: new Date().toISOString(),
    reason: reason || 'No reason provided'
  };
}