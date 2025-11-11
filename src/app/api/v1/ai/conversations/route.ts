/**
 * AI Conversations API - List & Save Conversations
 *
 * Endpoints:
 * - GET /api/v1/ai/conversations - List user conversations
 * - POST /api/v1/ai/conversations - Save a new message
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  createdResponse,
  extractPagination,
} from '@/lib/ai/api-utils';
import { conversationService } from '@/lib/ai/services/conversation-service';

// ============================================================================
// Validation Schemas
// ============================================================================

const SaveMessageSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message content is required'),
  context: z.record(z.string(), z.any()).optional(),
});

// ============================================================================
// GET - List Conversations
// ============================================================================

/**
 * GET /api/v1/ai/conversations
 * List user's conversations with optional search
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);

    const search = searchParams.get('search') || undefined;
    const fromDate = searchParams.get('fromDate')
      ? new Date(searchParams.get('fromDate')!)
      : undefined;
    const toDate = searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined;

    const orgId = user.org_id;
    const userId = user.id;

    // Handle search query
    if (search) {
      const results = await conversationService.searchConversations(orgId, userId, search);

      return successResponse(
        { results, total: results.length },
        {
          page: 1,
          limit: results.length,
          total: results.length,
          hasMore: false,
        },
      );
    }

    // List conversations with filters
    const conversations = await conversationService.listConversations(orgId, userId, {
      limit,
      offset,
      fromDate,
      toDate,
    });

    return successResponse(
      { conversations, total: conversations.length },
      {
        page,
        limit,
        total: conversations.length,
        hasMore: offset + limit < conversations.length,
      },
    );
  } catch (error) {
    return handleAIError(error);
  }
}

// ============================================================================
// POST - Save Message
// ============================================================================

/**
 * POST /api/v1/ai/conversations
 * Save a message to conversation history
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = SaveMessageSchema.parse(body);

    const orgId = user.org_id;
    const userId = user.id;

    const message = await conversationService.saveMessage(
      orgId,
      userId,
      validated.conversationId,
      validated.role,
      validated.content,
      validated.context,
    );

    if (!message) {
      throw new Error('Failed to save message');
    }

    return createdResponse({
      conversationId: message.conversationId,
      message,
    });
  } catch (error) {
    return handleAIError(error);
  }
}
