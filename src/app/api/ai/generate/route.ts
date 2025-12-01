import { createHash } from 'crypto';
import { ReadableStream } from 'node:stream/web';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { RequestContext } from '@/lib/api/middleware';
import { ApiMiddleware } from '@/lib/api/middleware';
import { AITextService, type StreamingResult, type TextGenerationOptions } from '@/lib/ai/services';
import type { AIStreamChunk, AIUsageMetrics } from '@/types/ai';

const textService = new AITextService({
  notifyChannel: 'ai_text_events',
  defaultMetadata: { source: 'api.ai.generate' },
  tags: ['api', 'text'],
});

interface GenerationHistoryRecord {
  id: string;
  mode: GenerationMode;
  promptHash: string;
  requestId: string;
  createdAt: string;
  _provider?: string;
  model?: string;
  usage?: AIUsageMetrics;
  costInCents?: number;
  input: Record<string, unknown>;
  output?: string;
  metadata?: Record<string, unknown>;
  templateId?: string;
  templateVariant?: string;
}

type GenerationMode = z.infer<typeof GenerationModeSchema>;

type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

type BatchItem = z.infer<typeof BatchItemSchema>;

type RuntimeOptions = z.infer<typeof RuntimeOptionsSchema>;

type TemplateOptions = z.infer<typeof TemplateOptionsSchema>;

type PromptSource = GenerationRequest | BatchItem;

const generationHistory = new Map<string, GenerationHistoryRecord>();

const GenerationModeSchema = z.enum([
  'content',
  'summarization',
  'translation',
  'formatting',
  'template',
  'custom',
]);

const ContentOptionsSchema = z.object({
  topic: z.string().min(3),
  type: z
    .enum(['article', 'description', 'documentation', 'marketing', 'custom'])
    .default('custom'),
  tone: z.string().optional(),
  audience: z.string().optional(),
  keywords: z.array(z.string().min(2)).max(20).optional(),
  length: z.enum(['brief', 'standard', 'detailed']).default('standard'),
  outline: z.array(z.string().min(3)).max(20).optional(),
});

const SummarizationOptionsSchema = z.object({
  text: z.string().min(20),
  summaryType: z.enum(['abstract', 'bullet', 'key_points']).default('abstract'),
  targetLength: z.enum(['short', 'medium', 'long']).default('medium'),
  includeQuotes: z.boolean().optional(),
});

const TranslationOptionsSchema = z.object({
  text: z.string().min(5),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().min(2),
  formality: z.enum(['auto', 'formal', 'casual']).default('auto'),
  preserveFormatting: z.boolean().optional(),
});

const FormattingOptionsSchema = z.object({
  text: z.string().min(5),
  format: z.enum(['json', 'markdown', 'html', 'bullet_points']).default('json'),
  schema: z.record(z.string(), z.any()).optional(),
  fields: z.array(z.string().min(1)).max(50).optional(),
  instructions: z.string().optional(),
});

const TemplateOptionsSchema = z.object({
  id: z.string().min(2),
  variables: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  context: z.record(z.string(), z.any()).optional(),
  variantId: z.string().optional(),
  sanitize: z.boolean().optional(),
});

const BatchItemSchema = z.object({
  id: z.string().optional(),
  mode: GenerationModeSchema.default('custom'),
  prompt: z.string().optional(),
  content: ContentOptionsSchema.optional(),
  summarization: SummarizationOptionsSchema.optional(),
  translation: TranslationOptionsSchema.optional(),
  formatting: FormattingOptionsSchema.optional(),
  template: TemplateOptionsSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const RuntimeOptionsSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(16).max(64000).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(1).max(500).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  stopSequences: z.array(z.string().min(1)).max(8).optional(),
  responseFormat: z.enum(['text', 'json']).optional(),
});

const CacheOptionsSchema = z.object({
  enabled: z.boolean().default(true),
  key: z.string().optional(),
  ttlMs: z.number().int().min(60000).max(86400000).optional(),
});

