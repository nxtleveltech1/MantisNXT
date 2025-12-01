// @ts-nocheck
import type {
  AIConfig,
  AIProvider,
  AIProviderConfig,
  AIProviderId,
  AIAnalyticsConfig,
  AIMonitoringConfig,
  AIProviderCredentials,
  AIProviderModels,
  AIProviderLimits,
} from '@/types/ai';
import { z } from 'zod';
import { resolveSecret, clearSecretCache } from './secrets';

const PROVIDERS: AIProviderId[] = [
  'openai',
  'anthropic',
  'vercel',
  'openai-compatible',
  'google',
  'firecrawl',
];

const DEFAULT_MODELS: Record<AIProviderId, AIProviderModels> = {
  openai: {
    default: 'gpt-4.1-mini',
    chat: 'gpt-4.1-mini',
    streaming: 'gpt-4.1-mini',
    embedding: 'text-embedding-3-large',
    fallback: ['anthropic', 'vercel'],
  },
  anthropic: {
    default: 'claude-3-5-sonnet-latest',
    chat: 'claude-3-5-sonnet-latest',
    streaming: 'claude-3-5-haiku-latest',
    fallback: ['openai', 'vercel'],
  },
  vercel: {
    default: 'gpt-4.1-mini',
    chat: 'gpt-4.1-mini',
    streaming: 'gpt-4.1-mini',
    embedding: 'text-embedding-3-small',
    fallback: ['openai', 'anthropic'],
  },
  'openai-compatible': {
    default: 'gpt-4.1-mini',
    chat: 'gpt-4.1-mini',
    streaming: 'gpt-4.1-mini',
    embedding: 'text-embedding-ada-002',
    fallback: ['openai', 'vercel'],
  },
  google: {
    default: 'gemini-2.0-flash-exp',
    chat: 'gemini-2.0-flash-exp',
    streaming: 'gemini-1.5-flash',
    embedding: 'text-embedding-004',
    fallback: ['openai', 'anthropic'],
  },
  firecrawl: {
    default: 'scrape',
    chat: 'scrape',
    streaming: 'scrape',
    fallback: [],
  },
};

const DEFAULT_LIMITS: Record<AIProviderId, AIProviderLimits> = {
  openai: { maxTokens: 8192, maxRequestsPerMinute: 500, concurrency: 8 },
  anthropic: { maxTokens: 4000, maxRequestsPerMinute: 200, concurrency: 4 },
  vercel: { maxTokens: 4000, maxRequestsPerMinute: 450, concurrency: 6 },
  'openai-compatible': { maxTokens: 4000, maxRequestsPerMinute: 120, concurrency: 4 },
  google: { maxTokens: 8192, maxRequestsPerMinute: 300, concurrency: 6 },
  firecrawl: { maxTokens: 0, maxRequestsPerMinute: 60, concurrency: 2 }, // Not an LLM provider
};

const ProviderIdSchema = z.enum([
  'openai',
  'anthropic',
  'vercel',
  'openai-compatible',
  'google',
  'firecrawl',
]);

const ProviderCredentialsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().min(1).optional(),
  organization: z.string().min(1).optional(),
  project: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  authToken: z.string().min(1).optional(),
  apiVersion: z.enum(['v1', 'v1alpha']).optional(),
  useVertexAI: z.boolean().optional(),
  credentials: z.string().min(1).optional(), // Path to service account JSON
  // CLI-based execution options
  useCLI: z.boolean().optional(),
  cliCommand: z.string().min(1).optional(),
  cliArgs: z.array(z.string()).optional(),
  useOAuth: z.boolean().optional(),
  useGCloudADC: z.boolean().optional(),
  cliWorkingDirectory: z.string().min(1).optional(),
});

const ProviderModelsSchema = z.object({
  default: z.string().min(1),
  chat: z.string().min(1).optional(),
  embedding: z.string().min(1).optional(),
  streaming: z.string().min(1).optional(),
  fallback: z.array(ProviderIdSchema).optional(),
});

const ProviderLimitsSchema = z.object({
  maxTokens: z.number().int().nonnegative().optional(), // Allow 0 for non-LLM providers like firecrawl
  maxRequestsPerMinute: z.number().int().nonnegative().optional(),
  concurrency: z.number().int().positive().optional(),
});

