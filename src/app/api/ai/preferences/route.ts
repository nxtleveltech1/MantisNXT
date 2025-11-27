import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { preferenceManager } from '@/lib/ai/preferences'
import { ErrorHandler } from '@/lib/ai/errors'

const UpdatePreferencesSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  key: z.string().min(1, 'Key is required'),
  value: z.unknown(),
})

const ResetPreferencesSchema = z.object({
  category: z.string().optional(),
})

const ApplySuggestionSchema = z.object({
  suggestionId: z.string().min(1, 'Suggestion ID is required'),
})

// GET /api/ai/preferences - Get current user preferences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Get user from request context
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      )
    }

    // Get preferences
    const preferences = await preferenceManager.getPreferences(userId)

    // Filter by category if specified
    let filteredPreferences = preferences
    if (category) {
      filteredPreferences = Object.keys(preferences).reduce((acc, key) => {
        if (key.startsWith(`${category}.`)) {
          acc[key] = preferences[key]
        }
        return acc
      }, {} as Record<string, unknown>)
    }

    return NextResponse.json({
      data: {
        preferences: filteredPreferences,
        categories: Object.keys(preferences).reduce((acc, key) => {
          const categoryName = key.split('.')[0]
          if (!acc.includes(categoryName)) {
            acc.push(categoryName)
          }
          return acc
        }, [] as string[]),
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

// PUT /api/ai/preferences - Update preferences
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = UpdatePreferencesSchema.parse(body)

    // Get user from request context
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      )
    }

    // Update preference
    await preferenceManager.updatePreference(
      userId,
      validatedBody.category,
      validatedBody.key,
      validatedBody.value
    )

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

// POST /api/ai/preferences/reset - Reset to defaults
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = ResetPreferencesSchema.parse(body)

    // Get user from request context
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      )
    }

    // Reset preferences
    await preferenceManager.resetPreferences(userId, validatedBody.category)

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