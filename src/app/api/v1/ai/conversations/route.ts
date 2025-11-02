/**
 * AI Conversations API
 * GET  /api/v1/ai/conversations - List conversations
 * POST /api/v1/ai/conversations - Create message
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  createdResponse,
  extractPagination,
} from '@/lib/ai/api-utils';
import { createMessageSchema } from '@/lib/ai/validation-schemas';

/**
 * GET /api/v1/ai/conversations
 * List user's conversations
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);

    // TODO: Call AIAssistantService when available from Team C
    // const result = await AIAssistantService.listConversations(user.id, {
    //   limit,
    //   offset,
    // });

    // Mock response structure
    const conversations = [];
    const total = 0;

    return successResponse(conversations, {
      page,
      limit,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * POST /api/v1/ai/conversations
 * Send a message to AI assistant (create or continue conversation)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = createMessageSchema.parse(body);

    // TODO: Call AIAssistantService when available from Team C
    // const result = await AIAssistantService.sendMessage(user.id, user.org_id, {
    //   conversationId: validated.conversationId,
    //   message: validated.message,
    //   context: validated.context,
    //   metadata: validated.metadata,
    // });

    // Mock response structure
    const result = {
      conversationId: validated.conversationId || 'conv-123',
      messageId: 'msg-456',
      userMessage: {
        id: 'msg-456',
        role: 'user',
        content: validated.message,
        timestamp: new Date().toISOString(),
      },
      assistantMessage: {
        id: 'msg-457',
        role: 'assistant',
        content: 'This is a mock response from the AI assistant.',
        timestamp: new Date().toISOString(),
      },
      context: validated.context,
    };

    return createdResponse(result);
  } catch (error) {
    return handleAIError(error);
  }
}
