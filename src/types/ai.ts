// Shared AI types for provider orchestration, configuration management, and service integration.

export type AIProvider = 'openai' | 'anthropic' | 'vercel' | 'openai-compatible';
export type AIProviderId = AIProvider;

export type AIProviderStatus = 'healthy' | 'degraded' | 'unhealthy';

export type AIMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AIChatMessage {
  role: AIMessageRole;
  content: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface AIUsageMetrics {
  provider: AIProviderId;
  model?: string;
  success: boolean;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  costInCents?: number;
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
  annotations?: Record<string, string | number | boolean>;
}

export interface AIStreamChunk {
  token: string;
  index: number;
  provider: AIProviderId;
  model?: string;
  timestamp: number;
  done?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AIEmbeddingResult {
  vector: number[] | Float32Array;
  vectors?: Array<number[] | Float32Array>;
  provider: AIProviderId;
  model?: string;
  usage?: AIUsageMetrics;
}

export interface AIEmbeddingInput {
  input: string | string[];
  model?: string;
  dimensions?: number;
}

export interface AITextResult {
  text: string;
  provider: AIProviderId;
  model?: string;
  finishReason?: string;
  usage?: AIUsageMetrics;
  metadata?: Record<string, unknown>;
}

export interface AIChatResult extends AITextResult {
  messages?: AIChatMessage[];
  rawResponse?: unknown;
}

export interface AIProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
  project?: string;
  authToken?: string;
}

export interface AIProviderLimits {
  maxTokens?: number;
  maxRequestsPerMinute?: number;
  concurrency?: number;
}

export interface AIProviderModels {
  default: string;
  chat?: string;
  embedding?: string;
  streaming?: string;
  fallback?: AIProviderId[];
}

export interface AIProviderConfig {
  id: AIProviderId;
  label?: string;
  enabled: boolean;
  failoverPriority: number;
  credentials: AIProviderCredentials;
  models: AIProviderModels;
  limits: AIProviderLimits;
  requestTimeoutMs?: number;
  maxRetries?: number;
  compatibility?: 'strict' | 'compatible';
  metadata?: Record<string, unknown>;
}

export interface AIProviderHealth {
  id: AIProviderId;
  status: AIProviderStatus;
  lastChecked: number;
  latencyMs?: number;
  consecutiveFailures: number;
  lastError?: string;
}

export interface AIAnalyticsConfig {
  enabled: boolean;
  sampleRate: number;
  eventName: string;
}

export interface AIMonitoringConfig {
  enabled: boolean;
  healthCheckIntervalMs: number;
  unhealthyThreshold: number;
  recoveryWindowMs: number;
  trackLatency: boolean;
}

export interface AIProviderRuntimeOptions {
  provider?: AIProviderId;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
  responseFormat?: 'text' | 'json';
}

export interface AIEmbeddingOptions extends AIProviderRuntimeOptions {
  dimensions?: number;
}

export interface AIConfig {
  defaultProvider: AIProviderId;
  enableFeatures: boolean;
  enableStreaming: boolean;
  enableFallback: boolean;
  maxTokens: number;
  temperature: number;
  requestTimeoutMs: number;
  fallbackOrder: AIProviderId[];
  providers: Record<AIProviderId, AIProviderConfig>;
  analytics: AIAnalyticsConfig;
  monitoring: AIMonitoringConfig;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  vercelAIGatewayUrl?: string;
  vercelAIGatewayToken?: string;
  openaiCompatibleBaseUrl?: string;
  openaiCompatibleApiKey?: string;
}

export interface AIUsageEvent extends AIUsageMetrics {
  requestId?: string;
  operation: 'generate' | 'chat' | 'stream' | 'embed';
  promptLength?: number;
  responseLength?: number;
}

export interface AIClient {
  id: AIProviderId;
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
  generateText(prompt: string, options?: AIProviderRuntimeOptions): Promise<AITextResult>;
  streamText?(prompt: string, options?: AIProviderRuntimeOptions): AsyncIterable<AIStreamChunk>;
  chat(messages: AIChatMessage[], options?: AIProviderRuntimeOptions): Promise<AIChatResult>;
  embed(input: AIEmbeddingInput, options?: AIEmbeddingOptions): Promise<AIEmbeddingResult>;
  getHealth(): Promise<AIProviderHealth>;
}
