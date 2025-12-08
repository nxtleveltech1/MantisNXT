/**
 * Unified AI Orchestrator
 * Central orchestrator that coordinates AI services, tool execution, context management, and multi-step planning
 */

import { EventEmitter } from 'events';
import { generateText, streamText, type ModelMessage } from 'ai';
import {
  OrchestratorConfig,
  OrchestratorSession,
  OrchestratorRequest,
  OrchestratorResponse,
  OrchestratorState,
  OrchestratorEvent,
  ConversationTurn,
  ToolCallWithResult,
  StreamChunk,
  OrchestratorStream,
  OrchestratorError,
  OrchestratorTimeoutError,
  orchestratorConfigSchema,
  orchestratorRequestSchema,
  conversationTurnSchema,
} from './types';
import { getProviderClient, getProviderClientsForFallback } from '../providers';
import { toolRegistry } from '../tools/registry';
import { toolExecutor } from '../tools/executor';
import type { AIProviderId, AIClient } from '@/types/ai';
import { normalizeToolCalls } from './tool-call-utils';

/**
 * Unified AI Orchestrator
 * Main orchestrator class that coordinates all AI operations
 */
export class UnifiedAIOrchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private currentState: OrchestratorState = 'idle';
  private activeSessions = new Map<string, OrchestratorSession>();

  constructor(config: OrchestratorConfig) {
    super();
    this.config = orchestratorConfigSchema.parse(config);
    this.setupEventHandling();
  }

  /**
   * Process an orchestrator request
   */
  async processRequest(
    request: OrchestratorRequest,
    session: OrchestratorSession
  ): Promise<OrchestratorResponse> {
    const validatedRequest = orchestratorRequestSchema.parse(request);
    const startTime = Date.now();

    try {
      this.setState('processing_request', { sessionId: session.id });
      this.emitEvent('request_received', { sessionId: session.id, request: validatedRequest });

      // Update session activity
      session.lastActivityAt = new Date();
      this.activeSessions.set(session.id, session);

      // Select appropriate provider
      const provider = this.selectProvider(validatedRequest);
      this.emitEvent('provider_selected', {
        sessionId: session.id,
        providerId: provider.id,
      });

      // Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(session, validatedRequest);

      // Prepare messages for AI provider
      const messages = this.buildMessages(validatedRequest, systemPrompt);

      // Check if tools are needed
      const availableTools = this.getAvailableTools(validatedRequest.options.tools || []);
      const toolSchemas = availableTools.length > 0 ? toolRegistry.getToolsSchema() : undefined;

      // Generate response
      const aiResponse = await this.generateResponse(
        provider,
        messages,
        toolSchemas,
        validatedRequest.options
      );

      // Execute tool calls if present
      let toolResults: ToolCallWithResult[] = [];
      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        this.setState('executing_tools', { sessionId: session.id });
        toolResults = await this.executeToolCalls(aiResponse.toolCalls, {
          sessionId: session.id,
          userId: session.userId,
          orgId: session.orgId,
        });
      }

      // Build orchestrator response
      const response: OrchestratorResponse = {
        sessionId: session.id,
        content: aiResponse.content,
        toolCalls: toolResults,
        citations: [], // TODO: Implement citation system
        usage: {
          promptTokens: aiResponse.usage?.promptTokens,
          completionTokens: aiResponse.usage?.completionTokens,
          totalTokens: aiResponse.usage?.totalTokens,
          durationMs: Date.now() - startTime,
          provider: provider.id,
          model: aiResponse.model || 'unknown',
        },
        metadata: {
          state: this.currentState,
          providerUsed: provider.id,
          toolsExecuted: toolResults.length,
        },
      };

      this.setState('completed', { sessionId: session.id });
      this.emitEvent('response_generated', {
        sessionId: session.id,
        response,
        durationMs: response.usage.durationMs,
      });

      return response;
    } catch (error) {
      this.setState('error', { sessionId: session.id, error });
      this.emitEvent('error_occurred', {
        sessionId: session.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw this.wrapError(error);
    }
  }

  /**
   * Process a streaming request
   */
  async *processStreamingRequest(
    request: OrchestratorRequest,
    session: OrchestratorSession
  ): OrchestratorStream {
    const validatedRequest = orchestratorRequestSchema.parse(request);

    try {
      this.setState('streaming_response', { sessionId: session.id });

      // Select provider and prepare
      const provider = this.selectProvider(validatedRequest);
      const systemPrompt = this.buildSystemPrompt(session, validatedRequest);
      const messages = this.buildMessages(validatedRequest, systemPrompt);
      const availableTools = this.getAvailableTools(validatedRequest.options.tools || []);
      const toolSchemas = availableTools.length > 0 ? toolRegistry.getToolsSchema() : undefined;

      // Stream the response
      const stream = await provider.streamText(
        messages.map(m => ({ role: m.role, content: m.content })).join('\n'),
        {
          maxTokens: validatedRequest.options.maxTokens,
          temperature: validatedRequest.options.temperature,
        }
      );

      for await (const chunk of stream) {
        yield {
          type: 'text',
          content: chunk.token,
          done: chunk.done || false,
          metadata: {
            provider: provider.id,
            sessionId: session.id,
          },
        };
      }

      // Mark as done
      yield {
        type: 'done',
        done: true,
        metadata: { sessionId: session.id },
      };
    } catch (error) {
      yield {
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown streaming error',
        metadata: { sessionId: session.id, error },
      };
      throw this.wrapError(error);
    }
  }

  /**
   * Select the best AI provider for the request
   */
  private selectProvider(request: OrchestratorRequest): AIClient {
    // Use fallback chain if configured
    const clients = getProviderClientsForFallback();

    // For now, just return the first healthy provider
    // TODO: Implement intelligent provider selection based on:
    // - Provider preferences
    // - Request characteristics
    // - Provider health status
    // - Cost optimization
    // - Response quality requirements

    for (const client of clients) {
      // Basic health check - in production, use actual health monitoring
      if (client) {
        return client;
      }
    }

    throw new OrchestratorError('No healthy AI providers available', 'NO_PROVIDERS_AVAILABLE');
  }

  /**
   * Build dynamic system prompt with context
   */
  private buildSystemPrompt(session: OrchestratorSession, request: OrchestratorRequest): string {
    const basePrompt = `You are an AI assistant integrated with MantisNXT, a comprehensive supply chain management system.

Context:
- User ID: ${session.userId}
- Organization: ${session.orgId || 'Personal'}
- Session: ${session.id}

Capabilities:
- Access to inventory, suppliers, orders, analytics, and customer data
- Tool execution for complex operations
- Multi-step planning for complex tasks

Guidelines:
- Be helpful, accurate, and efficient
- Use tools when appropriate for data operations
- Provide clear, actionable responses
- Maintain context across conversations

Available Tools:`;

    // Add available tools to prompt
    const availableTools = this.getAvailableTools(request.options.tools || []);
    const toolDescriptions = availableTools
      .map(tool => `- ${tool.name}: ${tool.description}`)
      .join('\n');

    return `${basePrompt}\n${toolDescriptions}\n\nRespond naturally while leveraging these capabilities as needed.`;
  }

  /**
   * Build messages array for AI provider
   */
  private buildMessages(request: OrchestratorRequest, systemPrompt: string): ModelMessage[] {
    const messages: ModelMessage[] = [{ role: 'system', content: systemPrompt }];

    // Add conversation history (limited by config)
    const history = request.conversationHistory.slice(-this.config.maxConversationHistory);
    for (const turn of history) {
      if (turn.role === 'user' || turn.role === 'assistant') {
        messages.push({
          role: turn.role,
          content: turn.content,
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: request.message,
    });

    return messages;
  }

  /**
   * Get available tools for the request
   */
  private getAvailableTools(requestedTools: string[]) {
    if (requestedTools.length === 0) {
      // Return all available tools
      return toolRegistry.listTools();
    }

    // Return only requested tools
    return requestedTools
      .map(name => toolRegistry.getTool(name))
      .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined);
  }

  /**
   * Generate AI response
   */
  private async generateResponse(
    provider: AIClient,
    messages: ModelMessage[],
    toolSchemas?: unknown[],
    options?: OrchestratorRequest['options']
  ): Promise<{
    content: string;
    toolCalls?: ToolCallWithResult[];
    model?: string;
    usage?: unknown;
  }> {
    const chatMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    const response = await provider.chat(chatMessages, {
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });

    const rawToolCalls = Array.isArray(response.toolCalls)
      ? response.toolCalls
      : typeof response.rawResponse === 'object' && response.rawResponse
        ? (response.rawResponse as { toolCalls?: unknown[] }).toolCalls
        : undefined;

    const toolCalls = normalizeToolCalls(Array.isArray(rawToolCalls) ? rawToolCalls : undefined);

    return {
      content: response.text,
      toolCalls,
      model: response.model,
      usage: response.usage,
    };
  }

  /**
   * Execute tool calls
   */
  private async executeToolCalls(
    toolCalls: ToolCallWithResult[],
    context: { sessionId: string; userId: string; orgId?: string }
  ): Promise<ToolCallWithResult[]> {
    const results: ToolCallWithResult[] = [];

    for (const toolCall of toolCalls) {
      try {
        const startTime = Date.now();

        const toolArguments = toolCall.arguments ?? {};

        // Execute the tool
        const result = await toolExecutor.execute(
          toolCall.name,
          toolArguments,
          {
            orgId: context.orgId || '',
            userId: context.userId,
            sessionId: context.sessionId,
            conversationId: context.sessionId,
            timestamp: new Date(),
          },
          { timeout: this.config.requestTimeoutMs }
        );

        const executionTimeMs = Date.now() - startTime;

        results.push({
          id: toolCall.id,
          name: toolCall.name,
          arguments: toolArguments,
          result: result.data,
          success: result.success,
          executionTimeMs,
          ...(result.success
            ? {}
            : {
                error: {
                  code: result.error?.code || 'TOOL_EXECUTION_FAILED',
                  message: result.error?.message || 'Tool execution failed',
                  details: result.error?.details,
                },
              }),
        });
      } catch (error) {
        results.push({
          id: toolCall.id,
          name: toolCall.name,
          arguments: toolArguments,
          success: false,
          executionTimeMs: 0,
          error: {
            code: 'TOOL_EXECUTION_ERROR',
            message: error instanceof Error ? error.message : 'Tool execution failed',
            details: error,
          },
        });
      }
    }

    return results;
  }

  /**
   * Set orchestrator state and emit events
   */
  private setState(state: OrchestratorState, metadata?: Record<string, unknown>): void {
    const previousState = this.currentState;
    this.currentState = state;

    this.emitEvent('session_updated', {
      previousState,
      currentState: state,
      ...metadata,
    });
  }

  /**
   * Emit orchestrator events
   */
  private emitEvent(type: OrchestratorEvent['type'], data: Record<string, unknown> = {}): void {
    const event: OrchestratorEvent = {
      id: crypto.randomUUID(),
      sessionId: (data.sessionId as string) || 'system',
      type,
      timestamp: new Date(),
      data,
    };

    this.emit('orchestrator_event', event);

    if (this.config.enableAuditLogging) {
      // TODO: Integrate with logging system
      console.log(`[${type}]`, event);
    }
  }

  /**
   * Setup event handling
   */
  private setupEventHandling(): void {
    // Handle process termination
    process.on('SIGINT', () => {
      this.cleanup();
    });

    process.on('SIGTERM', () => {
      this.cleanup();
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.activeSessions.clear();
    this.emitEvent('session_ended', { reason: 'shutdown' });
  }

  /**
   * Wrap errors with orchestrator-specific error types
   */
  private wrapError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        return new OrchestratorTimeoutError(this.config.requestTimeoutMs || 30000);
      }
      return new OrchestratorError(error.message, 'INTERNAL_ERROR', error);
    }
    return new OrchestratorError('Unknown orchestrator error', 'UNKNOWN_ERROR', error);
  }

  /**
   * Get current state
   */
  getCurrentState(): OrchestratorState {
    return this.currentState;
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): OrchestratorSession | undefined {
    return this.activeSessions.get(sessionId);
  }
}
