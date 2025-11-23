# MantisNXT AI Module

Multi-provider AI scaffolding for MantisNXT. This module prepares the codebase to work with OpenAI, Anthropic, Vercel AI Gateway, and OpenAI-compatible providers using the AI SDK v5 family.

## Providers

- OpenAI (`OPENAI_API_KEY`) - **CLI Mode Available** (`OPENAI_USE_CLI=true`)
- Anthropic (`ANTHROPIC_API_KEY`)
- Google Gemini (`GEMINI_API_KEY` or `GOOGLE_API_KEY`) - **CLI Mode Available** (`GOOGLE_GENAI_USE_CLI=true`)
- Vercel AI Gateway (`VERCEL_AI_GATEWAY_URL`, `VERCEL_AI_GATEWAY_TOKEN`)
- OpenAI-Compatible (`OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_API_KEY`)

## Configuration

Environment variables (see `.env.example`):

- `DEFAULT_AI_PROVIDER`: `openai` | `anthropic` | `google` | `vercel` | `openai-compatible`
- `ENABLE_AI_FEATURES`: `true`/`false`
- `ENABLE_AI_STREAMING`: `true`/`false`
- `ENABLE_AI_FALLBACK`: `true`/`false`
- `AI_MAX_TOKENS`: number
- `AI_TEMPERATURE`: number
- `AI_REQUEST_TIMEOUT`: number (ms)

Provider credentials:

- `OPENAI_API_KEY` (or `OPENAI_USE_CLI=true` for CLI mode)
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` (or `GOOGLE_GENAI_USE_CLI=true` for CLI mode)
- `VERCEL_AI_GATEWAY_URL`
- `VERCEL_AI_GATEWAY_TOKEN`
- `OPENAI_COMPATIBLE_BASE_URL`
- `OPENAI_COMPATIBLE_API_KEY`

### CLI Mode Configuration

**For Google Gemini CLI (Free Tier Available):**
```bash
# Install CLI
npm install -g @google/gemini-cli

# Authenticate (choose one):
gemini  # Interactive OAuth login
# OR
export GEMINI_API_KEY=your-api-key
# OR (for GCP)
gcloud auth application-default login

# Enable CLI mode
export GOOGLE_GENAI_USE_CLI=true
export GOOGLE_GENAI_USE_OAUTH=true  # if using OAuth
```

**For OpenAI Codex CLI:**
```bash
# Install CLI
npm install -g @openai/codex

# Authenticate (choose one):
codex  # Interactive - select "Sign in with ChatGPT"
# OR
export OPENAI_API_KEY=sk-your-key
printenv OPENAI_API_KEY | codex login --with-api-key

# Enable CLI mode
export OPENAI_USE_CLI=true
export OPENAI_USE_OAUTH=true  # if using ChatGPT account
```

See [AI CLI Usage Guide](../docs/AI_CLI_USAGE_GUIDE.md) for detailed instructions.

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


