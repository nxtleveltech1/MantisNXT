/**
 * Conversation History API
 * GET /api/v1/ai/conversations/history
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractPagination,
  extractDateRange,
} from '@/lib/ai/api-utils';
import { conversationService } from '@/lib/ai/services/conversation-service';

/**
 * GET /api/v1/ai/conversations/history
 * Get user's conversation history with summary
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);
    const { startDate, endDate } = extractDateRange(searchParams);

    const orgId = user.org_id;
    const userId = user.id;

    // Get conversation summaries
    const conversations = await conversationService.listConversations(orgId, userId, {
      limit,
      offset,
      fromDate: startDate,
      toDate: endDate,
    });

    // Calculate summary statistics
    const totalConversations = conversations.length;
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messageCount, 0);
    const avgMessages = totalConversations > 0 ? totalMessages / totalConversations : 0;

    return successResponse(
      {
        history: conversations,
        summary: {
          totalConversations,
          totalMessages,
          averageMessagesPerConversation: Math.round(avgMessages * 10) / 10,
          dateRange: {
            from: startDate?.toISOString(),
            to: endDate?.toISOString(),
          },
        },
      },
      {
        page,
        limit,
        total: totalConversations,
        hasMore: offset + limit < totalConversations,
      }
    );
  } catch (error) {
    return handleAIError(error);
  }
}
