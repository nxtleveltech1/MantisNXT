import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';

// Tag suggestion schema for single product
export const TagSuggestionSchema = z.object({
  tag_id: z.string().min(1),
  tag_name: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reason: z.string().optional(),
  type: z.enum(['seasonal', 'stock', 'custom', 'auto']).optional(),
});

// Product enrichment schema
export const ProductEnrichmentSchema = z.object({
  product_name: z.string().min(1),
  short_description: z.string().max(200).optional(),
  full_description: z.string().optional(),
  suggested_tags: z.array(TagSuggestionSchema).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// Batch tag suggestion schema
export const BatchTagSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      supplier_product_id: z.string().uuid(),
      supplier_sku: z.string().optional(),
      suggested_tags: z.array(TagSuggestionSchema),
      product_name: z.string().optional(),
      short_description: z.string().max(200).optional(),
      full_description: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
  ),
});

// Web research result schema
export const WebResearchSchema = z.object({
  source: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  extracted_data: z.record(z.string(), z.any()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// Batch web research schema
export const BatchWebResearchSchema = z.object({
  results: z.array(
    z.object({
      supplier_product_id: z.string().uuid(),
      supplier_sku: z.string().optional(),
      research_results: z.array(WebResearchSchema),
    })
  ),
});

export type TagSuggestion = z.infer<typeof TagSuggestionSchema>;
export type ProductEnrichment = z.infer<typeof ProductEnrichmentSchema>;
export type BatchTagSuggestion = z.infer<typeof BatchTagSuggestionSchema>;
export type WebResearchResult = z.infer<typeof WebResearchSchema>;
export type BatchWebResearch = z.infer<typeof BatchWebResearchSchema>;

/**
 * Attempt to parse model output as JSON, repairing minor formatting issues when needed.
 * Handles truncated JSON by attempting to close incomplete structures.
 */
export function parseStructuredJsonResponse<T>(rawText: string, schema: z.ZodSchema<T>): T | null {
  if (!rawText) return null;

  const candidates = new Set<string>();
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (jsonMatch?.[0]) candidates.add(jsonMatch[0]);
  const trimmed = rawText.trim();
  if (trimmed.length > 0) candidates.add(trimmed);

  for (const candidate of candidates) {
    const parsed = tryParseCandidate(candidate, schema);
    if (parsed) return parsed;

    // Try repairing with jsonrepair
    const repaired = repairCandidate(candidate);
    if (repaired) {
      const repairedResult = tryParseCandidate(repaired, schema);
      if (repairedResult) return repairedResult;
    }

    // If repair failed, try to close truncated JSON structures
    const closed = attemptCloseTruncatedJson(candidate);
    if (closed) {
      const closedResult = tryParseCandidate(closed, schema);
      if (closedResult) return closedResult;
    }
  }

  return null;
}

/**
 * Attempt to close truncated JSON by adding missing closing brackets/braces
 */
function attemptCloseTruncatedJson(text: string): string | null {
  if (!text || !text.trim().startsWith('{')) return null;

  try {
    // Count open/close braces and brackets
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }

    // If we're in a string, try to close it
    if (inString) {
      text = text + '"';
    }

    // Close any open brackets first
    while (openBrackets > 0) {
      text = text + ']';
      openBrackets--;
    }

    // Close any open braces
    while (openBraces > 0) {
      text = text + '}';
      openBraces--;
    }

    // Try to repair the closed JSON
    return repairCandidate(text);
  } catch {
    return null;
  }
}

function tryParseCandidate<T>(candidate: string, schema: z.ZodSchema<T>): T | null {
  try {
    const parsed = JSON.parse(candidate);
    const validation = schema.safeParse(parsed);
    return validation.success ? validation.data : null;
  } catch {
    return null;
  }
}

function repairCandidate(candidate: string): string | null {
  try {
    return jsonrepair(candidate);
  } catch {
    return null;
  }
}
