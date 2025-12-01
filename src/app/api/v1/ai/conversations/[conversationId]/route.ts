/**
 * Conversation Messages API
 * GET    /api/v1/ai/conversations/[conversationId] - Get messages
 * DELETE /api/v1/ai/conversations/[conversationId] - Delete conversation
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractPagination,
} from '@/lib/ai/api-utils';
import { conversationService } from '@/lib/ai/services/conversation-service';

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
    const { limit } = extractPagination(searchParams);

    const orgId = user.org_id;
    const userId = user.id;

    // Get conversation messages
    const messages = await conversationService.getConversationHistory(
      orgId,
      userId,
      conversationId,
      limit
    );

    // Get conversation context
    const contextData = await conversationService.getConversationContext(conversationId);

    return successResponse(
      {
        conversationId,
        messages,
        context: contextData,
        total: messages.length,
      },
      {
        page: 1,
        limit: limit || messages.length,
        total: messages.length,
        hasMore: false,
      }
    );
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * DELETE /api/v1/ai/conversations/[conversationId]
 * Delete an entire conversation
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await context.params;
    const user = await authenticateRequest(request);

    // Delete conversation
    const deletedCount = await conversationService.deleteConversation(conversationId);

    return successResponse(
      {
        conversationId,
        deletedMessages: deletedCount,
      },
      {
        total: deletedCount,
      }
    );
  } catch (error) {
    return handleAIError(error);
  }
}