const ProviderConfigSchema = z
  .object({
    id: ProviderIdSchema,
    label: z.string().min(1),
    enabled: z.boolean(),
    failoverPriority: z.number().int().nonnegative(),
    credentials: ProviderCredentialsSchema,
    models: ProviderModelsSchema,
    limits: ProviderLimitsSchema,
    requestTimeoutMs: z.number().int().positive().optional(),
    maxRetries: z.number().int().nonnegative().optional(),
    compatibility: z.enum(['strict', 'compatible']).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.enabled) {
      switch (value.id) {
        case 'openai':
        case 'anthropic':
          if (!value.credentials.apiKey) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['credentials', 'apiKey'],
              message: `${value.id} provider requires an API key.`,
            });
          }
          break;
        case 'vercel':
          if (!(value.credentials.authToken || value.credentials.apiKey)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['credentials', 'authToken'],
              message: 'Vercel gateway requires an auth token or API key.',
            });
          }
          if (!value.credentials.baseUrl) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['credentials', 'baseUrl'],
              message: 'Vercel gateway requires a base URL.',
            });
          }
          break;
        case 'openai-compatible':
          if (!value.credentials.apiKey) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['credentials', 'apiKey'],
              message: 'OpenAI compatible provider requires an API key.',
            });
          }
          if (!value.credentials.baseUrl) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['credentials', 'baseUrl'],
              message: 'OpenAI compatible provider requires a base URL.',
            });
          }
          break;
        case 'google':
          // Google supports Developer API, Vertex AI, and CLI modes (Gemini CLI).
          const creds = value.credentials;
          const isCli = Boolean(creds.useCLI);
          const hasApiKey = Boolean(creds.apiKey);
          const usesOAuth = Boolean(creds.useOAuth);
          const usesADC = Boolean(creds.useGCloudADC || creds.project);
          const usesVertex = Boolean(creds.useVertexAI);

          if (usesVertex) {
            // Vertex AI mode: requires project
            if (!creds.project) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['credentials', 'project'],
                message: 'Google Vertex AI requires a project ID.',
              });
            }
          } else if (isCli) {
            // Gemini CLI mode: allow OAuth or gcloud ADC without API key
            if (!(hasApiKey || usesOAuth || usesADC)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['credentials', 'apiKey'],
                message:
                  'Google Gemini CLI requires an API key, OAuth, or gcloud ADC (set project and enable GOOGLE_GENAI_USE_GCLOUD_ADC).',
              });
            }
          } else {
            // Developer API mode: requires apiKey
            if (!hasApiKey) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['credentials', 'apiKey'],
                message:
                  'Google AI (Developer API) requires an API key (GEMINI_API_KEY or GOOGLE_API_KEY).',
              });
            }
          }
          break;
        case 'firecrawl':
          if (!value.credentials.apiKey) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['credentials', 'apiKey'],
              message: 'Firecrawl requires an API key.',
            });
          }
          break;
      }
    }

    if (value.id === 'anthropic' && value.models.embedding) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['models', 'embedding'],
        message:
          'Anthropic provider does not support embeddings; remove the embedding model configuration.',
      });
    }

    if (value.id === 'firecrawl' && value.models.embedding) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['models', 'embedding'],
        message:
          'Firecrawl is a web scraping service, not an LLM provider; remove embedding configuration.',
      });
    }
  });

const AnalyticsConfigSchema = z.object({
  enabled: z.boolean(),
  sampleRate: z.number().min(0),
  eventName: z.string().min(1),
});

const MonitoringConfigSchema = z.object({
  enabled: z.boolean(),
  healthCheckIntervalMs: z.number().int().positive(),
  unhealthyThreshold: z.number().int().positive(),
  recoveryWindowMs: z.number().int().nonnegative(),
  trackLatency: z.boolean(),
});

const ProvidersSchema = z.object({
  openai: ProviderConfigSchema,
  anthropic: ProviderConfigSchema,
  vercel: ProviderConfigSchema,
  'openai-compatible': ProviderConfigSchema,
  google: ProviderConfigSchema,
  firecrawl: ProviderConfigSchema,
});

