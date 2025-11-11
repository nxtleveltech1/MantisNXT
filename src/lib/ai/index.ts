/**
 * AI Module - Multi-provider orchestration for MantisNXT
 * Provides provider selection, configuration utilities, service wrapper, and telemetry hooks.
 */

import type {
  AIProvider,
  AIProviderId,
  AIClient,
  AITextResult,
  AIStreamChunk,
  AIProviderRuntimeOptions,
  AIChatMessage,
  AIChatResult,
  AIEmbeddingInput,
  AIEmbeddingOptions,
  AIEmbeddingResult,
  AIUsageEvent,
  AIProviderHealth} from '@/types/ai';


import {
  getAIConfig as loadAIConfig,
  refreshAIConfig,
  updateAIConfig,
  isAIEnabled,
  getProviderConfig,
  getAvailableProviders,
  getProviderFallbackChain,
  AI_PROVIDER_IDS,
} from './config';
import {
  getProviderClient,
  getProviderHealthStatus,
  getAllProviderHealthStatus,
  onAIUsage,
  removeAIUsageListeners,
} from './providers';

const pickProviderClient = (
  preferred: AIProviderId,
  allowFallback: boolean,
): { client: AIClient; provider: AIProviderId } => {
  const config = loadAIConfig();
  const chain = allowFallback ? getProviderFallbackChain(preferred) : [preferred];
  let lastError: unknown = new Error('No AI providers are configured.');

  for (const providerId of chain) {
    const providerConfig = getProviderConfig(providerId);
    if (!providerConfig.enabled) continue;

    const health = getProviderHealthStatus(providerId);
    const skipUnhealthy =
      config.monitoring.enabled &&
      health.status === 'unhealthy' &&
      !(providerId === preferred && !allowFallback);

    if (skipUnhealthy) {
      continue;
    }

    try {
      const client = getProviderClient(providerId);
      return { client, provider: providerId };
    } catch (error) {
      lastError = error;
      if (!allowFallback) {
        throw error instanceof Error ? error : new Error(String(error));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No AI providers available');
};

const mergeRuntimeOptions = <O extends AIProviderRuntimeOptions | undefined>(
  options: O,
  providerId: AIProviderId,
): O => {
  if (!options) {
    return { provider: providerId } as O;
  }
  return { ...options, provider: providerId };
};

export function createAIClient(provider?: AIProvider): AIClient {
  const config = loadAIConfig();
  const preferred = (provider ?? config.defaultProvider) as AIProviderId;
  return pickProviderClient(preferred, config.enableFallback).client;
}

interface AIServiceOptions {
  provider?: AIProviderId;
  disableFallback?: boolean;
  onUsage?: (event: AIUsageEvent) => void;
}

export class AIService {
  private providerId: AIProviderId;
  private client: AIClient;
  private readonly allowFallback: boolean;
  private unsubscribeUsage?: () => void;

  constructor(providerOrOptions?: AIProviderId | Partial<AIServiceOptions>, maybeOptions?: Partial<AIServiceOptions>) {
    let resolvedProvider: AIProviderId | undefined;
    let options: Partial<AIServiceOptions> | undefined;

    if (typeof providerOrOptions === 'string') {
      resolvedProvider = providerOrOptions;
      options = maybeOptions;
    } else {
      options = providerOrOptions;
      if (maybeOptions) {
        options = { ...(options ?? {}), ...maybeOptions };
      }
    }

    const config = loadAIConfig();
    this.allowFallback = !(options && options.disableFallback === true) && config.enableFallback;

    const targetProvider = options?.provider ?? resolvedProvider ?? config.defaultProvider;
    const selection = pickProviderClient(targetProvider, this.allowFallback);

    this.providerId = selection.provider;
    this.client = selection.client;

    if (options && typeof options.onUsage === 'function') {
      this.unsubscribeUsage = onAIUsage(options.onUsage);
    }
  }

  get currentProvider(): AIProviderId {
    return this.providerId;
  }

  switchProvider(provider: AIProviderId, allowFallback: boolean = this.allowFallback): void {
    const selection = pickProviderClient(provider, allowFallback);
    this.providerId = selection.provider;
    this.client = selection.client;
  }

  async generateText(prompt: string, options?: AIProviderRuntimeOptions): Promise<AITextResult> {
    return this.executeWithFallback(options, (client, providerId, runtimeOptions) =>
      client.generateText(prompt, runtimeOptions ?? { provider: providerId }),
    );
  }

  async streamText(prompt: string, options?: AIProviderRuntimeOptions): Promise<AsyncIterable<AIStreamChunk>> {
    return this.executeWithFallback(options, async (client, providerId, runtimeOptions) => {
      if (!client.streamText) {
        throw new Error('Provider ' + providerId + ' does not support streaming.');
      }
      return client.streamText(prompt, runtimeOptions ?? { provider: providerId });
    });
  }

  async chat(messages: AIChatMessage[], options?: AIProviderRuntimeOptions): Promise<AIChatResult> {
    return this.executeWithFallback(options, (client, providerId, runtimeOptions) =>
      client.chat(messages, runtimeOptions ?? { provider: providerId }),
    );
  }

  async embed(input: AIEmbeddingInput, options?: AIEmbeddingOptions): Promise<AIEmbeddingResult> {
    return this.executeWithFallback(options, (client, providerId, runtimeOptions) =>
      client.embed(input, (runtimeOptions as AIEmbeddingOptions | undefined) ?? { provider: providerId }),
    );
  }

  getProviderHealth(): AIProviderHealth[] {
    return getAllProviderHealthStatus();
  }

  dispose(): void {
    if (this.unsubscribeUsage) {
      this.unsubscribeUsage();
      this.unsubscribeUsage = undefined;
    }
  }

  private async executeWithFallback<O extends AIProviderRuntimeOptions | undefined, R>(
    options: O,
    executor: (client: AIClient, providerId: AIProviderId, runtimeOptions: O) => Promise<R>,
  ): Promise<R> {
    const config = loadAIConfig();
    const preferred = (options?.provider ?? this.providerId) as AIProviderId;
    const allowFallback = this.allowFallback && (!options?.provider || options.provider === this.providerId);
    const chain = allowFallback ? getProviderFallbackChain(preferred) : [preferred];
    let lastError: unknown;

    for (const providerId of chain) {
      const providerConfig = getProviderConfig(providerId);
      if (!providerConfig.enabled) continue;

      const health = getProviderHealthStatus(providerId);
      const skipUnhealthy =
        config.monitoring.enabled &&
        health.status === 'unhealthy' &&
        !(providerId === preferred && !allowFallback);

      if (skipUnhealthy) {
        continue;
      }

      try {
        const client = providerId === this.providerId ? this.client : getProviderClient(providerId);
        const runtimeOptions = mergeRuntimeOptions(options, providerId);
        const result = await executor(client, providerId, runtimeOptions as O);
        this.providerId = providerId;
        this.client = client;
        return result;
      } catch (error) {
        lastError = error;
        if (!allowFallback) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error('AI provider request failed');
  }
}

export const getAIConfig = loadAIConfig;
export { refreshAIConfig, updateAIConfig, isAIEnabled, getProviderConfig, getAvailableProviders, getProviderFallbackChain };
export { getProviderHealthStatus, getAllProviderHealthStatus, onAIUsage, removeAIUsageListeners };

export const AI_CONSTANTS = {
  SUPPORTED_PROVIDERS: AI_PROVIDER_IDS as readonly AIProviderId[],
};

export type {
  AIProvider,
  AIProviderId,
  AIConfig,
  AIClient,
  AITextResult,
  AIStreamChunk,
  AIProviderRuntimeOptions,
  AIChatMessage,
  AIChatResult,
  AIEmbeddingInput,
  AIEmbeddingOptions,
  AIEmbeddingResult,
  AIUsageEvent,
  AIUsageMetrics,
  AIProviderHealth,
} from '@/types/ai';
