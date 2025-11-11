// @ts-nocheck
import { createHash } from 'crypto';
import type {
  AIChatMessage,
  AIChatResult,
  AIStreamChunk,
} from '@/types/ai';
import {
  AIServiceBase,
  type AIServiceBaseOptions,
  type AIServiceRequestOptions,
  type AIServiceResponse,
  type StreamingResult,
} from './base';
import { PromptManager, type RenderPromptOptions } from './prompts';

export interface ChatRequestOptions extends AIServiceRequestOptions {
  conversationId?: string;
  persistHistory?: boolean;
  maxHistory?: number;
}

export interface ConversationOptions extends RenderPromptOptions {
  id?: string;
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
  initialMessages?: AIChatMessage[];
  maxHistory?: number;
}

interface ConversationState {
  id: string;
  messages: AIChatMessage[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  maxHistory: number;
}

export interface AIChatServiceOptions extends AIServiceBaseOptions {
  promptManager?: PromptManager;
  defaultMaxHistory?: number;
}

export class AIChatService extends AIServiceBase<ChatRequestOptions> {
  private readonly promptManager: PromptManager;
  private readonly conversations = new Map<string, ConversationState>();
  private readonly defaultMaxHistory: number;

  constructor(options?: AIChatServiceOptions) {
    super('AIChatService', options);
    this.promptManager = options?.promptManager ?? new PromptManager();
    this.defaultMaxHistory = options?.defaultMaxHistory ?? 50;
  }

  createConversation(options: ConversationOptions = {}): ConversationState {
    const id = options.id ?? this.generateConversationId(options.systemPrompt ?? 'conversation');
    const now = new Date().toISOString();
    const messages: AIChatMessage[] = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    if (options.templateId) {
      const rendered = this.promptManager.renderTemplate(options.templateId, options);
      messages.push({ role: 'system', content: rendered.prompt });
    }

    if (options.initialMessages) {
      messages.push(...options.initialMessages);
    }

    const state: ConversationState = {
      id,
      messages: this.trimHistory(messages, options.maxHistory ?? this.defaultMaxHistory),
      metadata: { ...(options.metadata ?? {}) },
      createdAt: now,
      updatedAt: now,
      maxHistory: options.maxHistory ?? this.defaultMaxHistory,
    };

    this.conversations.set(id, state);
    return this.cloneConversation(state);
  }

  async chat(
    messages: AIChatMessage[],
    options: ChatRequestOptions = {},
  ): Promise<AIServiceResponse<AIChatResult>> {
    const conversationId = options.conversationId;
    const metadata = this.mergeMetadata(options.metadata, conversationId ? { conversationId } : undefined);

    const response = await this.executeOperation<AIChatResult>(
      'chat.message',
      async ({ service, runtimeOptions }) => service.chat(messages, runtimeOptions),
      { ...options, metadata },
      conversationId ? { conversationId } : undefined,
    );

    if (response.success && response.data && conversationId) {
      this.appendAssistantResponse(conversationId, messages, response.data);
    }

    return response;
  }

  async continueConversation(
    conversationId: string,
    message: AIChatMessage,
    options: ChatRequestOptions = {},
  ): Promise<AIServiceResponse<AIChatResult>> {
    const conversation = this.requireConversation(conversationId);
    const history = [...conversation.messages, message];
    const response = await this.chat(history, {
      ...options,
      conversationId,
    });
    if (response.success && response.data) {
      this.appendAssistantResponse(conversationId, [message], response.data);
    }
    return response;
  }

  getConversationHistory(conversationId: string): ConversationState {
    return this.cloneConversation(this.requireConversation(conversationId));
  }

  closeConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  async streamChat(
    conversationId: string,
    userMessage: AIChatMessage,
    options: ChatRequestOptions = {},
  ): Promise<StreamingResult<AIStreamChunk, { text: string; chunks: number }>> {
    const conversation = this.requireConversation(conversationId);
    const history = [...conversation.messages, userMessage];
    const prompt = this.serializeMessages(history);

    const requestId = options.requestId ?? this.generateRequestId();
    const notifyChannel = options.notifyChannel ?? this.notifyChannel;
    const metadata = this.mergeMetadata(this.defaultMetadata, options.metadata, {
      conversationId,
      stream: true,
      promptHash: this.hashPrompt(prompt),
    });
    const startedAt = Date.now();

    this.emit('request', {
      requestId,
      service: this.serviceName,
      operation: 'chat.stream',
      metadata,
    });
    await this.notifyEvent('request', {
      requestId,
      service: this.serviceName,
      operation: 'chat.stream',
      metadata,
      timestamp: this.getTimestamp(),
    }, notifyChannel);

    const { service, cleanup } = this.createServiceInstance(options, requestId, 'chat.stream', notifyChannel, metadata);
    const runtimeOptions = this.buildRuntimeOptions(options);

    try {
      const iterator = await service.streamText(prompt, runtimeOptions);
      const aggregate = { text: '', chunks: 0 };

      return this.createStreamingResult(iterator, {
        requestId,
        operation: 'chat.stream',
        service,
        notifyChannel,
        metadata,
        startedAt,
        cleanup: () => {
          cleanup();
          if (aggregate.text) {
            this.appendAssistantResponse(conversationId, [userMessage], {
              text: aggregate.text,
              provider: service.currentProvider,
            } as AIChatResult);
          }
        },
        aggregate: {
          onChunk: (chunk) => {
            aggregate.chunks += 1;
            if (chunk.token) {
              aggregate.text += chunk.token;
            }
          },
          onComplete: () => aggregate,
        },
        customResponse: ({ data, provider, durationMs }) =>
          this.buildSuccessResponse({
            data: data ?? aggregate,
            provider,
            model: runtimeOptions?.model,
            usage: undefined,
            requestId,
            operation: 'chat.stream',
            durationMs,
            metadata,
          }),
      });
    } catch (error) {
      cleanup();
      const durationMs = Date.now() - startedAt;
      const response = this.buildErrorResponse<{ text: string; chunks: number }>({
        error,
        provider: service.currentProvider,
        requestId,
        operation: 'chat.stream',
        durationMs,
        metadata,
      });
      this.emit('error', { ...response, error: response.error });
      await this.notifyEvent('error', response, notifyChannel);

      const failed: StreamingResult<AIStreamChunk, { text: string; chunks: number }> = {
        summary: Promise.resolve(response),
        async *[Symbol.asyncIterator]() {
          throw error;
        },
      };
      return failed;
    }
  }

  private appendAssistantResponse(
    conversationId: string,
    userMessages: AIChatMessage[],
    result: AIChatResult,
  ): void {
    const conversation = this.requireConversation(conversationId);
    conversation.messages.push(...userMessages);

    const assistantMessage: AIChatMessage = result.messages?.find((message) => message.role === 'assistant') ?? {
      role: 'assistant',
      content: result.text,
    };

    conversation.messages.push(assistantMessage);
    conversation.messages = this.trimHistory(conversation.messages, conversation.maxHistory);
    conversation.updatedAt = new Date().toISOString();
    this.conversations.set(conversationId, conversation);
  }

  private requirementError(id: string): never {
    throw new Error(`Conversation '${id}' not found.`);
  }

  private requireConversation(conversationId: string): ConversationState {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      this.requirementError(conversationId);
    }
    return conversation!;
  }

  private trimHistory(messages: AIChatMessage[], maxHistory: number): AIChatMessage[] {
    if (messages.length <= maxHistory) {
      return [...messages];
    }
    return messages.slice(messages.length - maxHistory);
  }

  private cloneConversation(conversation: ConversationState): ConversationState {
    return {
      id: conversation.id,
      messages: conversation.messages.map((message) => ({ ...message })),
      metadata: { ...conversation.metadata },
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      maxHistory: conversation.maxHistory,
    };
  }

  private serializeMessages(messages: AIChatMessage[]): string {
    return messages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join('\n');
  }

  private generateConversationId(seed: string): string {
    const hash = createHash('md5').update(`${seed}-${Date.now()}-${Math.random()}`).digest('hex');
    return `conv_${hash.slice(0, 12)}`;
  }

  private hashPrompt(prompt: string): string {
    return createHash('sha256').update(prompt).digest('hex');
  }
}
