// @ts-nocheck
import { generateText, streamText, embed, embedMany, type ModelMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGateway } from '@ai-sdk/gateway';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createVertex } from '@ai-sdk/google-vertex';
import type {
  AIClient,
  AIProviderId,
  AIProviderConfig,
  AITextResult,
  AIStreamChunk,
  AIProviderRuntimeOptions,
  AIChatMessage,
  AIChatResult,
  AIEmbeddingInput,
  AIEmbeddingOptions,
  AIEmbeddingResult,
  AIProviderHealth,
  AIUsageEvent,
  AIUsageMetrics,
} from '@/types/ai';
import {
  AI_PROVIDER_IDS,
  getAIConfig,
  getProviderConfig,
  getProviderFallbackChain,
  onAIConfigChange,
} from './config';
import { CLIProviderClient, CLIProviderExecutor } from './cli-provider';

interface ProviderBinding {
  id: AIProviderId;
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
  languageModel: (modelId: string) => unknown;
  embeddingModel?: (modelId: string) => unknown;
  raw: unknown;
}

type UsageListener = (event: AIUsageEvent) => void;

const providerClientCache = new Map<AIProviderId, ProviderClient>();
const usageListeners = new Set<UsageListener>();
const isServerRuntime = typeof window === 'undefined';

const createInitialHealth = (id: AIProviderId): AIProviderHealth => ({
  id,
  status: 'healthy',
  lastChecked: Date.now(),
  consecutiveFailures: 0,
});

const providerHealthState: Record<AIProviderId, AIProviderHealth> = AI_PROVIDER_IDS.reduce(
  (acc, id) => {
    acc[id] = createInitialHealth(id);
    return acc;
  },
  {} as Record<AIProviderId, AIProviderHealth>
);

const getProviderEnablementHint = (config: AIProviderConfig): string => {
  switch (config.id) {
    case 'openai':
      return 'Set OPENAI_API_KEY or OPENAI_API_KEY_FILE to enable the OpenAI provider.';
    case 'anthropic':
      return 'Set ANTHROPIC_API_KEY or ANTHROPIC_API_KEY_FILE to enable the Anthropic provider.';
    case 'vercel':
      return 'Set VERCEL_AI_GATEWAY_TOKEN (or _FILE) and VERCEL_AI_GATEWAY_URL to enable the Vercel AI Gateway provider.';
    case 'openai-compatible':
      return 'Set both OPENAI_COMPATIBLE_API_KEY (or _FILE) and OPENAI_COMPATIBLE_BASE_URL to enable the OpenAI compatible provider.';
    case 'google':
      if (config.credentials.useVertexAI) {
        return 'Set GOOGLE_GENAI_USE_VERTEXAI=true, GOOGLE_CLOUD_PROJECT, and optionally GOOGLE_CLOUD_LOCATION to enable Google Vertex AI.';
      } else {
        return 'Set GEMINI_API_KEY or GOOGLE_API_KEY (or _FILE) to enable Google Gemini (Developer API).';
      }
    case 'firecrawl':
      return 'Set FIRECRAWL_API_KEY (or _FILE) to enable the Firecrawl web scraping service. Note: Firecrawl is NOT an LLM provider - it is a web scraping service. Use FirecrawlService for scraping operations.';
    default:
      return 'Configure valid credentials for this provider.';
  }
};

const coerceAnnotations = (
  metadata?: Record<string, unknown>
): Record<string, string | number | boolean> | undefined => {
  if (!metadata) return undefined;
  const annotations: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      annotations[key] = value;
    }
  }
  return Object.keys(annotations).length > 0 ? annotations : undefined;
};

const normalizeMessageContent = (content: unknown): string => {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(part => normalizeMessageContent(part)).join('');
  }
  if (typeof content === 'object') {
    if (typeof content.text === 'string') return content.text;
    if (typeof content.content === 'string') return content.content;
    return JSON.stringify(content);
  }
  return String(content);
};

