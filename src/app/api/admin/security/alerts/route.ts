import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { verifyAuth, isAdmin } from '@/lib/auth/auth-helper';

export interface SecurityAlert {
  id: string;
  alertType: 'failed_login' | 'suspicious_activity' | 'brute_force' | 'unusual_location' | 'manual';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  userId?: string;
  userEmail?: string;
  title: string;
  description?: string;
  eventCount: number;
  firstOccurrence: string;
  lastOccurrence: string;
  reviewedAt?: string;
  reviewedBy?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Check admin permissions
    if (!isAdmin(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'resolved', 'all'
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        id,
        alert_type,
        severity,
        status,
        ip_address,
        user_agent,
        location,
        user_id,
        user_email,
        title,
        description,
        event_count,
        first_occurrence,
        last_occurrence,
        reviewed_at,
        reviewed_by,
        resolution_notes,
        created_at
      FROM auth.security_alerts
      WHERE 1=1
    `;
    
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (severity) {
      query += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    query += ` ORDER BY 
      CASE severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      created_at DESC
    `;
    
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM auth.security_alerts WHERE 1=1`;
    const countParams: unknown[] = [];
    let countParamIndex = 1;

    if (status && status !== 'all') {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (severity) {
      countQuery += ` AND severity = $${countParamIndex}`;
      countParams.push(severity);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    const alerts: SecurityAlert[] = result.rows.map(row => ({
      id: row.id,
      alertType: row.alert_type,
      severity: row.severity,
      status: row.status,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      location: row.location,
      userId: row.user_id,
      userEmail: row.user_email,
      title: row.title,
      description: row.description,
      eventCount: row.event_count,
      firstOccurrence: row.first_occurrence,
      lastOccurrence: row.last_occurrence,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
      resolutionNotes: row.resolution_notes,
      createdAt: row.created_at,
    }));

    return NextResponse.json(
      {
        success: true,
        data: alerts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Security alerts API error:', error);

    // If table doesn't exist, return empty array
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          pagination: {
            total: 0,
            limit: 50,
            offset: 0,
            hasMore: false,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Update alert status (review/resolve/dismiss)
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Check admin permissions
    if (!isAdmin(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { alertId, status, resolutionNotes } = body;

    if (!alertId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Alert ID and status are required',
        },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'reviewing', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid status value',
        },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
      UPDATE auth.security_alerts
      SET 
        status = $1,
        reviewed_at = CASE WHEN $1 IN ('resolved', 'dismissed') THEN NOW() ELSE reviewed_at END,
        reviewed_by = CASE WHEN $1 IN ('resolved', 'dismissed') THEN $2 ELSE reviewed_by END,
        resolution_notes = COALESCE($3, resolution_notes)
      WHERE id = $4
      RETURNING *
      `,
      [status, user.id, resolutionNotes, alertId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Alert not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Alert updated successfully',
        data: result.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update security alert API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

