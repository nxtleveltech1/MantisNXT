/**
 * Conversation Search API
 * GET /api/v1/ai/conversations/search
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractPagination,
  requireQueryParams,
} from '@/lib/ai/api-utils';
import { conversationService } from '@/lib/ai/services/conversation-service';

/**
 * GET /api/v1/ai/conversations/search?q=search+term
 * Search through conversation messages using PostgreSQL full-text search
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

    const orgId = user.org_id;
    const userId = user.id;

    // Search conversations
    const allResults = await conversationService.searchConversations(orgId, userId, query);

    // Filter by conversationId if provided
    let filteredResults = allResults;
    if (conversationId) {
      filteredResults = allResults.filter(result => result.conversationId === conversationId);
    }

    // Apply pagination
    const total = filteredResults.length;
    const paginatedResults = filteredResults.slice(offset, offset + limit);

    return successResponse(
      {
        query,
        conversationId,
        results: paginatedResults,
        matches: total,
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
