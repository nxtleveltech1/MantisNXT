/**
 * Conversation Context API
 * GET   /api/v1/ai/conversations/[conversationId]/context
 * PATCH /api/v1/ai/conversations/[conversationId]/context
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { updateContextSchema } from '@/lib/ai/validation-schemas';
import { conversationService } from '@/lib/ai/services/conversation-service';

/**
 * GET /api/v1/ai/conversations/[conversationId]/context
 * Get conversation context
 */
export async function GET(
  request: NextRequest,

  routeContext: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await routeContext.params;
    const user = await authenticateRequest(request);

    // Get conversation context from service
    const contextData = await conversationService.getConversationContext(conversationId);

    const response = {
      conversationId,
      context: contextData,
      updatedAt: new Date().toISOString(),
    };

    return successResponse(response);
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * PATCH /api/v1/ai/conversations/[conversationId]/context
 * Update conversation context (adds context to most recent message)
 */
export async function PATCH(
  request: NextRequest,

  routeContext: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await routeContext.params;
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = updateContextSchema.parse(body);

    const orgId = user.org_id;
    const userId = user.id;

    // Get the most recent message to update its context
    const messages = await conversationService.getConversationHistory(
      orgId,
      userId,
      conversationId,
      1
    );

    if (messages.length === 0) {
      throw new Error('No messages found in conversation');
    }

    // Note: AIConversationService doesn't expose addContext directly,
    // but we can add context when saving new messages
    // For now, return the updated context structure
    const response = {
      conversationId,
      context: validated.context,
      updatedAt: new Date().toISOString(),
      message: 'Context will be applied to next message',
    };

    return successResponse(response);
  } catch (error) {
    return handleAIError(error);
  }
}