const GenerationRequestSchema = z.object({
  mode: GenerationModeSchema.default('custom'),
  prompt: z.string().max(20000).optional(),
  content: ContentOptionsSchema.optional(),
  summarization: SummarizationOptionsSchema.optional(),
  translation: TranslationOptionsSchema.optional(),
  formatting: FormattingOptionsSchema.optional(),
  template: TemplateOptionsSchema.optional(),
  batch: z.array(BatchItemSchema).max(10).optional(),
  stream: z.boolean().optional(),
  runtime: RuntimeOptionsSchema.optional(),
  cache: CacheOptionsSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  notifyChannel: z.string().optional(),
  tags: z.array(z.string().min(1)).max(10).optional(),
  requestId: z.string().optional(),
  includeUsage: z.boolean().optional(),
});

const GenerationQuerySchema = z.object({
  historyId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  format: z.enum(['json', 'csv']).optional(),
});

type GenerationQueryParams = z.infer<typeof GenerationQuerySchema>;

const postHandler = ApiMiddleware.withValidation(
  GenerationRequestSchema,
  { validateBody: true },
  { requiredPermissions: ['write'], rateLimitType: 'aiGenerate' }
)(async (request, context, rawPayload) => {
  const payload = rawPayload as GenerationRequest;
  if (payload.batch && payload.stream) {
    return ApiMiddleware.createErrorResponse('Batch generation does not support streaming', 400);
  }

  try {
    const baseOptions = buildGenerationOptions(payload);
    baseOptions.metadata = mergeMetadata(
      baseOptions.metadata,
      payload.metadata,
      buildUserMetadata(context)
    );

    if (payload.batch?.length) {
      const prompts = payload.batch.map(item => buildPromptFromMode(item.mode, item));
      const response = await textService.generateBatch(prompts, baseOptions);
      const record = storeHistory({
        mode: 'custom',
        requestId: response.requestId,
        promptHash: hashPrompts(prompts),
        payload: { batch: payload.batch },
        response,
      });

      return ApiMiddleware.createSuccessResponse(
        {
          batch: response.data?.results,
          aggregatedUsage: response.data?.aggregatedUsage ?? response.usage,
          historyId: record.id,
        },
        'Batch generation completed successfully',
        buildMeta(response)
      );
    }

    if (payload.stream) {
      const prepared = preparePrompt(payload, baseOptions);
      const streamingResult = await textService.streamText(prepared.prompt, prepared.options);
      attachStreamingHistory(streamingResult, {
        mode: prepared.mode,
        prompt: prepared.prompt,
        payload,
        metadata: prepared.options.metadata,
        template: prepared.template,
      });

      const body = toEventStream(request, streamingResult, {
        promptHash: sha(prepared.prompt),
        mode: prepared.mode,
      });
      const response = new NextResponse(body, { headers: buildStreamHeaders() });
      response.headers.set('X-AI-Mode', prepared.mode);
      if (prepared.template?.id) response.headers.set('X-AI-Template-ID', prepared.template.id);
      return response;
    }

    const prepared = preparePrompt(payload, baseOptions);
    const result = await textService.generateText(prepared.prompt, prepared.options);
    if (prepared.template?.id) {
      recordTemplateOutcome(
        prepared.template.id,
        prepared.template.variant,
        result.success,
        result.provider
      );
    }

    const record = storeHistory({
      mode: prepared.mode,
      requestId: result.requestId,
      promptHash: sha(prepared.prompt),
      payload,
      response: result,
      template: prepared.template,
    });

    return ApiMiddleware.createSuccessResponse(
      {
        historyId: record.id,
        result,
      },
      'Text generated successfully',
      buildMeta(result)
    );
  } catch (error) {
    console.error('AI generate POST error:', error);
    return ApiMiddleware.createErrorResponse(
      error instanceof Error ? error.message : 'Failed to generate text',
      500
    );
  }
});