const mapResponseMessages = (messages: unknown[] | undefined): AIChatMessage[] | undefined => {
  if (!messages || messages.length === 0) return undefined;
  return messages.map(message => ({
    role: (message.role ?? 'assistant') as AIChatMessage['role'],
    content: normalizeMessageContent(message.content),
    name: message.name,
    metadata: {
      id: message.id,
      type: message.type,
    },
  }));
};

const createAbortSignal = (
  timeoutMs: number | undefined,
  externalSignal?: AbortSignal
): { signal?: AbortSignal; cleanup?: () => void } => {
  const hasTimeout = typeof timeoutMs === 'number' && timeoutMs > 0;
  if (!hasTimeout || typeof AbortController === 'undefined') {
    return { signal: externalSignal, cleanup: undefined };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort(new Error(`AI provider request exceeded ${timeoutMs}ms`));
    }
  }, timeoutMs);

  const abortFromExternal = () => {
    if (!controller.signal.aborted) {
      const reason = (externalSignal as unknown)?.reason;
      controller.abort(reason ?? new Error('AI request aborted by caller'));
    }
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternal();
    } else {
      externalSignal.addEventListener('abort', abortFromExternal);
    }
  }

  const cleanup = () => {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', abortFromExternal);
    }
  };

  return { signal: controller.signal, cleanup };
};
interface HealthCheckRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
}

const appendPathSegment = (base: string, path: string): string => {
  const normalizedBase = base.replace(/[/\\]+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedBase + normalizedPath;
};

const buildHealthCheckRequest = (config: AIProviderConfig): HealthCheckRequest | null => {
  switch (config.id) {
    case 'openai': {
      const apiKey = config.credentials.apiKey;
      if (!apiKey) return null;
      const base = config.credentials.baseUrl ?? 'https://api.openai.com/v1';
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
      };
      if (config.credentials.organization) {
        headers['OpenAI-Organization'] = config.credentials.organization;
      }
      if (config.credentials.project) {
        headers['OpenAI-Project'] = config.credentials.project;
      }
      return {
        url: appendPathSegment(base, '/models'),
        headers,
      };
    }
    case 'anthropic': {
      const apiKey = config.credentials.apiKey;
      if (!apiKey) return null;
      const base = config.credentials.baseUrl ?? 'https://api.anthropic.com/v1';
      return {
        url: appendPathSegment(base, '/models'),
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      };
    }
    case 'vercel': {
      const token = config.credentials.authToken ?? config.credentials.apiKey;
      const base = config.credentials.baseUrl;
      if (!token || !base) return null;
      return {
        url: appendPathSegment(base, '/models'),
        headers: { Authorization: `Bearer ${token}` },
      };
    }
    case 'openai-compatible': {
      const apiKey = config.credentials.apiKey;
      const base = config.credentials.baseUrl;
      if (!apiKey || !base) return null;
      return {
        url: appendPathSegment(base, '/models'),
        headers: { Authorization: `Bearer ${apiKey}` },
      };
    }
    case 'google': {
      if (config.credentials.useVertexAI) {
        // Vertex AI health check
        const project = config.credentials.project;
        const location = config.credentials.location || 'us-central1';
        if (!project) return null;
        return {
          url: `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/models`,
          headers: {
            'Content-Type': 'application/json',
          },
        };
      } else {
        // Developer API health check
        const apiKey = config.credentials.apiKey;
        if (!apiKey) return null;
        return {
          url: 'https://generativelanguage.googleapis.com/v1beta/models',
          headers: {
            'x-goog-api-key': apiKey,
          },
        };
      }
    }
    default:
      return null;
  }
};

const shouldEmitUsage = (): boolean => {
  const analytics = getAIConfig().analytics;
  if (!analytics.enabled) return false;
  if (analytics.sampleRate >= 1) return true;
  return Math.random() < analytics.sampleRate;
};

const emitUsage = (event: AIUsageEvent): void => {
  const analytics = getAIConfig().analytics;
  if (!analytics.enabled) return;
  if (!shouldEmitUsage()) return;

  const enriched: AIUsageEvent = {
    ...event,
    annotations: {
      ...(event.annotations ?? {}),
      event: analytics.eventName,
    },
  };

  for (const listener of usageListeners) {
    try {
      listener(enriched);
    } catch (error) {
      console.error('AI usage listener failed', error);
    }
  }
};

