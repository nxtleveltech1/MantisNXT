import { createHash } from 'crypto';
import type {
  AITextResult,
  AIStreamChunk,
  AIUsageMetrics,
} from '@/types/ai';
import {
  AIServiceBase,
  type AIServiceBaseOptions,
  type AIServiceRequestOptions,
  type AIServiceResponse,
  type StreamingResult,
} from './base';
import { PromptManager, type RenderPromptOptions } from './prompts';
import { ResponseProcessor } from './response';

export interface TextGenerationOptions extends AIServiceRequestOptions {
  cache?: boolean;
  cacheKey?: string;
  cacheTtlMs?: number;
}

export interface TemplateGenerationOptions extends TextGenerationOptions, RenderPromptOptions {}

export interface TextGenerationBatchItem {
  prompt: string;
  result: AITextResult;
}

export interface TextGenerationBatchResult {
  results: TextGenerationBatchItem[];
  aggregatedUsage?: AIUsageMetrics;
  usage?: AIUsageMetrics;
}

interface CachedTextResponse {
  expiresAt: number;
  response: AIServiceResponse<AITextResult>;
}

export interface AITextServiceOptions extends AIServiceBaseOptions {
  promptManager?: PromptManager;
  responseProcessor?: ResponseProcessor;
  defaultCacheTtlMs?: number;
}

export class AITextService extends AIServiceBase<TextGenerationOptions> {
  private readonly promptManager: PromptManager;
  private readonly responseProcessor: ResponseProcessor;
  private readonly cache = new Map<string, CachedTextResponse>();
  private readonly defaultCacheTtlMs: number;

  constructor(options?: AITextServiceOptions) {
    super('AITextService', options);
    this.promptManager = options?.promptManager ?? new PromptManager();
    this.responseProcessor = options?.responseProcessor ?? new ResponseProcessor();
    this.defaultCacheTtlMs = options?.defaultCacheTtlMs ?? 5 * 60 * 1000;
  }

  async generateText(prompt: string, options: TextGenerationOptions = {}): Promise<AIServiceResponse<AITextResult>> {
    const cacheKey = options.cache === false ? undefined : options.cacheKey ?? this.buildCacheKey(prompt, options);
    if (cacheKey) {
      const cached = this.getCachedResponse(cacheKey, options);
      if (cached) {
        this.emit('cache-hit', cached);
        return cached;
      }
    }

    const response = await this.executeOperation<AITextResult>(
      'text.generate',
      async ({ service, runtimeOptions }) => service.generateText(prompt, runtimeOptions),
      options,
      { promptHash: this.hashPrompt(prompt) },
    );

    if (response.success && cacheKey) {
      this.setCachedResponse(cacheKey, response, options.cacheTtlMs);
    }

    return response;
  }

  async generateWithTemplate(
    templateId: string,
    variables: Record<string, string | number | boolean>,
    options: TemplateGenerationOptions = {},
  ): Promise<AIServiceResponse<AITextResult>> {
    const rendered = this.promptManager.renderTemplate(templateId, {
      variables,
      context: options.context,
      provider: options.provider,
      variantId: options.variantId,
      sanitize: options.sanitize,
    });

    const metadata = this.mergeMetadata(options.metadata, {
      templateId,
      templateVersion: rendered.version,
      templateVariant: rendered.metadata?.variant,
    });

    const response = await this.generateText(rendered.prompt, {
      ...options,
      metadata,
    });

    this.promptManager.recordPerformance(templateId, {
      success: response.success,
      variantId: rendered.metadata?.variant,
      provider: options.provider,
    });

    return response;
  }

  async generateBatch(
    prompts: string[],
    options: TextGenerationOptions = {},
  ): Promise<AIServiceResponse<TextGenerationBatchResult>> {
    const response = await this.executeOperation<TextGenerationBatchResult>(
      'text.batch',
      async ({ service, runtimeOptions }) => {
        const results: TextGenerationBatchItem[] = [];
        for (const prompt of prompts) {
          const result = await service.generateText(prompt, runtimeOptions);
          results.push({ prompt, result });
        }
        const aggregatedUsage = this.combineUsage(results.map((item) => item.result.usage));
        return { results, aggregatedUsage, usage: aggregatedUsage };
      },
      options,
      { batchSize: prompts.length },
    );

    return response;
  }

  async streamText(
    prompt: string,
    options: TextGenerationOptions = {},
  ): Promise<StreamingResult<AIStreamChunk, { text: string; chunks: number }>> {
    const requestId = options.requestId ?? this.generateRequestId();
    const notifyChannel = options.notifyChannel ?? this.notifyChannel;
    const metadata = this.mergeMetadata(this.defaultMetadata, options.metadata, {
      promptHash: this.hashPrompt(prompt),
      stream: true,
    });
    const startedAt = Date.now();

    this.emit('request', {
      requestId,
      service: this.serviceName,
      operation: 'text.stream',
      metadata,
    });
    await this.notifyEvent('request', {
      requestId,
      service: this.serviceName,
      operation: 'text.stream',
      metadata,
      timestamp: this.getTimestamp(),
    }, notifyChannel);

    const { service, cleanup } = this.createServiceInstance(options, requestId, 'text.stream', notifyChannel, metadata);
    const runtimeOptions = this.buildRuntimeOptions(options);

    try {
      const iterator = await service.streamText(prompt, runtimeOptions);
      const aggregate = { text: '', chunks: 0 };

      return this.createStreamingResult(iterator, {
        requestId,
        operation: 'text.stream',
        service,
        notifyChannel,
        metadata,
        startedAt,
        cleanup,
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
            operation: 'text.stream',
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
        operation: 'text.stream',
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

  clearCache(): void {
    this.cache.clear();
  }

  pruneCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  getPromptManager(): PromptManager {
    return this.promptManager;
  }

  getResponseProcessor(): ResponseProcessor {
    return this.responseProcessor;
  }

  private buildCacheKey(prompt: string, options: TextGenerationOptions): string {
    const hash = this.hashPrompt(prompt);
    const model = options.model ?? 'default';
    const provider = options.provider ?? this.defaultProvider ?? 'auto';
    return `${provider}:${model}:${hash}`;
  }

  private hashPrompt(prompt: string): string {
    return createHash('sha256').update(prompt).digest('hex');
  }

  private getCachedResponse(
    cacheKey: string | undefined,
    options: TextGenerationOptions,
  ): AIServiceResponse<AITextResult> | undefined {
    if (!cacheKey) {
      return undefined;
    }
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return undefined;
    }
    if (cached.expiresAt <= Date.now()) {
      this.cache.delete(cacheKey);
      return undefined;
    }

    const requestId = options.requestId ?? this.generateRequestId();
    return {
      ...cached.response,
      requestId,
      timestamp: this.getTimestamp(),
      metadata: this.mergeMetadata(cached.response.metadata, options.metadata),
      context: this.buildContext(options) ?? cached.response.context,
    };
  }

  private setCachedResponse(
    cacheKey: string,
    response: AIServiceResponse<AITextResult>,
    ttlMs?: number,
  ): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultCacheTtlMs);
    this.cache.set(cacheKey, {
      expiresAt,
      response: { ...response },
    });
  }
}
