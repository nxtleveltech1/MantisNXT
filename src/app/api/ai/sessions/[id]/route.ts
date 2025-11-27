import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { orchestrator } from '@/lib/ai/orchestrator'
import { ErrorHandler } from '@/lib/ai/errors'

interface RouteParams {
  id: string
}

const UpdateSessionSchema = z.object({
  context: z.record(z.unknown()).optional(),
  preferenceOverrides: z.record(z.unknown()).optional(),
})

// GET /api/ai/sessions/[id] - Get session details
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: sessionId } = params

    // Get user from request context
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      )
    }

    // Get session details
    const session = await orchestrator.getSession(sessionId)

    // Verify session belongs to user
    if (session.userId !== userId) {
      return NextResponse.json(
        { data: null, error: { code: 'ACCESS_DENIED', message: 'Session access denied' } },
        { status: 403 }
      )
    }

    return NextResponse.json({
      data: {
        session: {
          id: session.id,
          userId: session.userId,
          createdAt: session.createdAt,
          lastActivityAt: session.lastActivityAt,
          metadata: session.metadata,
          preferences: session.preferences,
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

// PATCH /api/ai/sessions/[id] - Update session context
export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: sessionId } = params
    const body = await request.json()
    const validatedBody = UpdateSessionSchema.parse(body)

    // Get user from request context
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      )
    }

    // Update session
    const updatedSession = await orchestrator.updateSession(sessionId, {
      userId,
      context: validatedBody.context,
      preferenceOverrides: validatedBody.preferenceOverrides,
    })

    return NextResponse.json({
      data: {
        session: {
          id: updatedSession.id,
          userId: updatedSession.userId,
          createdAt: updatedSession.createdAt,
          lastActivityAt: updatedSession.lastActivityAt,
          metadata: updatedSession.metadata,
          preferences: updatedSession.preferences,
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

// DELETE /api/ai/sessions/[id] - End session
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: sessionId } = params

    // Get user from request context
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      )
    }

    // End session
    await orchestrator.endSession(sessionId, userId)

    return NextResponse.json({
      data: { success: true },
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