import { NextRequest, NextResponse } from 'next/server';

/**
 * Error Logging API Endpoint
 * Receives error logs from the frontend and handles them appropriately
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // In production, you would send this to your error tracking service
    // (e.g., Sentry, LogRocket, DataDog, etc.)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with your error tracking service
      // Example: await sentry.captureException(error);
      console.error('[Error Log]', {
        message: body.message,
        digest: body.digest,
        timestamp: body.timestamp,
        url: body.url,
        userAgent: body.userAgent,
      });
    } else {
      // In development, just log to console
      console.error('[Error Log (Dev)]', body);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Error logged successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Silently fail if logging fails
    console.error('Failed to log error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to log error',
      },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: 'Method not allowed. Use POST to log errors.',
    },
    { status: 405 }
  );
}

