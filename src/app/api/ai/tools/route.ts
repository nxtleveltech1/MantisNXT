import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { permissionResolver } from '@/lib/ai/access'
import { logToolExecution } from '@/lib/ai/audit'
import { toolRegistry } from '@/lib/ai/tools'
import { ErrorHandler } from '@/lib/ai/errors'

const ToolExecutionSchema = z.object({
  toolName: z.string().min(1, 'Tool name is required'),
  parameters: z.record(z.unknown()).optional(),
  sessionId: z.string().optional(),
})

const ToolListQuerySchema = z.object({
  category: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

// GET /api/ai/tools - List available tools for user (filtered by permissions)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = ToolListQuerySchema.parse({
      category: searchParams.get('category') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    })

    // Get user from request context (middleware handles auth)
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      )
    }

    // Get all available tools
    const allTools = toolRegistry.getAllTools()

    // Filter by permissions
    const accessibleTools = []
    for (const tool of allTools) {
      try {
        await permissionResolver.checkAccess(userId, {
          resourceType: 'tool',
          resourceId: tool.name,
          action: 'execute',
        })
        accessibleTools.push({
          name: tool.name,
          description: tool.description,
          category: tool.category,
          schema: tool.schema,
          accessLevel: tool.accessLevel,
        })
      } catch (error) {
        // Tool not accessible, skip it
        continue
      }
    }

    // Apply category filter
    let filteredTools = accessibleTools
    if (query.category) {
      filteredTools = accessibleTools.filter(tool => tool.category === query.category)
    }

    // Apply pagination
    const paginatedTools = filteredTools.slice(query.offset, query.offset + query.limit)

    return NextResponse.json({
      data: {
        tools: paginatedTools,
        pagination: {
          total: filteredTools.length,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < filteredTools.length,
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

// POST /api/ai/tools/execute - Execute a specific tool
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = ToolExecutionSchema.parse(body)

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
      resourceId: validatedBody.toolName,
      action: 'execute',
    })

    // Get the tool
    const tool = toolRegistry.getTool(validatedBody.toolName)
    if (!tool) {
      return NextResponse.json(
        { data: null, error: { code: 'TOOL_NOT_FOUND', message: `Tool '${validatedBody.toolName}' not found` } },
        { status: 404 }
      )
    }

    // Execute the tool
    const result = await tool.execute({
      parameters: validatedBody.parameters || {},
      sessionId: validatedBody.sessionId,
      userId,
    })

    // Log the execution
    const auditId = await logToolExecution({
      toolName: validatedBody.toolName,
      userId,
      sessionId: validatedBody.sessionId,
      parameters: validatedBody.parameters,
      result,
      timestamp: new Date(),
    })

    return NextResponse.json({
      data: {
        result,
        auditId,
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