import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { verifyAuth, isAdmin } from '@/lib/auth/auth-helper';

export interface ActivityEvent {
  id: string;
  type: 'user' | 'security' | 'system' | 'data' | 'auth';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error';
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
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
    const limit = parseInt(searchParams.get('limit') || '20');

    const activities: ActivityEvent[] = [];

    // Try to fetch from auth.audit_events first
    try {
      const auditResult = await db.query(`
        SELECT 
          id,
          event_type,
          action,
          resource,
          resource_id,
          user_id,
          details,
          severity,
          status,
          ip_address,
          created_at
        FROM auth.audit_events
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);

      for (const row of auditResult.rows) {
        const event = mapAuditEventToActivity(row);
        if (event) {
          activities.push(event);
        }
      }
    } catch {
      // Table might not exist, try alternative
    }

    // If no audit events, try the general audit_log table
    if (activities.length === 0) {
      try {
        const auditLogResult = await db.query(`
          SELECT 
            id,
            action,
            entity_type,
            entity_id,
            user_id,
            changes,
            created_at
          FROM audit_log
          ORDER BY created_at DESC
          LIMIT $1
        `, [limit]);

        for (const row of auditLogResult.rows) {
          const event = mapAuditLogToActivity(row);
          if (event) {
            activities.push(event);
          }
        }
      } catch {
        // Table might not exist either
      }
    }

    // Add recent user registrations
    try {
      const usersResult = await db.query(`
        SELECT 
          id,
          email,
          display_name,
          created_at
        FROM auth.users_extended
        WHERE created_at >= NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 5
      `);

      for (const row of usersResult.rows) {
        activities.push({
          id: `user-${row.id}`,
          type: 'user',
          title: 'New user registered',
          description: `${row.email} joined the platform`,
          timestamp: row.created_at,
          status: 'success',
          userId: row.id,
          userEmail: row.email,
        });
      }
    } catch {
      // Skip if table doesn't exist
    }

    // Add recent session activity
    try {
      const sessionsResult = await db.query(`
        SELECT 
          s.id,
          s.user_id,
          s.ip_address,
          s.created_at,
          s.status,
          u.email
        FROM auth.user_sessions s
        LEFT JOIN auth.users_extended u ON s.user_id = u.id
        WHERE s.created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY s.created_at DESC
        LIMIT 5
      `);

      for (const row of sessionsResult.rows) {
        activities.push({
          id: `session-${row.id}`,
          type: 'auth',
          title: 'User login',
          description: `${row.email || 'User'} logged in from ${row.ip_address || 'unknown IP'}`,
          timestamp: row.created_at,
          status: row.status === 'active' ? 'success' : 'warning',
          userId: row.user_id,
          userEmail: row.email,
        });
      }
    } catch {
      // Skip if table doesn't exist
    }

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Return only the requested limit
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json(
      {
        success: true,
        data: limitedActivities,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin dashboard activity API error:', error);

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

function mapAuditEventToActivity(row: Record<string, unknown>): ActivityEvent | null {
  const action = String(row.action || '');
  const eventType = String(row.event_type || '');
  
  let type: ActivityEvent['type'] = 'system';
  let title = 'System event';
  let description = action;
  let status: ActivityEvent['status'] = 'success';

  if (action.startsWith('auth.')) {
    type = 'auth';
    if (action === 'auth.login') {
      title = 'User login';
      description = 'User authenticated successfully';
    } else if (action === 'auth.logout') {
      title = 'User logout';
      description = 'User signed out';
    } else if (action === 'auth.login_failed') {
      title = 'Failed login attempt';
      description = `Login failed from IP ${row.ip_address || 'unknown'}`;
      status = 'warning';
    } else if (action === 'auth.password_change') {
      title = 'Password changed';
      description = 'User password was updated';
    }
  } else if (action.startsWith('data.')) {
    type = 'data';
    const operation = action.replace('data.', '');
    title = `Data ${operation}`;
    description = `${operation} operation on ${row.resource || 'resource'}`;
  } else if (action.startsWith('security.')) {
    type = 'security';
    title = 'Security event';
    description = action.replace('security.', '');
    status = row.severity === 'critical' || row.severity === 'high' ? 'error' : 'warning';
  } else if (action.startsWith('system.')) {
    type = 'system';
    title = 'System event';
    description = action.replace('system.', '');
  }

  return {
    id: String(row.id),
    type,
    title,
    description,
    timestamp: String(row.created_at),
    status,
    userId: row.user_id ? String(row.user_id) : undefined,
    metadata: row.details as Record<string, unknown> | undefined,
  };
}

function mapAuditLogToActivity(row: Record<string, unknown>): ActivityEvent | null {
  const action = String(row.action || 'update');
  const entityType = String(row.entity_type || 'record');
  
  return {
    id: String(row.id),
    type: 'data',
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} ${entityType}`,
    description: `${entityType} ${row.entity_id ? `#${row.entity_id}` : ''} was ${action}d`,
    timestamp: String(row.created_at),
    status: 'success',
    userId: row.user_id ? String(row.user_id) : undefined,
    metadata: row.changes as Record<string, unknown> | undefined,
  };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

