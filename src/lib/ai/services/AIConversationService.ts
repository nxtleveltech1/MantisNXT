import { db } from '@/lib/database';
import {
  AIServiceBase,
  type AIServiceBaseOptions,
  type AIServiceRequestOptions,
  type AIServiceResponse,
} from './base';

// ============================================================================
// Types
// ============================================================================

export type ConversationRole = 'user' | 'assistant' | 'system';

export interface AIConversation {
  id: string;
  orgId: string;
  userId: string;
  conversationId: string;
  role: ConversationRole;
  content: string;
  context: Record<string, any>;
  createdAt: Date;
}

export interface CreateMessageData {
  userId: string;
  conversationId: string;
  role: ConversationRole;
  content: string;
  context?: Record<string, any>;
}

export interface ConversationSummary {
  conversationId: string;
  messageCount: number;
  firstMessage: string;
  lastMessage: string;
  createdAt: Date;
  lastUpdated: Date;
}

export interface ConversationSearchResult {
  conversationId: string;
  messageId: string;
  role: ConversationRole;
  content: string;
  createdAt: Date;
  relevanceScore?: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class AIConversationService extends AIServiceBase<AIServiceRequestOptions> {
  constructor(options?: AIServiceBaseOptions) {
    super('AIConversationService', options);
  }

  /**
   * Create a new message in a conversation
   */
  async createMessage(
    orgId: string,
    data: CreateMessageData,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIConversation>> {
    return this.executeOperation(
      'conversation.createMessage',
      async () => {
        const result = await db.query(
          `
          INSERT INTO ai_conversation (
            org_id, user_id, conversation_id, role, content, context
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
          `,
          [
            orgId,
            data.userId,
            data.conversationId,
            data.role,
            data.content,
            JSON.stringify(data.context || {}),
          ],
        );

        return this.mapConversationRow(result.rows[0]);
      },
      options,
      {
        orgId,
        conversationId: data.conversationId,
        role: data.role,
      },
    );
  }

  /**
   * Get all messages in a conversation
   */
  async getConversation(
    conversationId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIConversation[]>> {
    return this.executeOperation(
      'conversation.get',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM ai_conversation
          WHERE conversation_id = $1
          ORDER BY created_at ASC
          `,
          [conversationId],
        );

        return result.rows.map((row) => this.mapConversationRow(row));
      },
      options,
      { conversationId },
    );
  }

  /**
   * Get conversation history for a user
   */
  async getConversationHistory(
    userId: string,
    limit: number = 50,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<ConversationSummary[]>> {
    return this.executeOperation(
      'conversation.history',
      async () => {
        const result = await db.query(
          `
          SELECT
            conversation_id,
            COUNT(*) as message_count,
            MIN(content) as first_message,
            MAX(content) as last_message,
            MIN(created_at) as created_at,
            MAX(created_at) as last_updated
          FROM ai_conversation
          WHERE user_id = $1
          GROUP BY conversation_id
          ORDER BY last_updated DESC
          LIMIT $2
          `,
          [userId, limit],
        );

        return result.rows.map((row) => ({
          conversationId: row.conversation_id,
          messageCount: parseInt(row.message_count),
          firstMessage: row.first_message,
          lastMessage: row.last_message,
          createdAt: new Date(row.created_at),
          lastUpdated: new Date(row.last_updated),
        }));
      },
      options,
      { userId, limit },
    );
  }

  /**
   * Add context to a specific message
   */
  async addContext(
    messageId: string,
    context: Record<string, any>,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'conversation.addContext',
      async () => {
        const result = await db.query(
          `
          UPDATE ai_conversation
          SET context = context || $1::jsonb
          WHERE id = $2
          RETURNING id
          `,
          [JSON.stringify(context), messageId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Message ${messageId} not found`);
        }
      },
      options,
      { messageId },
    );
  }

  /**
   * Get relevant context for a conversation
   */
  async getRelevantContext(
    conversationId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<Record<string, any>>> {
    return this.executeOperation(
      'conversation.getContext',
      async () => {
        // Get all context from the conversation
        const result = await db.query(
          `
          SELECT context
          FROM ai_conversation
          WHERE conversation_id = $1
          ORDER BY created_at DESC
          `,
          [conversationId],
        );

        // Merge all context objects
        const mergedContext: Record<string, any> = {};

        for (const row of result.rows) {
          const context = row.context || {};
          Object.assign(mergedContext, context);
        }

        return mergedContext;
      },
      options,
      { conversationId },
    );
  }

  /**
   * Search conversations by query text
   */
  async searchConversations(
    orgId: string,
    query: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<ConversationSearchResult[]>> {
    return this.executeOperation(
      'conversation.search',
      async () => {
        // Use PostgreSQL full-text search
        const result = await db.query(
          `
          SELECT
            id,
            conversation_id,
            role,
            content,
            created_at,
            ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) as relevance
          FROM ai_conversation
          WHERE org_id = $1
            AND to_tsvector('english', content) @@ plainto_tsquery('english', $2)
          ORDER BY relevance DESC, created_at DESC
          LIMIT 100
          `,
          [orgId, query],
        );

        return result.rows.map((row) => ({
          conversationId: row.conversation_id,
          messageId: row.id,
          role: row.role,
          content: row.content,
          createdAt: new Date(row.created_at),
          relevanceScore: parseFloat(row.relevance),
        }));
      },
      options,
      { orgId, query },
    );
  }

  /**
   * Delete old conversations (data retention)
   */
  async deleteOldConversations(
    daysOld: number,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<number>> {
    return this.executeOperation(
      'conversation.deleteOld',
      async () => {
        const result = await db.query(
          `
          DELETE FROM ai_conversation
          WHERE created_at < NOW() - INTERVAL '1 day' * $1
          RETURNING id
          `,
          [daysOld],
        );

        return result.rows.length;
      },
      options,
      { daysOld },
    );
  }

  /**
   * Map database row to AIConversation
   */
  private mapConversationRow(row: any): AIConversation {
    return {
      id: row.id,
      orgId: row.org_id,
      userId: row.user_id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      context: row.context || {},
      createdAt: new Date(row.created_at),
    };
  }
}
