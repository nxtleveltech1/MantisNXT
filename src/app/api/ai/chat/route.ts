import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { orchestrator } from '@/lib/ai/orchestrator';
import { preferenceManager } from '@/lib/ai/preferences';
import { ErrorHandler } from '@/lib/ai/errors';

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  sessionId: z.string().uuid('Valid session ID required'),
  attachments: z
    .array(
      z.object({
        type: z.enum(['file', 'image', 'document']),
        name: z.string(),
        content: z.string(),
        mimeType: z.string().optional(),
      })
    )
    .optional(),
  stream: z.boolean().default(false),
  options: z
    .object({
      maxTokens: z.number().int().min(1).max(100000).optional(),
      temperature: z.number().min(0).max(2).optional(),
      tools: z.array(z.string()).optional(),
    })
    .optional(),
});

const encoder = new TextEncoder();

// POST /api/ai/chat - Send message to AI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedBody = ChatRequestSchema.parse(body);

    // Get user from request context
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'User authentication required' } },
        { status: 401 }
      );
    }

    // Verify session ownership
    const session = orchestrator.getSession(validatedBody.sessionId);
    if (!session) {
      return NextResponse.json(
        { data: null, error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } },
        { status: 404 }
      );
    }
    if (session.userId !== userId) {
      return NextResponse.json(
        { data: null, error: { code: 'ACCESS_DENIED', message: 'Session access denied' } },
        { status: 403 }
      );
    }

    // Load user preferences for response formatting
    const userPreferences = await preferenceManager.getPreferences(userId);

    // Prepare orchestrator request
    const orchestratorRequest = {
      sessionId: validatedBody.sessionId,
      message: validatedBody.message,
      conversationHistory: [], // Will be loaded by orchestrator
      context: {
        attachments: validatedBody.attachments,
        userPreferences,
      },
      options: {
        stream: validatedBody.stream,
        timeout: 30000, // 30 seconds
        maxTokens: validatedBody.options?.maxTokens,
        temperature: validatedBody.options?.temperature,
        tools: validatedBody.options?.tools || [],
      },
    };

    if (validatedBody.stream) {
      // Handle streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const orchestratorStream = await orchestrator.processStreaming(orchestratorRequest);

            for await (const chunk of orchestratorStream) {
              const data = JSON.stringify({
                type: chunk.type,
                content: chunk.content,
                toolCall: chunk.toolCall,
                done: chunk.done,
                metadata: chunk.metadata,
              });

              controller.enqueue(encoder.encode(`data: ${data}\n\n`));

              if (chunk.done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                break;
              }
            }
          } catch (error) {
            const formattedError = ErrorHandler.formatForUser(error);
            const errorData = JSON.stringify({
              type: 'error',
              error: formattedError,
              done: true,
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      // Handle regular response
      const response = await orchestrator.process(orchestratorRequest);

      // Generate suggested actions based on response
      const suggestedActions = await generateSuggestedActions(response, userPreferences);

      return NextResponse.json({
        data: {
          response: response.content,
          toolCalls: response.toolCalls,
          suggestedActions,
          usage: response.usage,
          metadata: response.metadata,
        },
        error: null,
      });
    }
  } catch (error) {
    console.error('[Chat API] Error processing request:', error);
    const formattedError = ErrorHandler.formatForUser(error);
    return NextResponse.json({ data: null, error: formattedError }, { status: 500 });
  }
}

// Generate context-aware suggested actions
async function generateSuggestedActions(response: any, userPreferences: any): Promise<string[]> {
  const suggestions = [];

  // Analyze response for actionable content
  if (response.toolCalls && response.toolCalls.length > 0) {
    suggestions.push('Execute suggested tools');
  }

  // Add preference-based suggestions
  if (userPreferences.communication?.responseStyle === 'concise') {
    suggestions.push('Ask for more details');
  }

  // Add common follow-up actions
  suggestions.push('Start new conversation');
  suggestions.push('Save this response');

  return suggestions.slice(0, 3); // Limit to 3 suggestions
}
