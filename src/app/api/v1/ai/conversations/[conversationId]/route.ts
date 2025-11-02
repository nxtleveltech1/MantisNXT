/**
 * Conversation Messages API
 * GET /api/v1/ai/conversations/[conversationId]
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractPagination,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/conversations/[conversationId]
 * Get all messages in a conversation
 */
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await context.params;
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);

    // TODO: Call AIAssistantService when available from Team C
    // const result = await AIAssistantService.getConversationMessages(
    //   user.id,
    //   conversationId,
    //   { limit, offset }
    // );

    // Mock response structure
    const messages = [];
    const total = 0;

    return successResponse(
      {
        conversationId,
        messages,
        context: {},
      },
      {
        page,
        limit,
        total,
        hasMore: offset + limit < total,
      }
    );
  } catch (error) {
    return handleAIError(error);
  }
}
