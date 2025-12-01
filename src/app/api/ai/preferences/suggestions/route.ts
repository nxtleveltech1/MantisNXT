import { NextRequest, NextResponse } from 'next/server';
import { preferenceManager } from '@/lib/ai/preferences';
import { ErrorHandler } from '@/lib/ai/errors';

// GET /api/ai/preferences/suggestions - Get learning-based suggestions
export async function GET(request: NextRequest) {
  try {
    // Get user from request context
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      );
    }

    // Get preference suggestions
    const suggestions = await preferenceManager.getSuggestions(userId);

    return NextResponse.json({
      data: {
        suggestions,
      },
      error: null,
    });
  } catch (error) {
    const formattedError = ErrorHandler.formatForUser(error);
    return NextResponse.json({ data: null, error: formattedError }, { status: 500 });
  }
}
