/**
 * Conversation Search API
 * GET /api/v1/ai/conversations/search
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractPagination,
  requireQueryParams,
} from '@/lib/ai/api-utils';

/**
 * GET /api/v1/ai/conversations/search?q=search+term
 * Search through conversation messages
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);

    // Validate required parameters
    requireQueryParams(searchParams, ['q']);
    const query = searchParams.get('q')!;

    const conversationId = searchParams.get('conversationId');

    // TODO: Call AIAssistantService when available from Team C
    // const result = await AIAssistantService.searchConversations(user.id, {
    //   query,
    //   conversationId,
    //   limit,
    //   offset,
    // });

    // Mock response structure
    const results = [];
    const total = 0;

    return successResponse(
      {
        query,
        results,
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