const ensureRecoveryWindow = (health: AIProviderHealth): void => {
  const monitoring = getAIConfig().monitoring;
  if (!monitoring.enabled) return;
  const elapsed = Date.now() - health.lastChecked;
  if (health.status === 'unhealthy' && elapsed >= monitoring.recoveryWindowMs) {
    health.status = 'degraded';
    if (health.consecutiveFailures > 0) {
      health.consecutiveFailures -= 1;
    }
  }
  if (health.status === 'degraded' && health.consecutiveFailures === 0) {
    health.status = 'healthy';
  }
};

const markProviderSuccess = (providerId: AIProviderId, durationMs: number): void => {
  const health = providerHealthState[providerId];
  if (!health) return;
  const monitoring = getAIConfig().monitoring;
  health.status = 'healthy';
  health.consecutiveFailures = 0;
  health.lastChecked = Date.now();
  if (monitoring.trackLatency) {
    health.latencyMs = durationMs;
  } else {
    delete health.latencyMs;
  }
  delete health.lastError;
};

const markProviderFailure = (providerId: AIProviderId, error: unknown): void => {
  const health = providerHealthState[providerId];
  if (!health) return;
  const monitoring = getAIConfig().monitoring;
  health.lastChecked = Date.now();
  health.consecutiveFailures += 1;
  health.lastError = error instanceof Error ? error.message : String(error);

  if (!monitoring.enabled) {
    health.status = 'degraded';
    return;
  }

  if (health.consecutiveFailures >= monitoring.unhealthyThreshold) {
    health.status = 'unhealthy';
  } else {
    health.status = 'degraded';
  }
};

const getHealthSnapshot = (providerId: AIProviderId): AIProviderHealth => {
  const health = providerHealthState[providerId] ?? createInitialHealth(providerId);
  ensureRecoveryWindow(health);
  return { ...health };
};

