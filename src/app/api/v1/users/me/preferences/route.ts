import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { neonAuthService } from '@/lib/auth/neon-auth-service';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get session token
    let sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Verify session and get user
    const user = await neonAuthService.verifySession(sessionToken);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_SESSION',
          message: 'Invalid or expired session',
        },
        { status: 401 }
      );
    }

    // Get preferences from database
    const result = await db.query(
      `
      SELECT 
        language,
        timezone,
        date_format,
        time_format,
        currency,
        theme,
        email_notifications,
        sms_notifications,
        push_notifications,
        notification_digest_frequency,
        profile_visibility,
        show_email,
        show_phone,
        high_contrast,
        reduced_motion,
        screen_reader_optimized,
        dashboard_layout,
        quick_actions,
        preferences
      FROM auth.user_preferences
      WHERE user_id = $1
    `,
      [user.id]
    );

    if (result.rows.length === 0) {
      // Return default preferences
      return NextResponse.json(
        {
          success: true,
          data: {
            language: 'en',
            timezone: 'Africa/Johannesburg',
            dateFormat: 'dd/mm/yyyy',
            timeFormat: '24h',
            currency: 'ZAR',
            theme: 'light',
            notifications: {
              email: true,
              sms: false,
              push: true,
              digestFrequency: 'daily',
            },
            privacy: {
              profileVisibility: 'organization',
              showEmail: false,
              showPhone: false,
            },
            accessibility: {
              highContrast: false,
              reducedMotion: false,
              screenReaderOptimized: false,
            },
          },
        },
        { status: 200 }
      );
    }

    const prefs = result.rows[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          language: prefs.language,
          timezone: prefs.timezone,
          dateFormat: prefs.date_format,
          timeFormat: prefs.time_format,
          currency: prefs.currency,
          theme: prefs.theme,
          notifications: {
            email: prefs.email_notifications,
            sms: prefs.sms_notifications,
            push: prefs.push_notifications,
            digestFrequency: prefs.notification_digest_frequency,
          },
          privacy: {
            profileVisibility: prefs.profile_visibility,
            showEmail: prefs.show_email,
            showPhone: prefs.show_phone,
          },
          accessibility: {
            highContrast: prefs.high_contrast,
            reducedMotion: prefs.reduced_motion,
            screenReaderOptimized: prefs.screen_reader_optimized,
          },
          dashboardLayout: prefs.dashboard_layout,
          quickActions: prefs.quick_actions,
          other: prefs.preferences,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get preferences API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get session token
    let sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Verify session and get user
    const user = await neonAuthService.verifySession(sessionToken);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_SESSION',
          message: 'Invalid or expired session',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      language,
      timezone,
      dateFormat,
      timeFormat,
      currency,
      theme,
      notifications,
      privacy,
      accessibility,
      dashboardLayout,
      quickActions,
    } = body;

    // Upsert preferences
    await db.query(
      `
      INSERT INTO auth.user_preferences (
        user_id,
        language,
        timezone,
        date_format,
        time_format,
        currency,
        theme,
        email_notifications,
        sms_notifications,
        push_notifications,
        notification_digest_frequency,
        profile_visibility,
        show_email,
        show_phone,
        high_contrast,
        reduced_motion,
        screen_reader_optimized,
        dashboard_layout,
        quick_actions,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        language = EXCLUDED.language,
        timezone = EXCLUDED.timezone,
        date_format = EXCLUDED.date_format,
        time_format = EXCLUDED.time_format,
        currency = EXCLUDED.currency,
        theme = EXCLUDED.theme,
        email_notifications = EXCLUDED.email_notifications,
        sms_notifications = EXCLUDED.sms_notifications,
        push_notifications = EXCLUDED.push_notifications,
        notification_digest_frequency = EXCLUDED.notification_digest_frequency,
        profile_visibility = EXCLUDED.profile_visibility,
        show_email = EXCLUDED.show_email,
        show_phone = EXCLUDED.show_phone,
        high_contrast = EXCLUDED.high_contrast,
        reduced_motion = EXCLUDED.reduced_motion,
        screen_reader_optimized = EXCLUDED.screen_reader_optimized,
        dashboard_layout = EXCLUDED.dashboard_layout,
        quick_actions = EXCLUDED.quick_actions,
        updated_at = NOW()
    `,
      [
        user.id,
        language || 'en',
        timezone || 'Africa/Johannesburg',
        dateFormat || 'dd/mm/yyyy',
        timeFormat || '24h',
        currency || 'ZAR',
        theme || 'light',
        notifications?.email ?? true,
        notifications?.sms ?? false,
        notifications?.push ?? true,
        notifications?.digestFrequency || 'daily',
        privacy?.profileVisibility || 'organization',
        privacy?.showEmail ?? false,
        privacy?.showPhone ?? false,
        accessibility?.highContrast ?? false,
        accessibility?.reducedMotion ?? false,
        accessibility?.screenReaderOptimized ?? false,
        dashboardLayout ? JSON.stringify(dashboardLayout) : null,
        quickActions ? JSON.stringify(quickActions) : null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Preferences updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update preferences API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
