export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
  defaultModel: string;
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
  requiresApiKey: boolean;
  description: string;
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-4-32k',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-3.5-turbo-instruct',
      'text-davinci-003',
      'text-davinci-002',
      'text-curie-001',
      'text-babbage-001',
      'text-ada-001',
    ],
    defaultModel: 'gpt-4o',
    supportsStreaming: true,
    supportsEmbeddings: true,
    requiresApiKey: true,
    description: 'OpenAI GPT models with advanced reasoning and generation capabilities',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-3-5-sonnet-20240620',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2',
    ],
    defaultModel: 'claude-3-5-sonnet-20241022',
    supportsStreaming: true,
    supportsEmbeddings: false,
    requiresApiKey: true,
    description: 'Anthropic Claude models with strong reasoning and safety features',
  },
  google: {
    id: 'google',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    models: [
      'gemini-3-pro-preview',
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro',
      'gemini-pro-vision',
      'text-bison-001',
      'chat-bison-001',
    ],
    defaultModel: 'gemini-3-pro-preview',
    supportsStreaming: true,
    supportsEmbeddings: true,
    requiresApiKey: true,
    description: 'Google Gemini models with multimodal capabilities',
  },
  openai_compatible: {
    id: 'openai_compatible',
    name: 'OpenAI Compatible',
    baseUrl: '',
    models: [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-3.5-turbo',
      'claude-3',
      'claude-3-sonnet',
      'claude-3-haiku',
      'llama-2-70b',
      'llama-2-13b',
      'codellama',
      'mistral-7b',
      'mixtral-8x7b',
    ],
    defaultModel: 'gpt-4',
    supportsStreaming: true,
    supportsEmbeddings: true,
    requiresApiKey: true,
    description: 'OpenAI-compatible API endpoints (Azure OpenAI, Local LLMs, etc.)',
  },
  serper: {
    id: 'serper',
    name: 'Serper (Google Search)',
    baseUrl: 'https://google.serper.dev',
    models: [],
    defaultModel: '',
    supportsStreaming: false,
    supportsEmbeddings: false,
    requiresApiKey: true,
    description: 'Google Search API via Serper for web search capabilities',
  },
  tavily: {
    id: 'tavily',
    name: 'Tavily (AI Search)',
    baseUrl: 'https://api.tavily.com',
    models: [],
    defaultModel: '',
    supportsStreaming: false,
    supportsEmbeddings: false,
    requiresApiKey: true,
    description: 'AI-powered search engine with intelligent result filtering',
  },
  google_search: {
    id: 'google_search',
    name: 'Google Custom Search',
    baseUrl: 'https://www.googleapis.com/customsearch/v1',
    models: [],
    defaultModel: '',
    supportsStreaming: false,
    supportsEmbeddings: false,
    requiresApiKey: true,
    description: 'Google Custom Search API with custom search engines',
  },
  brave: {
    id: 'brave',
    name: 'Brave Search',
    baseUrl: 'https://api.search.brave.com',
    models: [],
    defaultModel: '',
    supportsStreaming: false,
    supportsEmbeddings: false,
    requiresApiKey: true,
    description: 'Privacy-focused search engine API',
  },
  exa: {
    id: 'exa',
    name: 'Exa (Semantic Search)',
    baseUrl: 'https://api.exa.ai',
    models: [],
    defaultModel: '',
    supportsStreaming: false,
    supportsEmbeddings: false,
    requiresApiKey: true,
    description: 'Semantic search with AI-powered result ranking',
  },
  firecrawl: {
    id: 'firecrawl',
    name: 'Firecrawl (Web Scraping)',
    baseUrl: 'https://api.firecrawl.dev',
    models: [],
    defaultModel: '',
    supportsStreaming: false,
    supportsEmbeddings: false,
    requiresApiKey: true,
    description: 'Web scraping and content extraction service',
  },
};

export function getProviderConfig(providerId: string): ProviderConfig | null {
  return PROVIDER_CONFIGS[providerId] || null;
}

export function getDefaultBaseUrl(providerId: string): string {
  const config = getProviderConfig(providerId);
  return config?.baseUrl || '';
}

export function getProviderModels(providerId: string): string[] {
  const config = getProviderConfig(providerId);
  return config?.models || [];
}

export function getDefaultModel(providerId: string): string {
  const config = getProviderConfig(providerId);
  return config?.defaultModel || '';
}

export function isWebSearchProvider(providerId: string): boolean {
  const config = getProviderConfig(providerId);
  return config ? !config.supportsStreaming && !config.supportsEmbeddings : false;
}

export function requiresModel(providerId: string): boolean {
  const config = getProviderConfig(providerId);
  return config ? config.models.length > 0 : false;
}