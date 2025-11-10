# Category AI Module

Deterministic, provider-agnostic AI category suggestion engine.

## Overview
- Uses `ai_service`/`ai_service_config` as the single source of truth (label: `Product Categories`).
- Honors configured provider/model exactly. No hidden model substitution.
- Uses JSON Schema when the model supports it, otherwise falls back to JSON-mode and robust parsing.
- Per-call timeouts (default 45s, override via `AI_CATEGORIZATION_TIMEOUT_MS`).
- Batch sizing based on provider token limits and output caps.

## Public API

```ts
import { suggestCategoriesBatch, suggestCategorySingle } from '@/lib/cmm/category-ai';
```

- `suggestCategoriesBatch(enrichedProducts, categories?, orgId?, opts?)`
  - `opts.batchSize?`: preferred batch size (module caps to safe size)
  - `opts.batchDelayMs?`: delay between batches (default 2000)
  - `opts.timeoutMs?`: per-call timeout (default 45000)

- `suggestCategorySingle(enrichedProduct, categories?, orgId?, opts?)`

Both return suggestions honoring the configured provider/model.

## Environment
- `AI_CATEGORIZATION_TIMEOUT_MS`: Per-call timeout (ms)
- `CATEGORY_AI_VERBOSE=true`: Log metrics events
- `AI_CATEGORIZATION_WARN_ON_FALLBACK=true`: Emit JSON-mode fallback warnings
- `CATEGORY_AI_DISABLE_COMPATIBLE=true`: Exclude `openai_compatible` providers
- `CATEGORY_AI_ALLOWED_PROVIDERS=openai,anthropic`: Restrict to these providers

## Files
- `resolver.ts`: Loads org config from `ai_service*`
- `engine.ts`: Provider abstraction, schema/JSON-mode, timeouts
- `batcher.ts`: Dynamic batch sizing, parallel provider execution, aggregation
- `parser.ts`: Zod schemas, tolerant JSON parsing/repair
- `fallback.ts`: Model capability detection
- `metrics.ts`: Lightweight counters (optional verbose)

## Notes
- No provider/model substitution is performed. If JSON Schema is unsupported, the module uses JSON-mode once and parses the output; on errors/timeouts it skips that provider/batch.
- API routes `category/suggestions` and `category/auto-assign` are wired to this module.


