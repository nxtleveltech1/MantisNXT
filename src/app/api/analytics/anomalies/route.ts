// Analytics Anomaly Detection API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createAnalyticsService } from '@/lib/analytics/analytics-service';

// Database connection
const db = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: false,
  max: parseInt(process.env.DB_POOL_MAX || '50'),
  min: parseInt(process.env.DB_POOL_MIN || '10'),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '5000'),
});

const analyticsService = createAnalyticsService(db);

// GET /api/analytics/anomalies - Get detected anomalies
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || '1';
    const severity = searchParams.get('severity'); // 'low' | 'medium' | 'high' | 'critical'
    const type = searchParams.get('type'); // 'supplier' | 'inventory' | 'system'
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const startTime = Date.now();

    // Get real-time anomaly detection
    const anomalies = await analyticsService.detectAnomalies(organizationId);

    // Get historical anomalies from database
    let historicalQuery = `
      SELECT
        id,
        type,
        severity,
        description,
        value,
        threshold,
        detected_at,
        acknowledged_by,
        acknowledged_at,
        resolved_at,
        resolution_notes
      FROM analytics_anomalies
      WHERE organization_id = $1
    `;
    const queryParams: any[] = [organizationId];

    if (severity) {
      historicalQuery += ` AND severity = $${queryParams.length + 1}`;
      queryParams.push(severity);
    }

    if (type) {
      historicalQuery += ` AND type LIKE $${queryParams.length + 1}`;
      queryParams.push(`%${type}%`);
    }

    historicalQuery += ` ORDER BY detected_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const historicalResult = await db.query(historicalQuery, queryParams);

    // Combine real-time and historical anomalies
    const combinedAnomalies = {
      realTime: {
        supplier: anomalies.supplierAnomalies,
        inventory: anomalies.inventoryAnomalies,
        system: anomalies.systemAnomalies
      },
      historical: historicalResult.rows,
      summary: {
        total: historicalResult.rows.length,
        critical: historicalResult.rows.filter(a => a.severity === 'critical').length,
        high: historicalResult.rows.filter(a => a.severity === 'high').length,
        medium: historicalResult.rows.filter(a => a.severity === 'medium').length,
        low: historicalResult.rows.filter(a => a.severity === 'low').length,
        unresolved: historicalResult.rows.filter(a => !a.resolved_at).length
      }
    };

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: combinedAnomalies,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
        organizationId,
        filters: { severity, type, limit, offset }
      }
    });

  } catch (error) {
    console.error('Anomaly detection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to detect anomalies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/analytics/anomalies - Acknowledge or resolve anomalies
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, anomalyIds, userId, notes } = body;

    if (!action || !anomalyIds || !Array.isArray(anomalyIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: action, anomalyIds'
        },
        { status: 400 }
      );
    }

    let updateQuery = '';
    let updateFields: any[] = [];

    switch (action) {
      case 'acknowledge':
        updateQuery = `
          UPDATE analytics_anomalies
          SET acknowledged_by = $1, acknowledged_at = NOW()
          WHERE id = ANY($2) AND acknowledged_at IS NULL
        `;
        updateFields = [userId, anomalyIds];
        break;

      case 'resolve':
        updateQuery = `
          UPDATE analytics_anomalies
          SET resolved_at = NOW(), resolution_notes = $1
          WHERE id = ANY($2) AND resolved_at IS NULL
        `;
        updateFields = [notes || 'Resolved via API', anomalyIds];
        break;

      case 'unresolve':
        updateQuery = `
          UPDATE analytics_anomalies
          SET resolved_at = NULL, resolution_notes = NULL
          WHERE id = ANY($1)
        `;
        updateFields = [anomalyIds];
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Use: acknowledge, resolve, or unresolve'
          },
          { status: 400 }
        );
    }

    const result = await db.query(updateQuery, updateFields);

    // Log the action
    await db.query(`
      INSERT INTO analytics_audit_log (action, target_type, target_ids, performed_by, notes, created_at)
      VALUES ($1, 'anomaly', $2, $3, $4, NOW())
    `, [action, JSON.stringify(anomalyIds), userId, notes]);

    return NextResponse.json({
      success: true,
      message: `Successfully ${action}d ${result.rowCount} anomalies`,
      data: {
        action,
        affected: result.rowCount,
        anomalyIds
      }
    });

  } catch (error) {
    console.error('Anomaly action error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process anomaly action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/analytics/anomalies - Update anomaly configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, thresholds, notifications, autoActions } = body;

    // Update anomaly detection configuration
    const configQuery = `
      INSERT INTO analytics_anomaly_config (
        organization_id,
        thresholds,
        notifications,
        auto_actions,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (organization_id) DO UPDATE SET
        thresholds = $2,
        notifications = $3,
        auto_actions = $4,
        updated_at = NOW()
    `;

    await db.query(configQuery, [
      organizationId,
      JSON.stringify(thresholds),
      JSON.stringify(notifications),
      JSON.stringify(autoActions)
    ]);

    return NextResponse.json({
      success: true,
      message: 'Anomaly detection configuration updated successfully',
      data: {
        organizationId,
        thresholds,
        notifications,
        autoActions
      }
    });

  } catch (error) {
    console.error('Anomaly configuration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update anomaly configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}