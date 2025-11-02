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

    // TODO: Call AIAssistantService when available from Team C
    // const result = await AIAssistantService.getConversationHistory(user.id, {
    //   startDate,
    //   endDate,
    //   limit,
    //   offset,
    // });

    // Mock response structure
    const history = [];
    const total = 0;

    return successResponse(
      {
        history,
        summary: {
          totalConversations: total,
          totalMessages: 0,
          averageMessagesPerConversation: 0,
          topTopics: [],
        },
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