const getHandler = ApiMiddleware.withValidation(
  GenerationQuerySchema,
  { validateQuery: true, validateBody: false },
  { requiredPermissions: ['read'], rateLimitType: 'aiGenerate' }
)(async (_request, _context, rawQuery) => {
  const query = rawQuery as GenerationQueryParams;
  if (query.historyId) {
    const record = generationHistory.get(query.historyId);
    if (!record) {
      return ApiMiddleware.createErrorResponse('Generation history not found', 404);
    }
    return ApiMiddleware.createSuccessResponse(record, 'Generation history item retrieved');
  }

  const limit = query.limit ?? 20;
  const history = Array.from(generationHistory.values())
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);

  if (query.format === 'csv') {
    const csv = toCsv(history);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="generation-history.csv"',
      },
    });
  }

  return ApiMiddleware.createSuccessResponse(history, 'Generation history retrieved');
});

// Next.js Route Handlers
export async function POST(request: NextRequest) {
  return await postHandler(request);
}

export async function GET(request: NextRequest) {
  return await getHandler(request);
}

function buildGenerationOptions(payload: GenerationRequest): TextGenerationOptions {
  const options: TextGenerationOptions = {
    requestId: payload.requestId,
    notifyChannel: payload.notifyChannel,
    tags: payload.tags,
    metadata: payload.metadata,
  };

  const cache = payload.cache;
  if (cache) {
    options.cache = cache.enabled;
    if (cache.key) options.cacheKey = cache.key;
    if (cache.ttlMs) options.cacheTtlMs = cache.ttlMs;
  }

  applyRuntimeOptions(options, payload.runtime);
  return options;
}

function applyRuntimeOptions(target: TextGenerationOptions, runtime?: RuntimeOptions): void {
  if (!runtime) return;
  if (runtime.provider) target.provider = runtime.provider as TextGenerationOptions['provider'];
  if (runtime.model) target.model = runtime.model;
  if (runtime.temperature !== undefined) target.temperature = runtime.temperature;
  if (runtime.maxTokens !== undefined) target.maxTokens = runtime.maxTokens;
  if (runtime.topP !== undefined) target.topP = runtime.topP;
  if (runtime.topK !== undefined) target.topK = runtime.topK;
  if (runtime.presencePenalty !== undefined) target.presencePenalty = runtime.presencePenalty;
  if (runtime.frequencyPenalty !== undefined) target.frequencyPenalty = runtime.frequencyPenalty;
  if (runtime.stopSequences) target.stopSequences = runtime.stopSequences;
  if (runtime.responseFormat) target.responseFormat = runtime.responseFormat;
}

function preparePrompt(
  payload: GenerationRequest,
  baseOptions: TextGenerationOptions
): {
  prompt: string;
  mode: GenerationMode;
  options: TextGenerationOptions;
  template?: { id: string; variant?: string };
} {
  if (payload.mode === 'template' && payload.template) {
    const rendered = renderTemplateForGeneration(payload.template, baseOptions);
    const promptAware = applyPromptOptions(rendered.prompt, {
      ...baseOptions,
      metadata: rendered.metadata,
    });
    return {
      prompt: rendered.prompt,
      mode: 'template',
      options: promptAware,
      template: { id: payload.template.id, variant: rendered.variant },
    };
  }

  const prompt = payload.prompt ?? buildPromptFromMode(payload.mode, payload);
  const promptAware = applyPromptOptions(prompt, baseOptions);
  return { prompt, mode: payload.mode, options: promptAware };
}

function renderTemplateForGeneration(
  template: TemplateOptions,
  baseOptions: TextGenerationOptions
): { prompt: string; metadata?: Record<string, unknown>; variant?: string } {
  const rendered = textService.getPromptManager().renderTemplate(template.id, {
    variables: template.variables,
    context: template.context,
    variantId: template.variantId,
    sanitize: template.sanitize,
  });
  const metadata = mergeMetadata(baseOptions.metadata, {
    templateId: template.id,
    templateVersion: rendered.version,
    templateVariant: rendered.metadata?.variant,
  });
  return {
    prompt: rendered.prompt,
    metadata,
    variant: rendered.metadata?.variant,
  };
}

