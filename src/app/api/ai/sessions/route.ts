import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { orchestrator } from '@/lib/ai/orchestrator'
import { preferenceManager } from '@/lib/ai/preferences'
import { ErrorHandler } from '@/lib/ai/errors'

const CreateSessionSchema = z.object({
  context: z.record(z.unknown()).optional(),
  preferenceOverrides: z.record(z.unknown()).optional(),
})

const UpdateSessionSchema = z.object({
  context: z.record(z.unknown()).optional(),
  preferenceOverrides: z.record(z.unknown()).optional(),
})

// GET /api/ai/sessions - List user's active sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Get user from request context
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      )
    }

    // Get active sessions for user
    const sessions = await orchestrator.getActiveSessions(userId, { limit, offset })

    return NextResponse.json({
      data: {
        sessions,
        pagination: {
          limit,
          offset,
          hasMore: sessions.length === limit,
        },
      },
      error: null,
    })
  } catch (error) {
    const formattedError = ErrorHandler.formatForUser(error)
    return NextResponse.json(
      { data: null, error: formattedError },
      { status: 500 }
    )
  }
}

// POST /api/ai/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = CreateSessionSchema.parse(body)

    // Get user from request context
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      )
    }

    // Load user preferences
    const userPreferences = await preferenceManager.getPreferences(userId)

    // Merge with overrides
    const sessionPreferences = {
      ...userPreferences,
      ...validatedBody.preferenceOverrides,
    }

    // Create session
    const session = await orchestrator.createSession({
      userId,
      context: validatedBody.context || {},
      preferences: sessionPreferences,
    })

    return NextResponse.json({
      data: {
        sessionId: session.id,
        expiresAt: new Date(session.createdAt.getTime() + 24 * 60 * 60 * 1000), // 24 hours
      },
      error: null,
    })
  } catch (error) {
    const formattedError = ErrorHandler.formatForUser(error)
    return NextResponse.json(
      { data: null, error: formattedError },
      { status: 500 }
    )
  }
}