const instantiateProviderBinding = (config: AIProviderConfig): ProviderBinding => {
  if (!config.enabled) {
    throw new Error(`Provider ${config.id} is not enabled. ${getProviderEnablementHint(config)}`);
  }

  switch (config.id) {
    case 'openai':
    case 'openai-compatible': {
      // CLI mode - use OpenAI Codex CLI
      if (config.credentials.useCLI && config.id === 'openai') {
        const cliConfig = {
          provider: config.id,
          command: config.credentials.cliCommand || 'codex',
          args: config.credentials.cliArgs,
          env: {
            ...(config.credentials.apiKey && { OPENAI_API_KEY: config.credentials.apiKey }),
            ...(config.credentials.organization && {
              OPENAI_ORGANIZATION: config.credentials.organization,
            }),
          },
          workingDirectory: config.credentials.cliWorkingDirectory,
          timeout: 60000,
        };

        const cliClient = new CLIProviderClient(cliConfig);
        const capabilities = CLIProviderExecutor.getProviderCapabilities(config.id);

        return {
          id: config.id,
          supportsStreaming: capabilities.supportsStreaming,
          supportsEmbeddings: capabilities.supportsEmbeddings,
          languageModel: (modelId: string) => {
            // Return a wrapper that uses CLI for generation
            return {
              provider: 'openai-cli',
              modelId,
              execute: async (prompt: string) => {
                const result = await cliClient.generateText(prompt, { model: modelId });
                return { text: result };
              },
            };
          },
          raw: cliClient,
        };
      }

      // API mode
      const openai = createOpenAI({
        apiKey: config.credentials.apiKey,
        baseURL: config.credentials.baseUrl,
        organization: config.credentials.organization,
        project: config.credentials.project,
        name: config.id === 'openai-compatible' ? 'openai-compatible' : undefined,
      });

      return {
        id: config.id,
        supportsStreaming: true,
        supportsEmbeddings: true,
        languageModel: (modelId: string) => openai.languageModel(modelId),
        embeddingModel: (modelId: string) => openai.textEmbeddingModel(modelId),
        raw: openai,
      };
    }
    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: config.credentials.apiKey,
        baseURL: config.credentials.baseUrl,
      });

      return {
        id: config.id,
        supportsStreaming: true,
        supportsEmbeddings: false,
        languageModel: (modelId: string) => anthropic.languageModel(modelId),
        raw: anthropic,
      };
    }
    case 'vercel': {
      if (!config.credentials.authToken && !config.credentials.apiKey) {
        throw new Error('Vercel AI credentials are required to enable the gateway provider.');
      }

      const gateway = createGateway({
        apiKey: config.credentials.authToken ?? config.credentials.apiKey,
        baseURL: config.credentials.baseUrl,
      });

      return {
        id: config.id,
        supportsStreaming: true,
        supportsEmbeddings: true,
        languageModel: (modelId: string) => gateway.languageModel(modelId),
        embeddingModel: (modelId: string) => gateway.textEmbeddingModel(modelId),
        raw: gateway,
      };
    }
    case 'google': {
      if (config.credentials.useVertexAI) {
        // Vertex AI mode
        if (!config.credentials.project) {
          throw new Error('Google Vertex AI requires a project ID.');
        }

        const vertex = createVertex({
          project: config.credentials.project,
          location: config.credentials.location || 'us-central1',
        });

        return {
          id: config.id,
          supportsStreaming: true,
          supportsEmbeddings: true,
          languageModel: (modelId: string) => vertex.languageModel(modelId),
          embeddingModel: (modelId: string) => vertex.textEmbeddingModel(modelId),
          raw: vertex,
        };
      } else {
        // Developer API mode
        if (!config.credentials.apiKey) {
          throw new Error('Google AI (Developer API) requires an API key.');
        }

        const google = createGoogleGenerativeAI({
          apiKey: config.credentials.apiKey,
        });

        return {
          id: config.id,
          supportsStreaming: true,
          supportsEmbeddings: true,
          languageModel: (modelId: string) => google.languageModel(modelId),
          embeddingModel: (modelId: string) => google.textEmbeddingModel(modelId),
          raw: google,
        };
      }
    }
    case 'firecrawl': {
      // Firecrawl is NOT an LLM provider - it's a web scraping service
      // This should not be instantiated as an AI provider
      // Use FirecrawlService from '@/services/web-scraping/FirecrawlService' instead
      throw new Error(
        'Firecrawl is not an LLM provider. Use FirecrawlService from @/services/web-scraping/FirecrawlService for web scraping operations.'
      );
    }
    default:
      throw new Error('Unsupported AI provider: ' + config.id);
  }
};