function buildPromptFromMode(mode: GenerationMode, source: PromptSource): string {
  switch (mode) {
    case 'content':
      if (!source.content) throw new Error('Content options are required for content generation');
      return buildContentPrompt(source.content);
    case 'summarization':
      if (!source.summarization) throw new Error('Summarization options are required');
      return buildSummarizationPrompt(source.summarization);
    case 'translation':
      if (!source.translation) throw new Error('Translation options are required');
      return buildTranslationPrompt(source.translation);
    case 'formatting':
      if (!source.formatting) throw new Error('Formatting options are required');
      return buildFormattingPrompt(source.formatting);
    case 'template':
      if (!source.template) throw new Error('Template options are required');
      return textService.getPromptManager().renderTemplate(source.template.id, {
        variables: source.template.variables,
        context: source.template.context,
        variantId: source.template.variantId,
        sanitize: source.template.sanitize,
      }).prompt;
    default:
      if (!('prompt' in source) || !source.prompt) {
        throw new Error('Prompt is required for custom generation');
      }
      return source.prompt;
  }
}

function buildContentPrompt(options: z.infer<typeof ContentOptionsSchema>): string {
  const lines = [
    `Create a ${options.length} ${options.type} for ${options.audience ?? 'the intended audience'}.`,
    `Topic: ${options.topic}`,
  ];
  if (options.tone) lines.push(`Tone: ${options.tone}`);
  if (options.keywords?.length) lines.push(`Keywords: ${options.keywords.join(', ')}`);
  if (options.outline?.length)
    lines.push(`Include outline sections: ${options.outline.join(' | ')}`);
  lines.push('Provide engaging, factual content and include actionable insights where relevant.');
  return lines.join('\n');
}

function buildSummarizationPrompt(options: z.infer<typeof SummarizationOptionsSchema>): string {
  const lines = [
    `Summarize the following text with a ${options.summaryType} summary.`,
    `Target length: ${options.targetLength}.`,
    'Text:',
    options.text,
  ];
  if (options.includeQuotes) {
    lines.push('Highlight notable quotes with attribution.');
  }
  return lines.join('\n');
}

function buildTranslationPrompt(options: z.infer<typeof TranslationOptionsSchema>): string {
  const lines = [
    `Translate the text into ${options.targetLanguage}${options.formality !== 'auto' ? ' with a ' + options.formality + ' tone' : ''}.`,
  ];
  if (options.sourceLanguage) lines.push(`Source language: ${options.sourceLanguage}.`);
  if (options.preserveFormatting)
    lines.push('Preserve original formatting and structure when possible.');
  lines.push('Text:');
  lines.push(options.text);
  return lines.join('\n');
}

function buildFormattingPrompt(options: z.infer<typeof FormattingOptionsSchema>): string {
  const lines = [`Reformat the following text into ${options.format}.`];
  if (options.schema) {
    lines.push('Ensure the JSON matches this schema:');
    lines.push(JSON.stringify(options.schema));
  }
  if (options.fields?.length) {
    lines.push(`Include the following fields: ${options.fields.join(', ')}`);
  }
  if (options.instructions) lines.push(options.instructions);
  lines.push('Text:');
  lines.push(options.text);
  return lines.join('\n');
}

function applyPromptOptions(prompt: string, options: TextGenerationOptions): TextGenerationOptions {
  return {
    ...options,
    metadata: mergeMetadata(options.metadata, { promptHash: sha(prompt) }),
  };
}

function buildUserMetadata(context: RequestContext): Record<string, unknown> | undefined {
  if (!context.user) return undefined;
  return {
    user: {
      id: context.user.id,
      email: context.user.email,
      role: context.user.role,
      organizationId: context.user.organizationId,
    },
  };
}

function mergeMetadata(
  ...sources: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
  const merged: Record<string, unknown> = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) merged[key] = value;
    }
  }
  return Object.keys(merged).length ? merged : undefined;
}

function buildMeta(response: {
  requestId: string;
  durationMs: number;
  provider: string;
}): Record<string, unknown> {
  return {
    requestId: response.requestId,
    processingTime: response.durationMs,
    provider: response.provider,
  };
}