const AI_CONFIG_SCHEMA = z
  .object({
    defaultProvider: ProviderIdSchema,
    enableFeatures: z.boolean(),
    enableStreaming: z.boolean(),
    enableFallback: z.boolean(),
    maxTokens: z.number().int().positive(),
    temperature: z.number().min(0),
    requestTimeoutMs: z.number().int().positive(),
    fallbackOrder: z.array(ProviderIdSchema).nonempty(),
    providers: ProvidersSchema,
    analytics: AnalyticsConfigSchema,
    monitoring: MonitoringConfigSchema,
    openaiApiKey: z.string().optional(),
    anthropicApiKey: z.string().optional(),
    vercelAIGatewayUrl: z.string().optional(),
    vercelAIGatewayToken: z.string().optional(),
    openaiCompatibleBaseUrl: z.string().optional(),
    openaiCompatibleApiKey: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const expectedProviders = Object.keys(value.providers);
    for (const providerId of expectedProviders) {
      if (!value.fallbackOrder.includes(providerId as AIProviderId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fallbackOrder'],
          message: `Fallback order is missing provider ${providerId}.`,
        });
        break;
      }
    }
  });

let cachedConfig: AIConfig | null = null;
const listeners = new Set<(config: AIConfig) => void>();

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseProviderList = (value: string | undefined): AIProviderId[] => {
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim() as AIProviderId)
    .filter((item): item is AIProviderId => PROVIDERS.includes(item));
};

const mergeProviderModels = (
  provider: AIProviderId,
  overrides?: Partial<AIProviderModels>
): AIProviderModels => ({
  ...DEFAULT_MODELS[provider],
  ...overrides,
  fallback: overrides?.fallback ?? DEFAULT_MODELS[provider].fallback,
});

const buildCredentials = (
  provider: AIProviderId,
  env: NodeJS.ProcessEnv
): AIProviderCredentials => {
  switch (provider) {
    case 'openai': {
      const useCLI = parseBoolean(env.OPENAI_USE_CLI, false);
      const useOAuth = parseBoolean(env.OPENAI_USE_OAUTH, false);

      if (useCLI) {
        // CLI mode - use OpenAI Codex CLI
        const apiKey = resolveSecret(env, 'OPENAI_API_KEY');

        return {
          apiKey: !useOAuth ? apiKey : undefined,
          baseUrl: env.OPENAI_BASE_URL,
          organization: env.OPENAI_ORGANIZATION,
          project: env.OPENAI_PROJECT,
          useCLI: true,
          cliCommand: env.OPENAI_CLI_COMMAND || 'codex',
          cliArgs: env.OPENAI_CLI_ARGS
            ? env.OPENAI_CLI_ARGS.split(',').map(s => s.trim())
            : undefined,
          useOAuth: useOAuth || !apiKey,
          cliWorkingDirectory: env.OPENAI_CLI_WORKING_DIR,
        };
      } else {
        // API mode
        return {
          apiKey: resolveSecret(env, 'OPENAI_API_KEY'),
          baseUrl: env.OPENAI_BASE_URL,
          organization: env.OPENAI_ORGANIZATION,
          project: env.OPENAI_PROJECT,
        };
      }
    }
    case 'anthropic':
      return {
        apiKey: resolveSecret(env, 'ANTHROPIC_API_KEY'),
        baseUrl: env.ANTHROPIC_BASE_URL,
      };
    case 'vercel':
      return {
        authToken: resolveSecret(env, 'VERCEL_AI_GATEWAY_TOKEN'),
        baseUrl: env.VERCEL_AI_GATEWAY_URL,
      };
    case 'openai-compatible':
      return {
        apiKey: resolveSecret(env, 'OPENAI_COMPATIBLE_API_KEY'),
        baseUrl: env.OPENAI_COMPATIBLE_BASE_URL,
        organization: env.OPENAI_COMPATIBLE_ORG,
      };
    case 'google': {
      const useCLI = parseBoolean(env.GOOGLE_GENAI_USE_CLI, false);
      const useVertexAI = parseBoolean(env.GOOGLE_GENAI_USE_VERTEXAI, false);
      const useGCloudADC = parseBoolean(env.GOOGLE_GENAI_USE_GCLOUD_ADC, false);
      const useOAuth = parseBoolean(env.GOOGLE_GENAI_USE_OAUTH, false);

      if (useCLI) {
        // CLI mode - use Gemini CLI
        const apiKey = resolveSecret(env, 'GOOGLE_API_KEY') || resolveSecret(env, 'GEMINI_API_KEY');
        const project = env.GOOGLE_CLOUD_PROJECT;

        return {
          // Don't require API key if using OAuth or gcloud ADC
          apiKey: !useOAuth && !useGCloudADC ? apiKey : undefined,
          project: useGCloudADC || useOAuth ? project : undefined,
          location: useGCloudADC ? env.GOOGLE_CLOUD_LOCATION || 'us-central1' : undefined,
          useCLI: true,
          cliCommand: env.GOOGLE_GENAI_CLI_COMMAND || 'gemini',
          cliArgs: env.GOOGLE_GENAI_CLI_ARGS
            ? env.GOOGLE_GENAI_CLI_ARGS.split(',').map(s => s.trim())
            : undefined,
          useOAuth: useOAuth || (!apiKey && !useGCloudADC && project),
          useGCloudADC: useGCloudADC || (!apiKey && !useOAuth && project),
          cliWorkingDirectory: env.GOOGLE_GENAI_CLI_WORKING_DIR,
          apiVersion: (env.GEMINI_API_VERSION as 'v1' | 'v1alpha') || 'v1',
        };
      } else if (useVertexAI) {
        // Vertex AI mode (API)
        return {
          project: env.GOOGLE_CLOUD_PROJECT,
          location: env.GOOGLE_CLOUD_LOCATION || 'us-central1',
          credentials: env.GOOGLE_APPLICATION_CREDENTIALS,
          useVertexAI: true,
        };
      } else {
        // Developer API mode - check both GEMINI_API_KEY and GOOGLE_API_KEY
        const apiKey = resolveSecret(env, 'GOOGLE_API_KEY') || resolveSecret(env, 'GEMINI_API_KEY');
        return {
          apiKey,
          apiVersion: (env.GEMINI_API_VERSION as 'v1' | 'v1alpha') || 'v1',
          useVertexAI: false,
        };
      }
    }
    case 'firecrawl':
      return {
        apiKey: resolveSecret(env, 'FIRECRAWL_API_KEY'),
        baseUrl: env.FIRECRAWL_BASE_URL || 'https://api.firecrawl.dev',
      };
    default:
      return {};
  }
};

