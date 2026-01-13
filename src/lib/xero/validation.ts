/**
 * Xero API Validation Utilities
 *
 * Common validation patterns for Xero API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isXeroConfigured } from './client';
import { hasActiveConnection } from './token-manager';
import { handleApiError } from './errors';

export interface ValidationResult {
  userId: string;
  orgId: string;
  isConnected: boolean;
  error?: NextResponse;
}

/**
 * Validate authentication and Xero connection for API endpoints
 */
export async function validateXeroRequest(
  request: NextRequest,
  requireConnection: boolean = true
): Promise<ValidationResult> {
  try {
    // Verify user is authenticated
    const { userId, orgId } = await auth();

    if (!userId) {
      return {
        userId: '',
        orgId: '',
        isConnected: false,
        error: NextResponse.json(
          { error: 'Unauthorized. Please sign in.' },
          { status: 401 }
        ),
      };
    }

    if (!orgId) {
      return {
        userId,
        orgId: '',
        isConnected: false,
        error: NextResponse.json(
          { error: 'No organization selected. Please select an organization.' },
          { status: 400 }
        ),
      };
    }

    // Check if Xero is configured
    if (!isXeroConfigured()) {
      return {
        userId,
        orgId,
        isConnected: false,
        error: NextResponse.json(
          { error: 'Xero integration is not configured. Please contact support.' },
          { status: 500 }
        ),
      };
    }

    // Check connection if required
    let isConnected = false;
    if (requireConnection) {
      isConnected = await hasActiveConnection(orgId);
      if (!isConnected) {
        return {
          userId,
          orgId,
          isConnected: false,
          error: NextResponse.json(
            { error: 'Not connected to Xero. Please connect first.' },
            { status: 400 }
          ),
        };
      }
    }

    return {
      userId,
      orgId,
      isConnected,
    };

  } catch (error) {
    return {
      userId: '',
      orgId: '',
      isConnected: false,
      error: handleApiError(error, 'Request Validation'),
    };
  }
}

/**
 * Validate sync operation parameters
 */
export function validateSyncParams(body: unknown): {
  type: string;
  data?: unknown;
} | NextResponse {
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Request body must be a valid JSON object' },
      { status: 400 }
    );
  }

  const { type, data } = body as { type?: unknown; data?: unknown };

  if (!type || typeof type !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid "type" parameter' },
      { status: 400 }
    );
  }

  return { type, data };
}

/**
 * Validate report parameters
 */
export function validateReportParams(searchParams: URLSearchParams): {
  fromDate?: string;
  toDate?: string;
  date?: string;
  periods?: number;
  timeframe?: 'MONTH' | 'QUARTER' | 'YEAR';
  parsed?: boolean;
} | NextResponse {
  const params: any = {};

  // Date parameters
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const date = searchParams.get('date');

  if (fromDate) {
    if (!isValidDateString(fromDate)) {
      return NextResponse.json(
        { error: 'Invalid fromDate format. Expected YYYY-MM-DD' },
        { status: 400 }
      );
    }
    params.fromDate = fromDate;
  }

  if (toDate) {
    if (!isValidDateString(toDate)) {
      return NextResponse.json(
        { error: 'Invalid toDate format. Expected YYYY-MM-DD' },
        { status: 400 }
      );
    }
    params.toDate = toDate;
  }

  if (date) {
    if (!isValidDateString(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400 }
      );
    }
    params.date = date;
  }

  // Periods parameter
  const periodsStr = searchParams.get('periods');
  if (periodsStr) {
    const periods = parseInt(periodsStr, 10);
    if (isNaN(periods) || periods < 1 || periods > 12) {
      return NextResponse.json(
        { error: 'Invalid periods parameter. Must be between 1 and 12' },
        { status: 400 }
      );
    }
    params.periods = periods;
  }

  // Timeframe parameter
  const timeframe = searchParams.get('timeframe');
  if (timeframe) {
    const validTimeframes = ['MONTH', 'QUARTER', 'YEAR'];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: `Invalid timeframe parameter. Must be one of: ${validTimeframes.join(', ')}` },
        { status: 400 }
      );
    }
    params.timeframe = timeframe as 'MONTH' | 'QUARTER' | 'YEAR';
  }

  // Parsed parameter
  const parsed = searchParams.get('parsed');
  if (parsed) {
    if (parsed !== 'true' && parsed !== 'false') {
      return NextResponse.json(
        { error: 'Invalid parsed parameter. Must be "true" or "false"' },
        { status: 400 }
      );
    }
    params.parsed = parsed === 'true';
  }

  return params;
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
function isValidDateString(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Standard success response wrapper
 */
export function successResponse(data: unknown, meta?: Record<string, unknown>) {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

/**
 * Standard error response wrapper
 */
export function errorResponse(message: string, code: string = 'ERROR', status: number = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
    },
    { status }
  );
}