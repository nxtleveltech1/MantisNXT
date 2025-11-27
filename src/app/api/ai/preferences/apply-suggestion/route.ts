import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { preferenceManager } from '@/lib/ai/preferences'
import { ErrorHandler } from '@/lib/ai/errors'

const ApplySuggestionSchema = z.object({
  suggestionId: z.string().min(1, 'Suggestion ID is required'),
})

// POST /api/ai/preferences/apply-suggestion - Apply a suggested preference
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = ApplySuggestionSchema.parse(body)

    // Get user from request context
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      )
    }

    // Apply suggestion
    await preferenceManager.applySuggestion(userId, validatedBody.suggestionId)

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