const isProviderConfigured = (
  provider: AIProviderId,
  credentials: AIProviderCredentials
): boolean => {
  switch (provider) {
    case 'openai':
      // CLI mode: check if CLI is available or has OAuth/API key configured
      if (credentials.useCLI) {
        // CLI mode can work with OAuth or API key
        return Boolean(credentials.useOAuth || credentials.apiKey);
      }
      // API mode: check for API key
      return Boolean(credentials.apiKey);
    case 'openai-compatible':
      return Boolean(credentials.apiKey && credentials.baseUrl);
    case 'anthropic':
      return Boolean(credentials.apiKey);
    case 'vercel':
      return Boolean((credentials.authToken || credentials.apiKey) && credentials.baseUrl);
    case 'google':
      // CLI mode: check if CLI is available (checked separately) or has OAuth/ADC configured
      if (credentials.useCLI) {
        // CLI mode can work with OAuth, gcloud ADC, or API key
        return Boolean(
          credentials.useOAuth ||
            credentials.useGCloudADC ||
            credentials.apiKey ||
            credentials.project // gcloud ADC uses project
        );
      }
      // Vertex AI mode: check for project; Developer API mode: check for apiKey
      if (credentials.useVertexAI) {
        return Boolean(credentials.project);
      } else {
        return Boolean(credentials.apiKey);
      }
    case 'firecrawl':
      return Boolean(credentials.apiKey);
    default:
      return false;
  }
};

const getProviderEnvKey = (provider: AIProviderId, suffix: string): string => {
  return 'AI_' + provider.toUpperCase().replace(/-/g, '_') + '_' + suffix;
};

