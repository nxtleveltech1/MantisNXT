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
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      // === ANTHROPIC MODELS ===
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3.5-sonnet:beta',
      'anthropic/claude-3.5-haiku',
      'anthropic/claude-3.5-haiku:beta',
      'anthropic/claude-3-opus',
      'anthropic/claude-3-opus:beta',
      'anthropic/claude-3-sonnet',
      'anthropic/claude-3-sonnet:beta',
      'anthropic/claude-3-haiku',
      'anthropic/claude-3-haiku:beta',
      'anthropic/claude-2.1',
      'anthropic/claude-2',
      'anthropic/claude-instant-1.2',
      
      // === OPENAI MODELS ===
      'openai/gpt-4o',
      'openai/gpt-4o-2024-11-20',
      'openai/gpt-4o-2024-08-06',
      'openai/gpt-4o-2024-05-13',
      'openai/gpt-4o-mini',
      'openai/gpt-4o-mini-2024-07-18',
      'openai/chatgpt-4o-latest',
      'openai/gpt-4-turbo',
      'openai/gpt-4-turbo-preview',
      'openai/gpt-4-1106-preview',
      'openai/gpt-4-0125-preview',
      'openai/gpt-4',
      'openai/gpt-4-32k',
      'openai/gpt-3.5-turbo',
      'openai/gpt-3.5-turbo-1106',
      'openai/gpt-3.5-turbo-0125',
      'openai/gpt-3.5-turbo-16k',
      'openai/o1-preview',
      'openai/o1-preview-2024-09-12',
      'openai/o1-mini',
      'openai/o1-mini-2024-09-12',
      
      // === GOOGLE MODELS ===
      'google/gemini-pro-1.5',
      'google/gemini-pro-1.5-exp',
      'google/gemini-flash-1.5',
      'google/gemini-flash-1.5-8b',
      'google/gemini-flash-1.5-8b-exp',
      'google/gemini-pro',
      'google/gemini-pro-vision',
      'google/palm-2-chat-bison',
      'google/palm-2-codechat-bison',
      'google/gemma-2-27b-it',
      'google/gemma-2-9b-it',
      'google/gemma-7b-it',
      
      // === META LLAMA MODELS ===
      'meta-llama/llama-3.2-90b-vision-instruct',
      'meta-llama/llama-3.2-11b-vision-instruct',
      'meta-llama/llama-3.2-3b-instruct',
      'meta-llama/llama-3.2-1b-instruct',
      'meta-llama/llama-3.1-405b-instruct',
      'meta-llama/llama-3.1-405b',
      'meta-llama/llama-3.1-70b-instruct',
      'meta-llama/llama-3.1-8b-instruct',
      'meta-llama/llama-3-70b-instruct',
      'meta-llama/llama-3-8b-instruct',
      'meta-llama/llama-guard-2-8b',
      'meta-llama/codellama-70b-instruct',
      'meta-llama/codellama-34b-instruct',
      
      // === MISTRAL MODELS ===
      'mistralai/mistral-large-2411',
      'mistralai/mistral-large-2407',
      'mistralai/mistral-large',
      'mistralai/mistral-medium',
      'mistralai/mistral-small',
      'mistralai/mistral-nemo',
      'mistralai/codestral-mamba',
      'mistralai/mistral-7b-instruct',
      'mistralai/mistral-7b-instruct-v0.3',
      'mistralai/mistral-7b-instruct-v0.2',
      'mistralai/mixtral-8x7b-instruct',
      'mistralai/mixtral-8x22b-instruct',
      'mistralai/pixtral-12b',
      'mistralai/ministral-8b',
      'mistralai/ministral-3b',
      
      // === COHERE MODELS ===
      'cohere/command-r-plus',
      'cohere/command-r-plus-08-2024',
      'cohere/command-r',
      'cohere/command-r-08-2024',
      'cohere/command',
      'cohere/command-light',
      
      // === DEEPSEEK MODELS ===
      'deepseek/deepseek-chat',
      'deepseek/deepseek-coder',
      'deepseek/deepseek-r1',
      'deepseek/deepseek-r1-distill-llama-70b',
      'deepseek/deepseek-r1-distill-qwen-32b',
      'deepseek/deepseek-r1-distill-qwen-14b',
      
      // === QWEN MODELS ===
      'qwen/qwen-2.5-72b-instruct',
      'qwen/qwen-2.5-32b-instruct',
      'qwen/qwen-2.5-14b-instruct',
      'qwen/qwen-2.5-7b-instruct',
      'qwen/qwen-2.5-coder-32b-instruct',
      'qwen/qwen-2-72b-instruct',
      'qwen/qwen-2-7b-instruct',
      'qwen/qwen-2-vl-72b-instruct',
      'qwen/qwen-2-vl-7b-instruct',
      'qwen/qwq-32b-preview',
      
      // === PERPLEXITY MODELS ===
      'perplexity/llama-3.1-sonar-huge-128k-online',
      'perplexity/llama-3.1-sonar-large-128k-online',
      'perplexity/llama-3.1-sonar-small-128k-online',
      'perplexity/llama-3.1-sonar-large-128k-chat',
      'perplexity/llama-3.1-sonar-small-128k-chat',
      
      // === XAI MODELS ===
      'x-ai/grok-2-1212',
      'x-ai/grok-2-vision-1212',
      'x-ai/grok-beta',
      'x-ai/grok-vision-beta',
      
      // === NVIDIA MODELS ===
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'nvidia/nemotron-4-340b-instruct',
      
      // === INFLECTION MODELS ===
      'inflection/inflection-3-pi',
      'inflection/inflection-3-productivity',
      
      // === NOUS RESEARCH MODELS ===
      'nousresearch/hermes-3-llama-3.1-405b',
      'nousresearch/hermes-3-llama-3.1-70b',
      'nousresearch/nous-hermes-2-mixtral-8x7b-dpo',
      'nousresearch/nous-capybara-7b',
      
      // === PHIND MODELS ===
      'phind/phind-codellama-34b',
      
      // === MICROSOFT MODELS ===
      'microsoft/wizardlm-2-8x22b',
      'microsoft/wizardlm-2-7b',
      'microsoft/phi-3-medium-128k-instruct',
      'microsoft/phi-3-mini-128k-instruct',
      
      // === DATABRICKS MODELS ===
      'databricks/dbrx-instruct',
      
      // === AI21 MODELS ===
      'ai21/jamba-1.5-large',
      'ai21/jamba-1.5-mini',
      'ai21/jamba-instruct',
      
      // === 01.AI MODELS ===
      '01-ai/yi-large',
      '01-ai/yi-34b-chat',
      '01-ai/yi-6b-chat',
      
      // === TOGETHER AI MODELS ===
      'togethercomputer/stripedhyena-nous-7b',
      
      // === HUGGINGFACE MODELS ===
      'huggingfaceh4/zephyr-7b-beta',
      
      // === RWKV MODELS ===
      'rwkv/rwkv-5-world-3b',
      
      // === NEVERSLEEP MODELS ===
      'neversleep/llama-3.1-lumimaid-70b',
      'neversleep/noromaid-mixtral-8x7b-instruct',
      
      // === SAORC MODELS ===
      'sao10k/l3.1-70b-euryale-v2.2',
      'sao10k/l3-70b-euryale-v2.1',
      
      // === ADDITIONAL POPULAR MODELS ===
      'cognitivecomputations/dolphin-mixtral-8x22b',
      'lizpreciatior/lzlv-70b-fp16-hf',
      'undi95/remm-slerp-l2-13b',
      'gryphe/mythomax-l2-13b',
      'teknium/openhermes-2.5-mistral-7b',
    ],
    defaultModel: 'anthropic/claude-3.5-sonnet',
    supportsStreaming: true,
    supportsEmbeddings: false,
    requiresApiKey: true,
    description: 'Unified API for 200+ AI models from OpenAI, Anthropic, Google, Meta, Mistral, and more',
  },
  kilocode: {
    id: 'kilocode',
    name: 'KiloCode',
    baseUrl: 'https://api.kilocode.com/v1',
    models: [
      'kilocode-gpt-4o',
      'kilocode-claude-3.5-sonnet',
      'kilocode-gemini-pro',
      'kilocode-llama-3.1-70b',
    ],
    defaultModel: 'kilocode-gpt-4o',
    supportsStreaming: true,
    supportsEmbeddings: true,
    requiresApiKey: true,
    description: 'KiloCode specialized AI models for coding and development tasks',
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