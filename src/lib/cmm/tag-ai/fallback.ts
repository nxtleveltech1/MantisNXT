export function isReasoningModel(modelName?: string): boolean {
  if (!modelName) return false;
  const normalized = modelName.trim().toLowerCase();
  const reasoningPatterns = [/^o\d+/i, /^r1\b/i, /^deepseek-r1/i, /reasoning/i];
  return reasoningPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Detect if a model is known to support JSON Schema with the OpenAI/Anthropic SDKs.
 * We always honor the configured model; engine decides to use schema or JSON-mode.
 */
export function supportsJsonSchema(modelName?: string): boolean {
  if (!modelName) return false;
  const m = modelName.trim().toLowerCase();
  // Known to support
  if (/(^gpt-4o(\b|-)|^gpt-4\.1(\b|-))/.test(m)) return true;
  // Explicitly treat non-schema or reasoning lines as unsupported
  if (/^gpt-4-mini\b/.test(m)) return false;
  if (/^o1\b|^o3\b|reasoning|deepseek-r1/.test(m)) return false;
  return false;
}