const buildProviderConfig = (provider: AIProviderId, env: NodeJS.ProcessEnv): AIProviderConfig => {
  const credentials = buildCredentials(provider, env);
  const enabled = isProviderConfigured(provider, credentials);

  const fallbackKey = getProviderEnvKey(provider, 'FALLBACK');
  const timeoutKey = getProviderEnvKey(provider, 'TIMEOUT_MS');
  const retriesKey = getProviderEnvKey(provider, 'MAX_RETRIES');

  const modelOverrides = parseProviderList(env[fallbackKey]);

  // Optional model overrides via environment variables, e.g.:
  // AI_OPENAI_COMPATIBLE_MODEL_DEFAULT, AI_OPENAI_COMPATIBLE_MODEL_CHAT,
  // AI_OPENAI_COMPATIBLE_MODEL_EMBEDDING, AI_OPENAI_COMPATIBLE_MODEL_STREAMING
  const modelDefaultKey = getProviderEnvKey(provider, 'MODEL_DEFAULT');
  const modelChatKey = getProviderEnvKey(provider, 'MODEL_CHAT');
  const modelEmbeddingKey = getProviderEnvKey(provider, 'MODEL_EMBEDDING');
  const modelStreamingKey = getProviderEnvKey(provider, 'MODEL_STREAMING');

  const modelDefault = env[modelDefaultKey];
  const modelChat = env[modelChatKey];
  const modelEmbedding = env[modelEmbeddingKey];
  const modelStreaming = env[modelStreamingKey];

  const modelsOverride: Partial<AIProviderModels> | undefined =
    modelDefault || modelChat || modelEmbedding || modelStreaming
      ? {
          ...(modelDefault ? { default: modelDefault } : {}),
          ...(modelChat ? { chat: modelChat } : {}),
          ...(modelEmbedding ? { embedding: modelEmbedding } : {}),
          ...(modelStreaming ? { streaming: modelStreaming } : {}),
        }
      : undefined;

  return {
    id: provider,
    label: provider
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    enabled,
    failoverPriority: Number.MAX_SAFE_INTEGER,
    credentials,
    models: mergeProviderModels(provider, {
      ...(modelOverrides.length ? { fallback: modelOverrides } : {}),
      ...(modelsOverride ?? {}),
    }),
    limits: { ...DEFAULT_LIMITS[provider] },
    requestTimeoutMs: parseNumber(env[timeoutKey], parseNumber(env.AI_REQUEST_TIMEOUT, 120000)),
    maxRetries: parseNumber(env[retriesKey], parseNumber(env.AI_MAX_RETRIES, 2)),
    compatibility: provider === 'openai-compatible' ? 'compatible' : 'strict',
    metadata: {},
  };
};

const buildAnalyticsConfig = (env: NodeJS.ProcessEnv): AIAnalyticsConfig => ({
  enabled: parseBoolean(env.AI_ANALYTICS_ENABLED, true),
  sampleRate: parseNumber(env.AI_ANALYTICS_SAMPLE_RATE, 1),
  eventName: env.AI_ANALYTICS_EVENT_NAME ?? 'ai.usage',
});

const buildMonitoringConfig = (env: NodeJS.ProcessEnv): AIMonitoringConfig => ({
  enabled: parseBoolean(env.AI_MONITORING_ENABLED, true),
  healthCheckIntervalMs: parseNumber(env.AI_HEALTHCHECK_INTERVAL_MS, 60000),
  unhealthyThreshold: parseNumber(env.AI_UNHEALTHY_THRESHOLD, 3),
  recoveryWindowMs: parseNumber(env.AI_RECOVERY_WINDOW_MS, 300000),
  trackLatency: parseBoolean(env.AI_MONITOR_LATENCY, true),
});

const applyFailoverPriority = (config: AIConfig): AIConfig => {
  const order = config.fallbackOrder;
  for (const provider of PROVIDERS) {
    const index = order.indexOf(provider);
    config.providers[provider].failoverPriority = index >= 0 ? index : Number.MAX_SAFE_INTEGER;
  }
  return config;
};

const ensureFallbackOrder = (
  defaultProvider: AIProviderId,
  order: AIProviderId[]
): AIProviderId[] => {
  const prioritized = [defaultProvider, ...order];
  const seen = new Set<AIProviderId>();
  const result: AIProviderId[] = [];

  for (const provider of prioritized) {
    if (!PROVIDERS.includes(provider)) continue;
    if (seen.has(provider)) continue;
    seen.add(provider);
    result.push(provider);
  }

  for (const provider of PROVIDERS) {
    if (!seen.has(provider)) {
      seen.add(provider);
      result.push(provider);
    }
  }

  return result;
};

const deepMerge = <T>(base: T, updates: Partial<T>): T => {
  if (!updates) return base;
  const clone: unknown = Array.isArray(base) ? [...(base as unknown)] : { ...(base as unknown) };

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    const current = (clone as unknown)[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      (clone as unknown)[key] = deepMerge(current, value);
    } else {
      (clone as unknown)[key] = value;
    }
  }

  return clone;
};

const emitConfigChange = (config: AIConfig) => {
  for (const listener of listeners) {
    try {
      listener(config);
    } catch (error) {
      console.error('AI config listener failed', error);
    }
  }
};

