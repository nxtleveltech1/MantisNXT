# MantisNXT AI Module

Multi-provider AI scaffolding for MantisNXT. This module prepares the codebase to work with OpenAI, Anthropic, Vercel AI Gateway, and OpenAI-compatible providers using the AI SDK v5 family.

## Providers

- OpenAI (`OPENAI_API_KEY`)
- Anthropic (`ANTHROPIC_API_KEY`)
- Vercel AI Gateway (`VERCEL_AI_GATEWAY_URL`, `VERCEL_AI_GATEWAY_TOKEN`)
- OpenAI-Compatible (`OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_API_KEY`)

## Configuration

Environment variables (see `.env.example`):

- `DEFAULT_AI_PROVIDER`: `openai` | `anthropic` | `vercel` | `openai-compatible`
- `ENABLE_AI_FEATURES`: `true`/`false`
- `ENABLE_AI_STREAMING`: `true`/`false`
- `ENABLE_AI_FALLBACK`: `true`/`false`
- `AI_MAX_TOKENS`: number
- `AI_TEMPERATURE`: number
- `AI_REQUEST_TIMEOUT`: number (ms)

Provider credentials:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `VERCEL_AI_GATEWAY_URL`
- `VERCEL_AI_GATEWAY_TOKEN`
- `OPENAI_COMPATIBLE_BASE_URL`
- `OPENAI_COMPATIBLE_API_KEY`

## Usage

Import the module entry and use the service abstraction:

```ts
import { AIService, isAIEnabled } from '@/lib/ai';

if (isAIEnabled()) {
  const ai = new AIService();
  const result = await ai.generateText('Summarize latest supplier trends in ZAR.');
  console.log(result.text);
}
```

This scaffold returns no-op results by default. Replace the factory in `src/lib/ai/index.ts` with real SDK client instantiation to enable actual generation and streaming.

## Integration Patterns

- Aligns with the existing service architecture (e.g., `src/lib/api/base.ts`).
- Ready to plug into real-time systems (`src/lib/notifications/live-notifications.ts`) for token streaming events.
- Plays well with analytics (`src/lib/analytics/*`) for capturing AI usage metrics.

## Security & Compliance

Review internal guidance: [Security & Compliance](../README_SECURITY_COMPLIANCE.md).

Follow data minimization and POPIA/financial compliance practices when sending prompts and context.


