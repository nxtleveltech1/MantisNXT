// @ts-nocheck
import { EventEmitter } from 'events';
import type { ApiResponse } from '@/lib/api/base';
import { db } from '@/lib/database';
import type {
  AIProviderId,
  AIProviderRuntimeOptions,
  AIUsageMetrics,
  AIUsageEvent,
  AIProviderHealth,
  AIConfig,
} from '@/types/ai';
import {
  AIService,
  getAIConfig,
  refreshAIConfig,
  updateAIConfig,
  getProviderHealthStatus,
  getAllProviderHealthStatus,
} from '../index';

export interface AIServiceBaseOptions {
  defaultProvider?: AIProviderId;
  disableFallback?: boolean;
  notifyChannel?: string;
  tags?: string[];
  defaultMetadata?: Record<string, unknown>;
  enableNotifications?: boolean;
}

export interface AIServiceRequestOptions extends AIProviderRuntimeOptions {
  requestId?: string;
  notifyChannel?: string;
  disableFallback?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
  rethrowOnError?: boolean;
}

export interface AIServiceResponse<T> extends ApiResponse<T> {
  provider: AIProviderId;
  model?: string;
  usage?: AIUsageMetrics;
  service: string;
  operation: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface AIUsageEventEnvelope extends AIUsageEvent {
  requestId: string;
  operation: string;
  service: string;
  metadata?: Record<string, unknown>;
}

export interface StreamingResult<TChunk, TResult> extends AsyncIterable<TChunk> {
  summary: Promise<AIServiceResponse<TResult>>;
}

interface StreamingContext<TChunk, TResult> {
  requestId: string;
  operation: string;
  service: AIService;
  notifyChannel: string;
  metadata?: Record<string, unknown>;
  startedAt: number;
  cleanup: () => void;
  aggregate?: {
    onChunk?: (chunk: TChunk) => void;
    onComplete?: () => TResult | undefined;
    onError?: (error: unknown) => TResult | undefined;
  };
  customResponse?: (params: {
    data: TResult | undefined;
    provider: AIProviderId;
    durationMs: number;
    metadata?: Record<string, unknown>;
  }) => AIServiceResponse<TResult>;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

export class AIServiceBase<
  TOptions extends AIServiceRequestOptions = AIServiceRequestOptions,
> extends EventEmitter {
  protected readonly serviceName: string;
  protected readonly defaultProvider?: AIProviderId;
  protected readonly defaultDisableFallback?: boolean;
  protected readonly notifyChannel: string;
  protected readonly defaultMetadata: Record<string, unknown>;
  protected readonly tags: string[];
  protected readonly notificationsEnabled: boolean;

  constructor(serviceName: string, options?: AIServiceBaseOptions) {
    super();
    this.serviceName = serviceName;
    this.defaultProvider = options?.defaultProvider;
    this.defaultDisableFallback = options?.disableFallback;
    this.notifyChannel = options?.notifyChannel ?? 'ai_events';
    this.defaultMetadata = { ...(options?.defaultMetadata ?? {}) };
    this.tags = options?.tags ?? [];
    this.notificationsEnabled = options?.enableNotifications !== false;
  }

  protected async executeOperation<T>(
    operation: string,
    executor: (context: {
      service: AIService;
      runtimeOptions?: AIProviderRuntimeOptions;
    }) => Promise<T>,
    options?: TOptions,
    eventMetadata?: Record<string, unknown>
  ): Promise<AIServiceResponse<T>> {
    const requestId = options?.requestId ?? this.generateRequestId();
    const notifyChannel = options?.notifyChannel ?? this.notifyChannel;
    const metadata = this.mergeMetadata(this.defaultMetadata, options?.metadata, eventMetadata);
    const startedAt = Date.now();

    this.emit('request', {
      requestId,
      service: this.serviceName,
      operation,
      metadata,
    });
    await this.notifyEvent(
      'request',
      {
        requestId,
        service: this.serviceName,
        operation,
        metadata,
        timestamp: this.getTimestamp(),
      },
      notifyChannel
    );

    const { service, cleanup } = this.createServiceInstance(
      options,
      requestId,
      operation,
      notifyChannel,
      metadata
    );
    const runtimeOptions = this.buildRuntimeOptions(options);

    try {
      const data = await executor({ service, runtimeOptions });
      const provider = this.resolveProvider(data, service);
      const model = this.resolveModel(data, runtimeOptions);
      const usage = this.resolveUsage(data);
      const durationMs = Date.now() - startedAt;
      const response = this.buildSuccessResponse({
        data,
        provider,
        model,
        usage,
        requestId,
        operation,
        durationMs,
        metadata,
        context: this.buildContext(options),
      });

      this.emit('response', response);
      await this.notifyEvent('response', response, notifyChannel);

      return response;
    } catch (error) {
      const provider = this.resolveProvider(undefined, service);
      const durationMs = Date.now() - startedAt;
      const response = this.buildErrorResponse<T>({
        error,
        provider,
        requestId,
        operation,
        durationMs,
        metadata,
        context: this.buildContext(options),
      });

      this.emit('error', { ...response, error: response.error });
      await this.notifyEvent('error', response, notifyChannel);

      if (options?.rethrowOnError) {
        cleanup();
        throw error;
      }

      return response;
    } finally {
      cleanup();
    }
  }

  protected createStreamingResult<TChunk, TResult>(
    iterator: AsyncIterable<TChunk>,
    context: StreamingContext<TChunk, TResult>
  ): StreamingResult<TChunk, TResult> {
    const deferred = this.createDeferred<AIServiceResponse<TResult>>();
    const self = this;

    const asyncIterable: StreamingResult<TChunk, TResult> = {
      summary: deferred.promise,
      [Symbol.asyncIterator]() {
        const inner = iterator[Symbol.asyncIterator]();
        let finished = false;
        return {
          async next() {
            if (finished) {
              return { done: true, value: undefined as unknown as TChunk };
            }

            try {
              const result = await inner.next();
              if (!result.done) {
                context.aggregate?.onChunk?.(result.value);
                const provider = self.resolveProvider(result.value, context.service);
                const payload = {
                  requestId: context.requestId,
                  service: self.serviceName,
                  operation: context.operation,
                  chunk: result.value,
                  provider,
                  metadata: context.metadata,
                  timestamp: self.getTimestamp(),
                };
                self.emit('stream', payload);
                void self.notifyEvent('stream', payload, context.notifyChannel);
                return result;
              }

              finished = true;
              const durationMs = Date.now() - context.startedAt;
              const provider = self.resolveProvider(undefined, context.service);
              const data = context.aggregate?.onComplete?.();
              const response = context.customResponse
                ? context.customResponse({ data, provider, durationMs, metadata: context.metadata })
                : self.buildSuccessResponse({
                    data,
                    provider,
                    requestId: context.requestId,
                    operation: context.operation,
                    durationMs,
                    metadata: context.metadata,
                  });

              self.emit('response', response);
              void self.notifyEvent('response', response, context.notifyChannel);
              deferred.resolve(response);
              context.cleanup();
              return { done: true, value: undefined as unknown as TChunk };
            } catch (error) {
              finished = true;
              const durationMs = Date.now() - context.startedAt;
              const provider = self.resolveProvider(undefined, context.service);
              const data = context.aggregate?.onError?.(error);
              const response = self.buildErrorResponse<TResult>({
                error,
                provider,
                requestId: context.requestId,
                operation: context.operation,
                durationMs,
                metadata: context.metadata,
              });
              if (data !== undefined && response.success) {
                response.data = data;
              }
              self.emit('error', { ...response, error: response.error });
              void self.notifyEvent('error', response, context.notifyChannel);
              deferred.resolve(response);
              context.cleanup();
              throw error;
            }
          },
          async return(value?: unknown) {
            context.cleanup();
            if (typeof inner.return === 'function') {
              await inner.return(value);
            }
            return { done: true, value };
          },
        };
      },
    };

    return asyncIterable;
  }

  getConfig(): AIConfig {
    return getAIConfig();
  }

  refreshConfig(): AIConfig {
    return refreshAIConfig();
  }

  updateConfig(partial: Partial<AIConfig>): AIConfig {
    return updateAIConfig(partial);
  }

  getProviderHealth(provider: AIProviderId): AIProviderHealth {
    return getProviderHealthStatus(provider);
  }

  getAllProviderHealth(): AIProviderHealth[] {
    return getAllProviderHealthStatus();
  }

  protected buildRuntimeOptions(options?: TOptions): AIProviderRuntimeOptions | undefined {
    if (!options) {
      return undefined;
    }

    const {
      provider: _provider,
      requestId: _requestId,
      notifyChannel: _notifyChannel,
      disableFallback: _disableFallback,
      tags: _tags,
      rethrowOnError: _rethrowOnError,
      ...runtime
    } = options;
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(runtime)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return Object.keys(cleaned).length > 0 ? (cleaned as AIProviderRuntimeOptions) : undefined;
  }

  protected createServiceInstance(
    options: TOptions | undefined,
    requestId: string,
    operation: string,
    notifyChannel: string,
    metadata?: Record<string, unknown>
  ): { service: AIService; cleanup: () => void } {
    const provider = options?.provider ?? this.defaultProvider;
    const disableFallback = options?.disableFallback ?? this.defaultDisableFallback;

    const serviceOptions: Record<string, unknown> = {};
    if (provider) {
      serviceOptions.provider = provider;
    }
    if (typeof disableFallback === 'boolean') {
      serviceOptions.disableFallback = disableFallback;
    }

    serviceOptions.onUsage = (event: AIUsageEvent) => {
      this.handleUsage(event, requestId, operation, notifyChannel, metadata);
    };

    const service = new AIService(serviceOptions);
    return {
      service,
      cleanup: () => service.dispose(),
    };
  }

  protected handleUsage(
    event: AIUsageEvent,
    requestId: string,
    operation: string,
    notifyChannel: string,
    metadata?: Record<string, unknown>
  ): void {
    const payload: AIUsageEventEnvelope = {
      ...event,
      requestId,
      operation,
      service: this.serviceName,
      metadata,
    };
    this.emit('usage', payload);
    void this.notifyEvent('usage', payload, notifyChannel);
  }

  protected resolveProvider(result: unknown, service: AIService): AIProviderId {
    if (result && typeof result === 'object' && 'provider' in result) {
      return (result as unknown).provider as AIProviderId;
    }
    return service.currentProvider;
  }

  protected resolveModel(result: unknown, runtime?: AIProviderRuntimeOptions): string | undefined {
    if (!result) {
      return runtime?.model;
    }

    if (typeof result === 'object') {
      if ('model' in result && typeof (result as unknown).model === 'string') {
        return (result as unknown).model;
      }
      if ('results' in result && Array.isArray((result as unknown).results)) {
        const [first] = (result as unknown).results;
        if (first && typeof first === 'object' && 'model' in first) {
          return first.model;
        }
      }
    }

    if (Array.isArray(result)) {
      const [first] = result;
      if (first && typeof first === 'object' && 'model' in first) {
        return (first as unknown).model;
      }
    }

    return runtime?.model;
  }

  protected resolveUsage(result: unknown): AIUsageMetrics | undefined {
    if (!result) {
      return undefined;
    }

    if (typeof result === 'object') {
      if ('usage' in result && (result as unknown).usage) {
        return (result as unknown).usage as AIUsageMetrics;
      }
      if ('results' in result && Array.isArray((result as unknown).results)) {
        return this.combineUsage(
          ((result as unknown).results as unknown[]).map(
            item => item?.usage as AIUsageMetrics | undefined
          )
        );
      }
    }

    if (Array.isArray(result)) {
      return this.combineUsage(
        result.map(item => (item as unknown)?.usage as AIUsageMetrics | undefined)
      );
    }

    return undefined;
  }

  protected combineUsage(usages: Array<AIUsageMetrics | undefined>): AIUsageMetrics | undefined {
    const filtered = usages.filter((usage): usage is AIUsageMetrics => Boolean(usage));
    if (filtered.length === 0) {
      return undefined;
    }
    const base = { ...filtered[0] };
    for (let index = 1; index < filtered.length; index += 1) {
      const current = filtered[index];
      if (!current) continue;
      base.promptTokens = (base.promptTokens ?? 0) + (current.promptTokens ?? 0);
      base.completionTokens = (base.completionTokens ?? 0) + (current.completionTokens ?? 0);
      base.totalTokens = (base.totalTokens ?? 0) + (current.totalTokens ?? 0);
      base.durationMs = (base.durationMs ?? 0) + (current.durationMs ?? 0);
    }
    return base;
  }

  protected buildSuccessResponse<T>(params: {
    data: T;
    provider: AIProviderId;
    model?: string;
    usage?: AIUsageMetrics;
    requestId: string;
    operation: string;
    durationMs: number;
    metadata?: Record<string, unknown>;
    context?: Record<string, unknown>;
  }): AIServiceResponse<T> {
    return {
      success: true,
      data: params.data,
      provider: params.provider,
      model: params.model,
      usage: params.usage,
      service: this.serviceName,
      operation: params.operation,
      durationMs: params.durationMs,
      timestamp: this.getTimestamp(),
      requestId: params.requestId,
      metadata: params.metadata,
      context: params.context,
    };
  }

  protected buildErrorResponse<T>(params: {
    error: unknown;
    provider: AIProviderId;
    requestId: string;
    operation: string;
    durationMs: number;
    metadata?: Record<string, unknown>;
    context?: Record<string, unknown>;
  }): AIServiceResponse<T> {
    const message =
      params.error instanceof Error
        ? params.error.message
        : String(params.error ?? 'Unknown error');
    return {
      success: false,
      error: message,
      data: undefined,
      provider: params.provider,
      service: this.serviceName,
      operation: params.operation,
      durationMs: params.durationMs,
      timestamp: this.getTimestamp(),
      requestId: params.requestId,
      metadata: params.metadata,
      context: params.context,
    };
  }

  protected buildContext(options?: TOptions): Record<string, unknown> | undefined {
    if (!options?.tags && this.tags.length === 0) {
      return undefined;
    }
    const tags = [...this.tags, ...(options?.tags ?? [])];
    return tags.length > 0 ? { tags: Array.from(new Set(tags)) } : undefined;
  }

  protected async notifyEvent(event: string, payload: unknown, channel: string): Promise<void> {
    if (!this.notificationsEnabled) {
      return;
    }

    try {
      const enriched = {
        event,
        service: this.serviceName,
        payload,
      };
      const serialized = JSON.stringify(enriched).replace(/'/g, "''");
      const safeChannel = channel.replace(/[^a-zA-Z0-9_]/g, '');
      const targetChannel = safeChannel.length > 0 ? safeChannel : this.notifyChannel;
      await db.query(`NOTIFY ${targetChannel}, '${serialized}'`);
    } catch (error) {
      console.error('AIServiceBase notification error:', error);
    }
  }

  protected mergeMetadata(
    ...sources: Array<Record<string, unknown> | undefined>
  ): Record<string, unknown> | undefined {
    const merged: Record<string, unknown> = {};
    for (const source of sources) {
      if (source && typeof source === 'object') {
        Object.assign(merged, source);
      }
    }
    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  protected generateRequestId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  protected getTimestamp(): string {
    return new Date().toISOString();
  }

  private createDeferred<T>(): Deferred<T> {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return {
      promise,
      resolve: (value: T) => resolve(value),
      reject,
    };
  }
}