const createConfig = (overrides?: Partial<AIConfig>): AIConfig => {
  const env = process.env as NodeJS.ProcessEnv;
  const defaultProvider = (env.DEFAULT_AI_PROVIDER as AIProvider) || 'openai';
  const fallbackOrder = ensureFallbackOrder(
    defaultProvider,
    parseProviderList(env.AI_FALLBACK_ORDER)
  );

  const providers = PROVIDERS.reduce<Record<AIProviderId, AIProviderConfig>>((acc, provider) => {
    acc[provider] = buildProviderConfig(provider, env);
    return acc;
  }, {});

  const base: AIConfig = {
    defaultProvider,
    enableFeatures: parseBoolean(env.ENABLE_AI_FEATURES, true),
    enableStreaming: parseBoolean(env.ENABLE_AI_STREAMING, true),
    enableFallback: parseBoolean(env.ENABLE_AI_FALLBACK, true),
    maxTokens: parseNumber(env.AI_MAX_TOKENS, 8192),
    temperature: parseNumber(env.AI_TEMPERATURE, 0.2),
    requestTimeoutMs: parseNumber(env.AI_REQUEST_TIMEOUT, 120000),
    fallbackOrder,
    providers,
    analytics: buildAnalyticsConfig(env),
    monitoring: buildMonitoringConfig(env),
    openaiApiKey: providers.openai.credentials.apiKey,
    anthropicApiKey: providers.anthropic.credentials.apiKey,
    vercelAIGatewayUrl: providers.vercel.credentials.baseUrl,
    vercelAIGatewayToken: providers.vercel.credentials.authToken,
    openaiCompatibleBaseUrl: providers['openai-compatible'].credentials.baseUrl,
    openaiCompatibleApiKey: providers['openai-compatible'].credentials.apiKey,
    googleApiKey: providers.google.credentials.apiKey,
    googleProject: providers.google.credentials.project,
    googleLocation: providers.google.credentials.location,
    firecrawlApiKey: providers.firecrawl.credentials.apiKey,
    firecrawlBaseUrl: providers.firecrawl.credentials.baseUrl,
  };

  const merged = overrides ? deepMerge(base, overrides) : base;
  const prioritized = applyFailoverPriority(merged);
  const validated = AI_CONFIG_SCHEMA.parse(prioritized) as AIConfig;
  return validated;
};

export const getAIConfig = (options?: { refresh?: boolean }): AIConfig => {
  if (!cachedConfig || options?.refresh) {
    cachedConfig = createConfig();
    emitConfigChange(cachedConfig);
  }
  return cachedConfig;
};

export const refreshAIConfig = (): AIConfig => {
  cachedConfig = createConfig();
  emitConfigChange(cachedConfig);
  return cachedConfig;
};

export const updateAIConfig = (partial: Partial<AIConfig>): AIConfig => {
  const current = getAIConfig();
  const merged = applyFailoverPriority(deepMerge(current, partial));
  cachedConfig = AI_CONFIG_SCHEMA.parse(merged) as AIConfig;
  emitConfigChange(cachedConfig);
  return cachedConfig;
};

export const resetAIConfigCache = (): void => {
  cachedConfig = null;
  clearSecretCache();
};

export const onAIConfigChange = (listener: (config: AIConfig) => void): (() => void) => {
  listeners.add(listener);
  if (cachedConfig) {
    listener(cachedConfig);
  }
  return () => listeners.delete(listener);
};

export const isAIEnabled = (): boolean => getAIConfig().enableFeatures;

export const getProviderConfig = (provider: AIProviderId): AIProviderConfig => {
  const config = getAIConfig();
  return config.providers[provider];
};

export const getAvailableProviders = (onlyEnabled = true): AIProviderConfig[] => {
  const config = getAIConfig();
  return Object.values(config.providers).filter(provider =>
    onlyEnabled ? provider.enabled : true
  );
};

export const getProviderFallbackChain = (preferred?: AIProviderId): AIProviderId[] => {
  const config = getAIConfig();
  const order = ensureFallbackOrder(preferred ?? config.defaultProvider, config.fallbackOrder);
  return order.filter(id => config.providers[id]?.enabled);
};

export const getDefaultProvider = (): AIProviderId => getAIConfig().defaultProvider;

export const AI_PROVIDER_IDS = [...PROVIDERS] as const;