class ProviderClient implements AIClient {
  readonly id: AIProviderId;
  readonly supportsStreaming: boolean;
  readonly supportsEmbeddings: boolean;
  private readonly config: AIProviderConfig;
  private readonly binding: ProviderBinding;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.binding = instantiateProviderBinding(config);
    this.id = config.id;
    this.supportsStreaming = this.binding.supportsStreaming;
    this.supportsEmbeddings = this.binding.supportsEmbeddings;
  }

  private resolveModel(
    options: AIProviderRuntimeOptions | undefined,
    category: 'default' | 'chat' | 'streaming' | 'embedding'
  ): string {
    if (options && options.model) return options.model;
    if (category === 'chat' && this.config.models.chat) return this.config.models.chat;
    if (category === 'streaming' && this.config.models.streaming)
      return this.config.models.streaming;
    if (category === 'embedding' && this.config.models.embedding)
      return this.config.models.embedding;
    return this.config.models.default;
  }

  private computeCallSettings(options?: AIProviderRuntimeOptions) {
    const globalConfig = getAIConfig();
    const targetMaxTokens = options?.maxTokens ?? globalConfig.maxTokens;
    const providerLimit = this.config.limits.maxTokens;
    const maxOutputTokens = providerLimit
      ? Math.min(targetMaxTokens, providerLimit)
      : targetMaxTokens;
    const timeoutMs = this.config.requestTimeoutMs ?? globalConfig.requestTimeoutMs;
    const { signal, cleanup } = createAbortSignal(timeoutMs, options?.signal);

    return {
      maxOutputTokens,
      temperature: options?.temperature ?? globalConfig.temperature,
      topP: options?.topP,
      topK: options?.topK,
      presencePenalty: options?.presencePenalty,
      frequencyPenalty: options?.frequencyPenalty,
      stopSequences: options?.stopSequences,
      maxRetries: this.config.maxRetries,
      abortSignal: signal,
      cleanup,
    };
  }

  private buildUsageMetrics(
    model: string,
    durationMs: number,
    usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
    success: boolean = true,
    error?: Error,
    metadata?: Record<string, unknown>
  ): AIUsageMetrics {
    const metrics: AIUsageMetrics = {
      provider: this.id,
      model,
      success,
      promptTokens: usage?.inputTokens,
      completionTokens: usage?.outputTokens,
      totalTokens:
        usage?.totalTokens ??
        (usage && usage.inputTokens != null && usage.outputTokens != null
          ? usage.inputTokens + usage.outputTokens
          : undefined),
      durationMs,
      timestamp: new Date().toISOString(),
    };

    if (!success && error) {
      const anyError = error as unknown;
      metrics.errorMessage = error.message;
      if (typeof anyError.code === 'string' || typeof anyError.code === 'number') {
        metrics.errorCode = String(anyError.code);
      } else if (typeof anyError.status === 'string' || typeof anyError.status === 'number') {
        metrics.errorCode = String(anyError.status);
      }
    }

    const annotations = coerceAnnotations(metadata);
    if (annotations) {
      metrics.annotations = { ...(metrics.annotations ?? {}), ...annotations };
    }

    return metrics;
  }

  private formatMessages(messages: AIChatMessage[]): ModelMessage[] {
    return messages.map(message => ({
      role: message.role,
      content: message.content,
      name: message.name,
    })) as ModelMessage[];
  }

  async generateText(prompt: string, options?: AIProviderRuntimeOptions): Promise<AITextResult> {
    const model = this.resolveModel(options, 'default');
    const callSettings = this.computeCallSettings(options);
    const startedAt = Date.now();

    try {
      const result = await generateText({
        model: this.binding.languageModel(model),
        prompt,
        maxOutputTokens: callSettings.maxOutputTokens,
        temperature: callSettings.temperature,
        topP: callSettings.topP,
        topK: callSettings.topK,
        presencePenalty: callSettings.presencePenalty,
        frequencyPenalty: callSettings.frequencyPenalty,
        stopSequences: callSettings.stopSequences,
        maxRetries: callSettings.maxRetries,
        abortSignal: callSettings.abortSignal,
        responseFormat: options?.responseFormat,
      });

      const duration = Date.now() - startedAt;
      const usage = result.totalUsage ?? result.usage;
      const metrics = this.buildUsageMetrics(
        model,
        duration,
        usage,
        true,
        undefined,
        options?.metadata
      );
      markProviderSuccess(this.id, duration);
      emitUsage({
        ...metrics,
        operation: 'generate',
        promptLength: prompt.length,
        responseLength: result.text.length,
      });

      return {
        text: result.text,
        provider: this.id,
        model,
        finishReason: result.finishReason,
        usage: metrics,
        metadata: {
          warnings: result.warnings,
          providerMetadata: result.providerMetadata,
        },
      };
    } catch (error) {
      const duration = Date.now() - startedAt;
      markProviderFailure(this.id, error);
      const metrics = this.buildUsageMetrics(
        model,
        duration,
        undefined,
        false,
        error as Error,
        options?.metadata
      );
      emitUsage({
        ...metrics,
        operation: 'generate',
        promptLength: prompt.length,
        responseLength: 0,
      });
      throw error;
    } finally {
      callSettings.cleanup?.();
    }
  }

  async streamText(
    prompt: string,
    options?: AIProviderRuntimeOptions
  ): Promise<AsyncIterable<AIStreamChunk>> {
    if (!this.supportsStreaming) {
      throw new Error('Provider ' + this.id + ' does not support streaming.');
    }

    const model = this.resolveModel(options, 'streaming');
    const callSettings = this.computeCallSettings(options);
    const startedAt = Date.now();

    try {
      const streamResult = await streamText({
        model: this.binding.languageModel(model),
        prompt,
        maxOutputTokens: callSettings.maxOutputTokens,
        temperature: callSettings.temperature,
        topP: callSettings.topP,
        topK: callSettings.topK,
        presencePenalty: callSettings.presencePenalty,
        frequencyPenalty: callSettings.frequencyPenalty,
        stopSequences: callSettings.stopSequences,
        maxRetries: callSettings.maxRetries,
        abortSignal: callSettings.abortSignal,
        responseFormat: options?.responseFormat,
      });

      const self = this;
      const cleanup = callSettings.cleanup;
      const iterator = async function* (): AsyncIterable<AIStreamChunk> {
        let index = 0;
        let response = '';
        let error: unknown;
        try {
          for await (const token of streamResult.textStream) {
            response += token;
            yield {
              token,
              index,
              provider: self.id,
              model,
              timestamp: Date.now(),
            } as AIStreamChunk;
            index += 1;
          }
          yield {
            token: '',
            index,
            provider: self.id,
            model,
            timestamp: Date.now(),
            done: true,
          } as AIStreamChunk;
        } catch (err) {
          error = err;
          throw err;
        } finally {
          const duration = Date.now() - startedAt;
          const usage = await streamResult.totalUsage.catch(() => undefined);
          if (error) {
            markProviderFailure(self.id, error);
          } else {
            markProviderSuccess(self.id, duration);
          }
          const metrics = self.buildUsageMetrics(
            model,
            duration,
            usage,
            !error,
            error instanceof Error ? error : undefined,
            options?.metadata
          );
          emitUsage({
            ...metrics,
            operation: 'stream',
            promptLength: prompt.length,
            responseLength: response.length,
          });
          cleanup?.();
        }
      };

      return iterator();
    } catch (error) {
      const duration = Date.now() - startedAt;
      markProviderFailure(this.id, error);
      const metrics = this.buildUsageMetrics(
        model,
        duration,
        undefined,
        false,
        error as Error,
        options?.metadata
      );
      emitUsage({
        ...metrics,
        operation: 'stream',
        promptLength: prompt.length,
        responseLength: 0,
      });
      callSettings.cleanup?.();
      throw error;
    }
  }

  async chat(messages: AIChatMessage[], options?: AIProviderRuntimeOptions): Promise<AIChatResult> {
    const model = this.resolveModel(options, 'chat');
    const callSettings = this.computeCallSettings(options);
    const formattedMessages = this.formatMessages(messages);
    const promptLength = messages.reduce(
      (total, message) => total + (message.content ? message.content.length : 0),
      0
    );
    const startedAt = Date.now();

    try {
      const result = await generateText({
        model: this.binding.languageModel(model),
        messages: formattedMessages,
        maxOutputTokens: callSettings.maxOutputTokens,
        temperature: callSettings.temperature,
        topP: callSettings.topP,
        topK: callSettings.topK,
        presencePenalty: callSettings.presencePenalty,
        frequencyPenalty: callSettings.frequencyPenalty,
        stopSequences: callSettings.stopSequences,
        maxRetries: callSettings.maxRetries,
        abortSignal: callSettings.abortSignal,
        responseFormat: options?.responseFormat,
      });

      const duration = Date.now() - startedAt;
      const usage = result.totalUsage ?? result.usage;
      const metrics = this.buildUsageMetrics(
        model,
        duration,
        usage,
        true,
        undefined,
        options?.metadata
      );
      markProviderSuccess(this.id, duration);
      const responseMessages = mapResponseMessages(result.response?.messages);
      emitUsage({
        ...metrics,
        operation: 'chat',
        promptLength,
        responseLength: result.text.length,
      });

      return {
        text: result.text,
        provider: this.id,
        model,
        finishReason: result.finishReason,
        usage: metrics,
        metadata: {
          warnings: result.warnings,
          providerMetadata: result.providerMetadata,
        },
        messages: responseMessages,
        toolCalls: result.toolCalls,
        rawResponse: result.response,
      };
    } catch (error) {
      const duration = Date.now() - startedAt;
      markProviderFailure(this.id, error);
      const metrics = this.buildUsageMetrics(
        model,
        duration,
        undefined,
        false,
        error as Error,
        options?.metadata
      );
      emitUsage({
        ...metrics,
        operation: 'chat',
        promptLength,
        responseLength: 0,
      });
      throw error;
    } finally {
      callSettings.cleanup?.();
    }
  }

  async embed(input: AIEmbeddingInput, options?: AIEmbeddingOptions): Promise<AIEmbeddingResult> {
    if (!this.supportsEmbeddings || !this.binding.embeddingModel) {
      throw new Error('Provider ' + this.id + ' does not support embeddings.');
    }

    const model = this.resolveModel(options, 'embedding');
    const callSettings = this.computeCallSettings(options);
    const startedAt = Date.now();
    const targetDimensions = options?.dimensions ?? input.dimensions;

    const computePromptLength = (): number => {
      if (Array.isArray(input.input)) {
        return input.input.join('').length;
      }
      return typeof input.input === 'string' ? input.input.length : 0;
    };

    try {
      if (Array.isArray(input.input)) {
        const result = await embedMany({
          model: this.binding.embeddingModel(model),
          values: input.input,
          maxRetries: callSettings.maxRetries,
          abortSignal: callSettings.abortSignal,
          dimensions: targetDimensions,
        });

        const duration = Date.now() - startedAt;
        const metrics = this.buildUsageMetrics(
          model,
          duration,
          result.usage,
          true,
          undefined,
          options?.metadata
        );
        markProviderSuccess(this.id, duration);
        emitUsage({
          ...metrics,
          operation: 'embed',
          promptLength: computePromptLength(),
          responseLength: 0,
        });

        const vectors = result.embeddings.map(embedding => Array.from(embedding));

        return {
          vector: vectors[0] ?? [],
          vectors,
          provider: this.id,
          model,
          usage: metrics,
        };
      }

      const result = await embed({
        model: this.binding.embeddingModel(model),
        value: input.input,
        maxRetries: callSettings.maxRetries,
        abortSignal: callSettings.abortSignal,
        dimensions: targetDimensions,
      });

      const duration = Date.now() - startedAt;
      const metrics = this.buildUsageMetrics(
        model,
        duration,
        result.usage,
        true,
        undefined,
        options?.metadata
      );
      markProviderSuccess(this.id, duration);
      emitUsage({
        ...metrics,
        operation: 'embed',
        promptLength: computePromptLength(),
        responseLength: 0,
      });

      return {
        vector: Array.from(result.embedding),
        provider: this.id,
        model,
        usage: metrics,
      };
    } catch (error) {
      const duration = Date.now() - startedAt;
      markProviderFailure(this.id, error);
      const metrics = this.buildUsageMetrics(
        model,
        duration,
        undefined,
        false,
        error as Error,
        options?.metadata
      );
      emitUsage({
        ...metrics,
        operation: 'embed',
        promptLength: computePromptLength(),
        responseLength: 0,
      });
      throw error;
    } finally {
      callSettings.cleanup?.();
    }
  }

  async getHealth(): Promise<AIProviderHealth> {
    return Promise.resolve(getHealthSnapshot(this.id));
  }
}

