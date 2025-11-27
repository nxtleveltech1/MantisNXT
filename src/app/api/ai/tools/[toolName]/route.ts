import { NextRequest, NextResponse } from 'next/server'
import { permissionResolver } from '@/lib/ai/access'
import { toolRegistry } from '@/lib/ai/tools'
import { ErrorHandler } from '@/lib/ai/errors'

interface RouteParams {
  toolName: string
}

// GET /api/ai/tools/[toolName] - Get tool schema and metadata
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { toolName } = params

    // Get user from request context
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      )
    }

    // Check tool access permissions
    await permissionResolver.checkAccess(userId, {
      resourceType: 'tool',
      resourceId: toolName,
      action: 'read',
    })

    // Get the tool
    const tool = toolRegistry.getTool(toolName)
    if (!tool) {
      return NextResponse.json(
        { data: null, error: { code: 'TOOL_NOT_FOUND', message: `Tool '${toolName}' not found` } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: {
        name: tool.name,
        description: tool.description,
        category: tool.category,
        schema: tool.schema,
        accessLevel: tool.accessLevel,
        metadata: tool.metadata,
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