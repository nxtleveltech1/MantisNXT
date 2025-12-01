import type { AIProviderId } from '@/types/ai';

export const OPENAI_SUPPORTED_MODELS: string[] = [
  'gpt-4.1',
  'gpt-4.1-preview',
  'gpt-4.1-mini',
  'o1-mini',
  'o1-preview',
  'o3-mini',
];

const PROVIDER_SUPPORTED_MODELS: Partial<Record<AIProviderId, string[]>> = {
  openai: OPENAI_SUPPORTED_MODELS,
};

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const FALLBACK_ORG_ID = '00000000-0000-0000-0000-000000000000';
export const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID ?? FALLBACK_ORG_ID;

export function resolveOrgId(value?: string | null): string {
  if (value && UUID_REGEX.test(value)) return value;
  return DEFAULT_ORG_ID;
}

export function normalizeProviderKey(provider?: string | null): string {
  if (!provider) return '';
  return provider.replace(/-/g, '_');
}

export function getSupportedModels(provider?: string | null): string[] | null {
  const normalized = normalizeProviderKey(provider);
  if (normalized in PROVIDER_SUPPORTED_MODELS) {
    return PROVIDER_SUPPORTED_MODELS[normalized as AIProviderId] ?? null;
  }
  return null;
}

export function normalizeModelForProvider(
  provider?: string | null,
  model?: string | null
): string | undefined {
  if (!model) return undefined;
  const supported = getSupportedModels(provider);
  if (!supported || supported.length === 0) {
    return model;
  }
  const match = supported.find(entry => entry.toLowerCase() === model.toLowerCase());
  return match ?? supported[0];
}