const getOrCreateProviderClient = (providerId: AIProviderId): ProviderClient => {
  const existing = providerClientCache.get(providerId);
  if (existing) {
    return existing;
  }

  const config = getProviderConfig(providerId);
  const client = new ProviderClient(config);
  providerClientCache.set(providerId, client);
  return client;
};

let healthCheckTimer: NodeJS.Timeout | null = null;
let healthCheckPromise: Promise<void> | null = null;

const runProviderHealthCheck = async (providerId: AIProviderId): Promise<void> => {
  const config = getProviderConfig(providerId);
  if (!config.enabled) {
    const health = providerHealthState[providerId];
    if (health) {
      health.status = 'degraded';
      health.lastChecked = Date.now();
    }
    return;
  }

  try {
    const request = buildHealthCheckRequest(config);
    if (!request || typeof fetch !== 'function') {
      const client = getOrCreateProviderClient(providerId);
      await client.getHealth();
      markProviderSuccess(providerId, 0);
      return;
    }

    const timeoutMs = config.requestTimeoutMs ?? getAIConfig().requestTimeoutMs;
    const controller = typeof AbortController === 'undefined' ? undefined : new AbortController();
    let timer: NodeJS.Timeout | undefined;

    if (controller && timeoutMs && timeoutMs > 0) {
      timer = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort(new Error(`AI provider health check timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    }

    const response = await fetch(request.url, {
      method: request.method ?? 'GET',
      headers: request.headers,
      signal: controller?.signal,
    });

    if (timer) {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }

    markProviderSuccess(providerId, 0);
  } catch (error) {
    markProviderFailure(providerId, error);
  }
};

const runScheduledHealthChecks = async (): Promise<void> => {
  const config = getAIConfig();
  if (!config.monitoring.enabled) {
    return;
  }

  for (const providerId of AI_PROVIDER_IDS) {
    await runProviderHealthCheck(providerId);
  }
};

const stopScheduledHealthChecks = (): void => {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
};

const scheduleHealthChecks = (): void => {
  if (!isServerRuntime) {
    return;
  }

  const config = getAIConfig();
  if (!config.monitoring.enabled) {
    stopScheduledHealthChecks();
    return;
  }

  const interval = Math.max(10000, config.monitoring.healthCheckIntervalMs);

  const trigger = () => {
    if (healthCheckPromise) {
      return;
    }

    healthCheckPromise = runScheduledHealthChecks()
      .catch(error => {
        console.error('AI provider health check cycle failed', error);
      })
      .finally(() => {
        healthCheckPromise = null;
      });
  };

  trigger();
  stopScheduledHealthChecks();
  healthCheckTimer = setInterval(trigger, interval);
};

const ensureHealthMonitoring = (): void => {
  if (!isServerRuntime) {
    return;
  }

  if (!healthCheckTimer && !healthCheckPromise) {
    scheduleHealthChecks();
  }
};

const restartHealthMonitoring = (): void => {
  if (!isServerRuntime) {
    return;
  }

  stopScheduledHealthChecks();
  scheduleHealthChecks();
};

if (isServerRuntime) {
  ensureHealthMonitoring();
}

export const getProviderClient = (providerId: AIProviderId): AIClient =>
  getOrCreateProviderClient(providerId);

export const getProviderClientsForFallback = (preferred?: AIProviderId): AIClient[] => {
  const chain = getProviderFallbackChain(preferred);
  return chain.map(providerId => getOrCreateProviderClient(providerId));
};

export const getProviderHealthStatus = (providerId: AIProviderId): AIProviderHealth =>
  getHealthSnapshot(providerId);

export const getAllProviderHealthStatus = (): AIProviderHealth[] =>
  AI_PROVIDER_IDS.map(providerId => getHealthSnapshot(providerId));

export const onAIUsage = (listener: UsageListener): (() => void) => {
  usageListeners.add(listener);
  return () => usageListeners.delete(listener);
};

export const removeAIUsageListeners = (): void => {
  usageListeners.clear();
};

export const restartAIHealthMonitoring = (): void => {
  restartHealthMonitoring();
};

export const stopAIHealthMonitoring = (): void => {
  stopScheduledHealthChecks();
};

export const ensureAIHealthMonitoring = (): void => {
  ensureHealthMonitoring();
};

onAIConfigChange(() => {
  providerClientCache.clear();
  for (const providerId of AI_PROVIDER_IDS) {
    providerHealthState[providerId] = createInitialHealth(providerId);
  }
  restartHealthMonitoring();
});