function storeHistory(params: {
  mode: GenerationMode;
  requestId: string;
  promptHash: string;
  payload: Record<string, unknown>;
  response: {
    provider: string;
    model?: string;
    usage?: AIUsageMetrics;
    data?: unknown;
  };
  template?: { id: string; variant?: string };
}): GenerationHistoryRecord {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const record: GenerationHistoryRecord = {
    id,
    mode: params.mode,
    promptHash: params.promptHash,
    requestId: params.requestId,
    createdAt: new Date().toISOString(),
    _provider: params.response.provider,
    model: params.response.model,
    usage: params.response.usage,
    costInCents: params.response.usage?.costInCents,
    input: params.payload,
    output: params.response.data?.text ?? params.response.data,
    metadata: params.response.data?.metadata,
    templateId: params.template?.id,
    templateVariant: params.template?.variant,
  };
  generationHistory.set(id, record);
  return record;
}

function recordTemplateOutcome(
  templateId: string,
  variant: string | undefined,
  success: boolean,
  _provider?: string
): void {
  try {
    textService.getPromptManager().recordPerformance(templateId, {
      success,
      variantId: variant,
    });
  } catch (error) {
    console.error('Failed to record template performance', error);
  }
}

function attachStreamingHistory(
  streamingResult: StreamingResult<AIStreamChunk, { text: string; chunks: number }>,
  context: {
    mode: GenerationMode;
    prompt: string;
    payload: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    template?: { id: string; variant?: string };
  }
): void {
  streamingResult.summary
    .then(summary => {
      if (!summary.success) return;
      if (context.template?.id) {
        recordTemplateOutcome(
          context.template.id,
          context.template.variant,
          summary.success,
          summary.provider
        );
      }
      storeHistory({
        mode: context.mode,
        requestId: summary.requestId,
        promptHash: sha(context.prompt),
        payload: context.payload,
        response: {
          provider: summary.provider,
          model: summary.model,
          usage: summary.usage,
          data: { text: summary.data?.text },
        },
        template: context.template,
      });
    })
    .catch(error => {
      console.error('Failed to persist streaming generation history', error);
    });
}

function toEventStream(
  request: NextRequest,
  streamingResult: StreamingResult<AIStreamChunk, { text: string; chunks: number }>,
  info: { promptHash: string; mode: GenerationMode }
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let iterator: AsyncIterator<AIStreamChunk> | null = null;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const abort = () => {
        controller.close();
        if (iterator?.return) void iterator.return(undefined);
      };

      if (request.signal) {
        if (request.signal.aborted) {
          abort();
          return;
        }
        request.signal.addEventListener('abort', abort);
      }

      controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify(info)}\n\n`));
      iterator = streamingResult[Symbol.asyncIterator]();

      const pump = async () => {
        try {
          while (iterator) {
            const { value, done } = await iterator.next();
            if (done) break;
            controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify(value)}\n\n`));
          }

          const summary = await streamingResult.summary;
          controller.enqueue(
            encoder.encode(`event: complete\ndata: ${JSON.stringify(summary)}\n\n`)
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : 'Streaming error' })}\n\n`
            )
          );
        } finally {
          if (request.signal) request.signal.removeEventListener('abort', abort);
          controller.close();
        }
      };

      void pump();
    },
    async cancel() {
      if (iterator?.return) {
        try {
          await iterator.return(undefined);
        } catch (error) {
          console.error('Error cancelling text stream iterator', error);
        }
      }
    },
  });
}

function buildStreamHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
}

function sha(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hashPrompts(prompts: string[]): string {
  return createHash('sha256').update(prompts.join('\u241f')).digest('hex');
}

function toCsv(records: GenerationHistoryRecord[]): string {
  const header = 'id,mode,promptHash,provider,model,costInCents,createdAt';
  const rows = records.map(record => {
    const values = [
      record.id,
      record.mode,
      record.promptHash,
      record._provider ?? '',
      record.model ?? '',
      record.costInCents ?? '',
      record.createdAt,
    ];
    return values
      .map(value => {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      })
      .join(',');
  });
  return [header, ...rows].join('\n');
}
