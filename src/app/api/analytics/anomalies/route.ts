/**
 * Anomalies Detection API
 * Now powered by AI Anomaly Detection Service
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { anomalyService } from '@/lib/ai/services/anomaly-service';

/**
 * GET /api/analytics/anomalies
 * Fetch anomalies with optional AI detection
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const useAI = searchParams.get('useAI') === 'true';
    const entityType = searchParams.get('entityType') as unknown;
    const severity = searchParams.get('severity') as unknown;

    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'organizationId is required',
        },
        { status: 400 }
      );
    }

    const orgId = parseInt(organizationId);

    console.log(`🔍 Fetching anomalies for organization: ${orgId} (AI: ${useAI})`);

    if (useAI) {
      // Use AI-powered anomaly service
      const result = await anomalyService.listAnomalies(orgId, {
        entityType,
        severity,
        limit,
        offset: 0,
      });

      return NextResponse.json({
        success: true,
        data: {
          anomalies: result.anomalies,
          total: result.total,
          timestamp: new Date().toISOString(),
          organizationId: orgId,
          aiPowered: true,
        },
      });
    }

    // Legacy: Detect inventory anomalies from core.stock_on_hand
    const inventoryAnomaliesQuery = `
      SELECT
        'inventory' as type,
        'Low Stock Alert' as title,
        CONCAT('Stock location has low quantity') as description,
        'high' as severity,
        qty as value,
        10 as threshold,
        NOW() as detected_at
      FROM core.stock_on_hand
      WHERE qty < 10 AND qty > 0
      ORDER BY qty ASC
      LIMIT $1
    `;

    // Legacy: Detect supplier anomalies from core.supplier
    const supplierAnomaliesQuery = `
      SELECT
        'supplier' as type,
        'Supplier Performance Issue' as title,
        CONCAT('Supplier ', name, ' has concerning metrics') as description,
        CASE
          WHEN COALESCE(CASE WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER) ELSE 30 END, 30) > 60 THEN 'high'
          WHEN COALESCE(CASE WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER) ELSE 30 END, 30) > 30 THEN 'medium'
          ELSE 'low'
        END as severity,
        COALESCE(CASE WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER) ELSE 30 END, 30) as value,
        30 as threshold,
        NOW() as detected_at
      FROM core.supplier
      WHERE COALESCE(CASE WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER) ELSE 30 END, 30) > 30
      ORDER BY value DESC
      LIMIT $1
    `;

    const [inventoryResult, supplierResult] = await Promise.all([
      pool.query(inventoryAnomaliesQuery, [Math.floor(limit / 2)]),
      pool.query(supplierAnomaliesQuery, [Math.floor(limit / 2)]),
    ]);

    const anomalies = [...inventoryResult.rows, ...supplierResult.rows].slice(0, limit);

    console.log(`✅ Found ${anomalies.length} anomalies`);

    return NextResponse.json({
      success: true,
      data: {
        anomalies,
        total: anomalies.length,
        timestamp: new Date().toISOString(),
        organizationId: orgId,
        aiPowered: false,
      },
    });
  } catch (error) {
    console.error('❌ Anomalies API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch anomalies',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/anomalies/detect
 * Run AI-powered anomaly detection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, entityType, entityId, checkTypes, sensitivity } = body;

    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'organizationId is required',
        },
        { status: 400 }
      );
    }

    console.log(`🤖 Running AI anomaly detection for org: ${organizationId}`);

    const result = await anomalyService.detectAnomalies({
      organizationId: parseInt(organizationId),
      entityType,
      entityId,
      checkTypes,
      sensitivity,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ AI Anomaly detection error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to detect anomalies',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
