import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';

export const CategorySuggestionSchema = z.object({
  suggested_category_id: z.preprocess(
    val => (val === null ? undefined : val),
    z.string().uuid().optional()
  ),
  categoryId: z.preprocess(val => (val === null ? undefined : val), z.string().uuid().optional()),
  proposed_category_name: z.preprocess(val => {
    if (val == null) return undefined;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }
    return val;
  }, z.string().optional()),
  proposedCategoryName: z.preprocess(val => {
    if (val == null) return undefined;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }
    return val;
  }, z.string().optional()),
  confidence: z.preprocess(
    val => (val === null ? undefined : val),
    z.number().min(0).max(1).optional()
  ),
  reasoning: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  alternatives: z.preprocess(
    val => (val === null ? undefined : val),
    z
      .array(
        z.object({
          category_id: z.preprocess(
            val => (val === null ? undefined : val),
            z.string().uuid().optional()
          ),
          categoryId: z.preprocess(
            val => (val === null ? undefined : val),
            z.string().uuid().optional()
          ),
          confidence: z.preprocess(
            val => (val === null ? undefined : val),
            z.number().min(0).max(1).optional()
          ),
          reasoning: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
        })
      )
      .optional()
  ),
});

export const BatchCategorySuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      product_id: z.string().uuid().optional(),
      supplier_product_id: z.string().optional(),
      supplier_sku: z.string().optional(),
      suggested_category_id: z.preprocess(
        val => (val === null ? undefined : val),
        z.string().uuid().optional()
      ),
      categoryId: z.preprocess(
        val => (val === null ? undefined : val),
        z.string().uuid().optional()
      ),
      proposed_category_name: z.preprocess(val => {
        if (val == null) return undefined;
        if (typeof val === 'string') {
          const trimmed = val.trim();
          return trimmed.length === 0 ? undefined : trimmed;
        }
        return val;
      }, z.string().optional()),
      proposedCategoryName: z.preprocess(val => {
        if (val == null) return undefined;
        if (typeof val === 'string') {
          const trimmed = val.trim();
          return trimmed.length === 0 ? undefined : trimmed;
        }
        return val;
      }, z.string().optional()),
      confidence: z.preprocess(
        val => (val === null ? undefined : val),
        z.number().min(0).max(1).optional()
      ),
      reasoning: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
      alternatives: z.preprocess(
        val => (val === null ? undefined : val),
        z
          .array(
            z.object({
              category_id: z.preprocess(
                val => (val === null ? undefined : val),
                z.string().uuid().optional()
              ),
              categoryId: z.preprocess(
                val => (val === null ? undefined : val),
                z.string().uuid().optional()
              ),
              confidence: z.preprocess(
                val => (val === null ? undefined : val),
                z.number().min(0).max(1).optional()
              ),
              reasoning: z.preprocess(
                val => (val === null ? undefined : val),
                z.string().optional()
              ),
            })
          )
          .optional()
      ),
    })
  ),
});

export type BatchSuggestion = z.infer<typeof BatchCategorySuggestionSchema>;
export type SingleSuggestion = z.infer<typeof CategorySuggestionSchema>;

/**
 * Attempt to parse model output as JSON, repairing minor formatting issues when needed.
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

    const repaired = repairCandidate(candidate);
    if (repaired) {
      const repairedResult = tryParseCandidate(repaired, schema);
      if (repairedResult) return repairedResult;
    }
  }

  return null;
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
