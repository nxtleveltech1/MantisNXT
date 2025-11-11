import { db } from '@/lib/database';
import { AIChatService, type ConversationOptions } from './chat';
import type { AIServiceBaseOptions, AIServiceResponse } from './base';
import type { AIChatMessage } from '@/types/ai';

export interface AssistantContext {
  orgId: string;
  userId: string;
  userRole?: string;
  capabilities?: string[];
}

export interface AssistantMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  context?: Record<string, unknown>;
}

export interface AssistantResponse {
  message: string;
  suggestions?: string[];
  actions?: Array<{
    type: string;
    label: string;
    data: unknown;
  }>;
  metadata?: Record<string, unknown>;
}

export class AIAssistantService extends AIChatService {
  constructor(options?: AIServiceBaseOptions) {
    super(options);
  }

  /**
   * Start a new conversation with context
   */
  async startConversation(
    context: AssistantContext,
    initialMessage?: string,
  ): Promise<{ conversationId: string; response?: AssistantResponse }> {
    const systemPrompt = this.buildSystemPrompt(context);

    const conversationOptions: ConversationOptions = {
      systemPrompt,
      metadata: {
        orgId: context.orgId,
        userId: context.userId,
        startedAt: new Date().toISOString(),
      },
    };

    const conversation = this.createConversation(conversationOptions);

    // Store in database
    await this.storeMessage(context.orgId, context.userId, conversation.id, {
      role: 'system',
      content: systemPrompt,
    });

    if (initialMessage) {
      const response = await this.sendMessage(
        context,
        conversation.id,
        initialMessage,
      );
      return {
        conversationId: conversation.id,
        response: response.data,
      };
    }

    return { conversationId: conversation.id };
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(
    context: AssistantContext,
    conversationId: string,
    message: string,
  ): Promise<AIServiceResponse<AssistantResponse>> {
    // Store user message
    await this.storeMessage(context.orgId, context.userId, conversationId, {
      role: 'user',
      content: message,
    });

    // Augment message with relevant context
    const enhancedMessage = await this.enhanceMessageWithContext(
      context,
      message,
    );

    // Get AI response
    const chatMessage: AIChatMessage = {
      role: 'user',
      content: enhancedMessage,
    };

    const response = await this.continueConversation(
      conversationId,
      chatMessage,
      {
        conversationId,
        metadata: { orgId: context.orgId, userId: context.userId },
      },
    );

    if (!response.success || !response.data) {
      return response as unknown;
    }

    // Parse AI response for structured data
    const assistantResponse = this.parseAssistantResponse(response.data.text);

    // Store assistant message
    await this.storeMessage(context.orgId, context.userId, conversationId, {
      role: 'assistant',
      content: response.data.text,
      context: assistantResponse.metadata,
    });

    return {
      ...response,
      data: assistantResponse,
    };
  }

  /**
   * Get conversation history
   */
  async getHistory(
    context: AssistantContext,
    conversationId: string,
    limit: number = 50,
  ): Promise<AssistantMessage[]> {
    const result = await db.query(
      `
      SELECT role, content, context, created_at
      FROM ai_conversation
      WHERE org_id = $1
        AND user_id = $2
        AND conversation_id = $3
      ORDER BY created_at DESC
      LIMIT $4
      `,
      [context.orgId, context.userId, conversationId, limit],
    );

    return result.rows.reverse().map((row) => ({
      role: row.role,
      content: row.content,
      context: row.context,
    }));
  }

  /**
   * List user conversations
   */
  async listConversations(
    context: AssistantContext,
    limit: number = 20,
  ): Promise<Array<{ id: string; lastMessage: string; lastActivity: Date }>> {
    const result = await db.query(
      `
      SELECT DISTINCT ON (conversation_id)
        conversation_id as id,
        content as last_message,
        created_at as last_activity
      FROM ai_conversation
      WHERE org_id = $1
        AND user_id = $2
        AND role != 'system'
      ORDER BY conversation_id, created_at DESC
      LIMIT $3
      `,
      [context.orgId, context.userId, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      lastMessage: row.last_message.substring(0, 100),
      lastActivity: row.last_activity,
    }));
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(
    context: AssistantContext,
    conversationId: string,
  ): Promise<void> {
    await db.query(
      `
      DELETE FROM ai_conversation
      WHERE org_id = $1
        AND user_id = $2
        AND conversation_id = $3
      `,
      [context.orgId, context.userId, conversationId],
    );

    this.closeConversation(conversationId);
  }

  /**
   * Build system prompt based on context
   */
  private buildSystemPrompt(context: AssistantContext): string {
    const capabilities = context.capabilities || [
      'inventory_management',
      'supplier_information',
      'analytics',
      'forecasting',
    ];

    return `
You are an AI assistant for MantisNXT, an inventory and supplier management system.

User Role: ${context.userRole || 'user'}
Available Capabilities: ${capabilities.join(', ')}

Your responsibilities:
1. Answer questions about inventory, suppliers, and analytics
2. Provide data-driven insights and recommendations
3. Help users navigate the system and understand features
4. Suggest actions based on current data and trends

Guidelines:
- Be concise and actionable
- Use data from the system when available
- Suggest specific actions when appropriate
- Format responses clearly
- If you can't answer something, say so clearly

When responding:
- Use natural, professional language
- Provide specific numbers when available
- Suggest next steps or actions when relevant
- Format lists and data clearly

Available actions you can suggest:
- view_product: Show product details
- view_supplier: Show supplier details
- create_order: Create a purchase order
- view_forecast: Show demand forecast
- view_analytics: Show analytics dashboard
`.trim();
  }

  /**
   * Enhance message with relevant context data
   */
  private async enhanceMessageWithContext(
    context: AssistantContext,
    message: string,
  ): Promise<string> {
    const lowerMessage = message.toLowerCase();

    // Check for product-related queries
    if (lowerMessage.includes('product') || lowerMessage.includes('inventory')) {
      const productContext = await this.getRecentProducts(context.orgId, 5);
      if (productContext.length > 0) {
        return `${message}\n\nContext - Recent products: ${JSON.stringify(productContext)}`;
      }
    }

    // Check for supplier-related queries
    if (lowerMessage.includes('supplier')) {
      const supplierContext = await this.getTopSuppliers(context.orgId, 5);
      if (supplierContext.length > 0) {
        return `${message}\n\nContext - Top suppliers: ${JSON.stringify(supplierContext)}`;
      }
    }

    // Check for alert-related queries
    if (lowerMessage.includes('alert') || lowerMessage.includes('issue')) {
      const alertContext = await this.getRecentAlerts(context.orgId, 3);
      if (alertContext.length > 0) {
        return `${message}\n\nContext - Recent alerts: ${JSON.stringify(alertContext)}`;
      }
    }

    return message;
  }

  /**
   * Get recent products for context
   */
  private async getRecentProducts(
    orgId: string,
    limit: number,
  ): Promise<Array<{ name: string; quantity: number; category: string }>> {
    const result = await db.query(
      `
      SELECT p.name, soh.quantity, c.name as category
      FROM products p
      LEFT JOIN stock_on_hand soh ON soh.product_id = p.id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE current_setting('app.current_org_id', true)::uuid = $1
      ORDER BY p.created_at DESC
      LIMIT $2
      `,
      [orgId, limit],
    );

    return result.rows.map((row) => ({
      name: row.name,
      quantity: parseFloat(row.quantity) || 0,
      category: row.category || 'Uncategorized',
    }));
  }

  /**
   * Get top suppliers for context
   */
  private async getTopSuppliers(
    orgId: string,
    limit: number,
  ): Promise<Array<{ name: string; totalOrders: number }>> {
    const result = await db.query(
      `
      SELECT s.name, COUNT(po.id) as total_orders
      FROM public.suppliers s
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id
      WHERE current_setting('app.current_org_id', true)::uuid = $1
      GROUP BY s.id, s.name
      ORDER BY total_orders DESC
      LIMIT $2
      `,
      [orgId, limit],
    );

    return result.rows.map((row) => ({
      name: row.name,
      totalOrders: parseInt(row.total_orders) || 0,
    }));
  }

  /**
   * Get recent alerts for context
   */
  private async getRecentAlerts(
    orgId: string,
    limit: number,
  ): Promise<Array<{ severity: string; title: string }>> {
    const result = await db.query(
      `
      SELECT severity, title
      FROM ai_alert
      WHERE org_id = $1
        AND is_resolved = false
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [orgId, limit],
    );

    return result.rows;
  }

  /**
   * Parse AI response for structured data
   */
  private parseAssistantResponse(text: string): AssistantResponse {
    const response: AssistantResponse = {
      message: text,
      suggestions: [],
      actions: [],
      metadata: {},
    };

    // Try to extract structured actions from response
    const actionPattern = /ACTION:\s*(\w+)\s*-\s*(.+)/gi;
    let match;
    while ((match = actionPattern.exec(text)) !== null) {
      response.actions?.push({
        type: match[1].toLowerCase(),
        label: match[2].trim(),
        data: {},
      });
    }

    // Extract suggestions
    const suggestionPattern = /SUGGESTION:\s*(.+)/gi;
    while ((match = suggestionPattern.exec(text)) !== null) {
      response.suggestions?.push(match[1].trim());
    }

    // Clean message text (remove action/suggestion markers)
    response.message = text
      .replace(/ACTION:\s*\w+\s*-\s*.+/gi, '')
      .replace(/SUGGESTION:\s*.+/gi, '')
      .trim();

    return response;
  }

  /**
   * Store message in database
   */
  private async storeMessage(
    orgId: string,
    userId: string,
    conversationId: string,
    message: AssistantMessage,
  ): Promise<void> {
    await db.query(
      `
      INSERT INTO ai_conversation (
        org_id, user_id, conversation_id, role, content, context
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        orgId,
        userId,
        conversationId,
        message.role,
        message.content,
        JSON.stringify(message.context || {}),
      ],
    );
  }
}
