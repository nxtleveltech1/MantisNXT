import { createHash } from 'crypto'
import { ReadableStream } from 'node:stream/web'
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { RequestContext } from '@/lib/api/middleware';
import { ApiMiddleware } from '@/lib/api/middleware'
import {
  AITextService,
  AIChatService,
  type StreamingResult,
  type TextGenerationOptions,
} from '@/lib/ai/services'
import type { AIChatMessage, AIStreamChunk, AIUsageMetrics } from '@/types/ai'

const textService = new AITextService({
  notifyChannel: 'ai_analysis_events',
  defaultMetadata: { source: 'api.ai.analyze' },
  tags: ['api', 'analysis'],
})

const chatService = new AIChatService({
  notifyChannel: 'ai_analysis_events',
  defaultMetadata: { source: 'api.ai.analyze.recommendations' },
  tags: ['api', 'analysis', 'advisor'],
})

// Define explicit types to avoid circular references
interface ResolvedSchedule {
  enabled: boolean
  frequency: 'adhoc' | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  nextRun: string
  timezone: string
}

interface VisualizationSuggestion {
  type: string
  metric: string
  reason: string
}

interface AnalysisHistoryRecord {
  id: string
  analysisType: AnalysisType
  promptHash: string
  requestId: string
  createdAt: string
  provider?: string
  model?: string
  usage?: AIUsageMetrics
  costInCents?: number
  objectives: string[]
  questions: string[]
  dataSources: string[]
  insights?: string
  recommendations?: string
  visualizations?: VisualizationSuggestion[]
  report?: string
  schedule?: ResolvedSchedule | null
  alerts?: AlertConfiguration | null
  metadata?: Record<string, unknown>
}

type AnalysisType = z.infer<typeof AnalysisTypeSchema>

type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>

type DataSourceInput = z.infer<typeof DataSourceSchema>

type RuntimeOptions = z.infer<typeof RuntimeOptionsSchema>

type CacheOptions = z.infer<typeof CacheOptionsSchema>

type AlertConfiguration = z.infer<typeof AlertSchema>

type AnalysisStreamContext = {
  analysisType: AnalysisType
  prompt: string
  payload: AnalysisRequest
  metadata?: Record<string, unknown>
  schedule?: ResolvedSchedule | null
  alerts?: AlertConfiguration | null
}

const analysisHistory = new Map<string, AnalysisHistoryRecord>()

const AnalysisTypeSchema = z.enum([
  'business',
  'inventory',
  'financial',
  'operational',
  'custom',
])

const TimeRangeSchema = z.object({
  from: z.string(),
  to: z.string(),
})

const DataSourceSchema = z.object({
  type: z.enum(['inventory', 'suppliers', 'analytics', 'financial', 'operations', 'custom']),
  key: z.string().optional(),
  description: z.string().optional(),
  metrics: z.array(z.string().min(2)).max(20).optional(),
  timeRange: TimeRangeSchema.optional(),
  filters: z.record(z.string(), z.any()).optional(),
  weight: z.number().min(0).max(1).optional(),
  dataset: z.array(z.record(z.string(), z.any())).max(500).optional(),
})

const OutputSchema = z.object({
  format: z.enum(['insights', 'report', 'json', 'csv']).default('insights'),
  includeVisualizations: z.boolean().default(true),
  includeNarrative: z.boolean().default(true),
  includeRecommendations: z.boolean().default(true),
  audience: z.enum(['executive', 'operations', 'finance', 'technical']).default('executive'),
})

const ScheduleSchema = z.object({
  frequency: z.enum(['adhoc', 'daily', 'weekly', 'monthly', 'quarterly']).default('adhoc'),
  nextRun: z.string().optional(),
  timezone: z.string().optional(),
  enabled: z.boolean().default(false),
})

const AlertSchema = z.object({
  enabled: z.boolean().default(false),
  thresholds: z
    .array(
      z.object({
        metric: z.string(),
        operator: z.enum(['>', '>=', '<', '<=', '==', '!=']).default('>='),
        value: z.number(),
        severity: z.enum(['info', 'warning', 'critical']).default('warning'),
      })
    )
    .max(10)
    .optional(),
})

const RuntimeOptionsSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(64).max(64000).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(1).max(500).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  stopSequences: z.array(z.string().min(1)).max(8).optional(),
  responseFormat: z.enum(['text', 'json']).optional(),
})

const CacheOptionsSchema = z.object({
  enabled: z.boolean().default(true),
  key: z.string().optional(),
  ttlMs: z.number().int().min(60000).max(86400000).optional(),
})

const AnalysisRequestSchema = z.object({
  analysisType: AnalysisTypeSchema.default('business'),
  objectives: z.array(z.string().min(3)).max(10).default([]),
  questions: z.array(z.string().min(3)).max(10).default([]),
  dataSources: z.array(DataSourceSchema).min(1).max(8),
  comparativePeriod: TimeRangeSchema.optional(),
  includeComparisons: z.boolean().default(false).optional(),
  output: OutputSchema.optional(),
  schedule: ScheduleSchema.optional(),
  alerts: AlertSchema.optional(),
  stream: z.boolean().optional(),
  runtime: RuntimeOptionsSchema.optional(),
  cache: CacheOptionsSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  notifyChannel: z.string().optional(),
  tags: z.array(z.string().min(1)).max(10).optional(),
  requestId: z.string().optional(),
})

const AnalysisQuerySchema = z.object({
  historyId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  format: z.enum(['json', 'csv']).optional(),
})

type AnalysisQueryParams = z.infer<typeof AnalysisQuerySchema>

const postHandler = ApiMiddleware.withValidation(
  AnalysisRequestSchema,
  { validateBody: true },
  { requiredPermissions: ['read'], requiredRole: 'manager', rateLimitType: 'aiAnalyze' }
)(async (request: NextRequest, context: RequestContext, rawPayload) => {
  const payload = rawPayload as AnalysisRequest

  try {
    const baseOptions = buildAnalysisOptions(payload)
    const schedule = payload.schedule ? resolveSchedule(payload.schedule) : null
    const mergedMetadata = mergeMetadata(
      baseOptions.metadata,
      payload.metadata,
      buildUserMetadata(context),
      schedule ? { schedule } : undefined,
      payload.alerts ? { alerts: payload.alerts } : undefined,
      { analysisType: payload.analysisType }
    )
    baseOptions.metadata = mergedMetadata

    const datasetSummary = buildDatasetSummary(payload.dataSources, payload.includeComparisons ? payload.comparativePeriod : undefined)
    const visualizationSuggestions = generateVisualizationSuggestions(payload.dataSources)
    const analysisPrompt = buildAnalysisPrompt(payload, datasetSummary, visualizationSuggestions)

    if (payload.stream) {
      const streamOptions = applyPromptOptions(analysisPrompt, baseOptions)
      const streamingResult = await textService.streamText(analysisPrompt, streamOptions)
      attachStreamingAnalysisHistory(streamingResult, {
        analysisType: payload.analysisType,
        prompt: analysisPrompt,
        payload,
        metadata: streamOptions.metadata,
        schedule,
        alerts: payload.alerts ?? null,
      })

      const body = toAnalysisEventStream(request, streamingResult, {
        promptHash: sha(analysisPrompt),
        analysisType: payload.analysisType,
        dataset: datasetSummary.preview,
      })
      const response = new NextResponse(body, { headers: buildStreamHeaders() })
      response.headers.set('X-AI-Analysis-Type', payload.analysisType)
      if (schedule?.enabled) response.headers.set('X-AI-Next-Run', schedule.nextRun)
      return response
    }

    const promptAwareOptions = applyPromptOptions(analysisPrompt, baseOptions)
    if (payload.output?.format === 'json') {
      promptAwareOptions.responseFormat = 'json'
    }

    const result = await textService.generateText(analysisPrompt, promptAwareOptions)

    const recommendations = await generateRecommendations(result.data?.text ?? '', payload)

    const report = payload.output?.format === 'report' ? buildStructuredReport(result.data?.text ?? '', visualizationSuggestions, payload) : undefined

    const record = storeAnalysisHistory({
      analysisType: payload.analysisType,
      requestId: result.requestId,
      promptHash: sha(analysisPrompt),
      payload,
      response: result,
      recommendations,
      visualizations: payload.output?.includeVisualizations === false ? [] : visualizationSuggestions,
      schedule,
      alerts: payload.alerts ?? null,
      report,
    })

    return ApiMiddleware.createSuccessResponse(
      {
        historyId: record.id,
        analysis: result,
        recommendations,
        visualizations: record.visualizations,
        schedule,
        alerts: payload.alerts ?? null,
        report,
      },
      'Analysis completed successfully',
      buildMeta(result)
    )
  } catch (error) {
    console.error('AI analysis POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete analysis request',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `err_${Date.now()}`,
          version: '1.0.0',
          processingTime: 0,
        },
      },
      { status: 500 }
    )
  }
})

const getHandler = ApiMiddleware.withValidation(AnalysisQuerySchema, { validateQuery: true, validateBody: false }, { requiredPermissions: ['read'], requiredRole: 'manager', rateLimitType: 'aiAnalyze' })(
  async (_request, _context, rawQuery) => {
    const query = rawQuery as AnalysisQueryParams
    if (query.historyId) {
      const record = analysisHistory.get(query.historyId)
      if (!record) {
        return NextResponse.json(
          {
            success: false,
            error: 'Analysis history not found',
            meta: {
              timestamp: new Date().toISOString(),
              requestId: `err_${Date.now()}`,
              version: '1.0.0',
              processingTime: 0,
            },
          },
          { status: 404 }
        )
      }
      return ApiMiddleware.createSuccessResponse(record, 'Analysis history item retrieved')
    }

    const limit = query.limit ?? 20
    const history = Array.from(analysisHistory.values())
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit)

    if (query.format === 'csv') {
      const csv = toAnalysisCsv(history)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="analysis-history.csv"',
        },
      })
    }

    return ApiMiddleware.createSuccessResponse(history, 'Analysis history retrieved')
  }
)

// Next.js Route Handlers
export async function POST(request: NextRequest) {
  return await postHandler(request);
}

export async function GET(request: NextRequest) {
  return await getHandler(request);
}

function buildAnalysisOptions(payload: AnalysisRequest): TextGenerationOptions {
  const options: TextGenerationOptions = {
    requestId: payload.requestId,
    notifyChannel: payload.notifyChannel,
    tags: payload.tags,
    metadata: payload.metadata,
  }

  const cache = payload.cache
  if (cache) {
    options.cache = cache.enabled
    if (cache.key) options.cacheKey = cache.key
    if (cache.ttlMs) options.cacheTtlMs = cache.ttlMs
  }

  applyRuntimeOptions(options, payload.runtime)
  return options
}

function applyRuntimeOptions(target: TextGenerationOptions, runtime?: RuntimeOptions): void {
  if (!runtime) return
  if (runtime.provider) target.provider = runtime.provider as TextGenerationOptions['provider']
  if (runtime.model) target.model = runtime.model
  if (runtime.temperature !== undefined) target.temperature = runtime.temperature
  if (runtime.maxTokens !== undefined) target.maxTokens = runtime.maxTokens
  if (runtime.topP !== undefined) target.topP = runtime.topP
  if (runtime.topK !== undefined) target.topK = runtime.topK
  if (runtime.presencePenalty !== undefined) target.presencePenalty = runtime.presencePenalty
  if (runtime.frequencyPenalty !== undefined) target.frequencyPenalty = runtime.frequencyPenalty
  if (runtime.stopSequences) target.stopSequences = runtime.stopSequences
  if (runtime.responseFormat) target.responseFormat = runtime.responseFormat
}

function buildAnalysisPrompt(
  payload: AnalysisRequest,
  dataset: ReturnType<typeof buildDatasetSummary>,
  visualizations: VisualizationSuggestion[]
): string {
  const lines: string[] = []
  lines.push(`You are an enterprise intelligence analyst generating a ${payload.analysisType} review.`)
  if (payload.objectives.length) {
    lines.push('Objectives:')
    payload.objectives.forEach((objective, index) => {
      lines.push(`${index + 1}. ${objective}`)
    })
  }
  if (payload.questions.length) {
    lines.push('Key questions to address:')
    payload.questions.forEach((question, index) => {
      lines.push(`${index + 1}. ${question}`)
    })
  }

  lines.push('Dataset summary:')
  lines.push(dataset.narrative)

  if (payload.includeComparisons && payload.comparativePeriod) {
    lines.push('Include comparative analysis between the primary period and comparative period provided.')
  }

  if (visualizations.length && (payload.output?.includeVisualizations ?? true)) {
    lines.push('Suggested visualizations:')
    visualizations.forEach((viz, index) => {
      lines.push(`${index + 1}. ${viz.type} focused on ${viz.metric} (${viz.reason}).`)
    })
  }

  if (payload.output?.format === 'report') {
    lines.push('Produce a report with the following sections: Executive Summary, KPI Analysis, Risks & Opportunities, Recommendations, Data Appendix.')
  } else if (payload.output?.format === 'json') {
    lines.push('Return a JSON object with keys: summary, kpis, opportunities, risks, recommendations, alerts.')
  } else if (payload.output?.format === 'csv') {
    lines.push('Produce a concise CSV style table capturing key metrics and insights.')
  } else {
    lines.push('Provide narrative insights with bullet highlights and actionable recommendations.')
  }

  if (payload.alerts?.enabled && payload.alerts.thresholds?.length) {
    lines.push('Evaluate alert thresholds and flag any breaches with severity annotations.')
  }

  lines.push('Ensure the analysis is data-driven, references specific metrics, and provides clear next actions.')
  return lines.join('\n')
}

function buildDatasetSummary(
  dataSources: DataSourceInput[],
  comparative?: z.infer<typeof TimeRangeSchema>
): {
  narrative: string
  preview: Array<{ type: string; metrics: Record<string, number> }>
} {
  const sections: string[] = []
  const preview: Array<{ type: string; metrics: Record<string, number> }> = []

  dataSources.forEach((source, index) => {
    const header = `Data Source ${index + 1}: ${source.type.toUpperCase()}${source.description ? ` - ${source.description}` : ''}`
    const parts: string[] = [header]
    if (source.timeRange) {
      parts.push(`Time Range: ${source.timeRange.from} to ${source.timeRange.to}`)
    }
    if (source.metrics?.length) {
      parts.push(`Tracked Metrics: ${source.metrics.join(', ')}`)
    }
    if (source.filters && Object.keys(source.filters).length > 0) {
      parts.push(`Filters: ${JSON.stringify(source.filters)}`)
    }

    if (source.dataset?.length) {
      const stats = computeDatasetStatistics(source.dataset)
      if (Object.keys(stats).length > 0) {
        parts.push('Computed Statistics:')
        Object.entries(stats).forEach(([key, value]) => {
          parts.push(`- ${key}: ${value}`)
        })
        preview.push({ type: source.type, metrics: stats })
      }
    }

    sections.push(parts.join('\n'))
  })

  if (comparative) {
    sections.push(`Comparative Period Provided: ${comparative.from} to ${comparative.to}`)
  }

  return {
    narrative: sections.join('\n\n'),
    preview,
  }
}

function computeDatasetStatistics(dataset: Array<Record<string, unknown>>): Record<string, number> {
  const numericFields = new Map<string, number[]>()
  dataset.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        const bucket = numericFields.get(key) ?? []
        bucket.push(value)
        numericFields.set(key, bucket)
      }
    })
  })

  const stats: Record<string, number> = {}
  numericFields.forEach((values, key) => {
    if (values.length === 0) return
    const total = values.reduce((sum, value) => sum + value, 0)
    const avg = total / values.length
    const max = Math.max(...values)
    const min = Math.min(...values)
    stats[`${key}_avg`] = Number(avg.toFixed(2))
    stats[`${key}_sum`] = Number(total.toFixed(2))
    stats[`${key}_max`] = Number(max.toFixed(2))
    stats[`${key}_min`] = Number(min.toFixed(2))
  })
  return stats
}

function generateVisualizationSuggestions(dataSources: DataSourceInput[]): VisualizationSuggestion[] {
  const suggestions: VisualizationSuggestion[] = []
  dataSources.forEach((source) => {
    if (source.metrics?.some((metric) => /trend|time|period/i.test(metric))) {
      suggestions.push({
        type: 'line',
        metric: source.metrics?.join(', ') ?? '',
        reason: 'Time-based metrics are suitable for line charts to highlight trends',
      })
    }
    if (source.metrics?.some((metric) => /distribution|category|mix/i.test(metric))) {
      suggestions.push({
        type: 'bar',
        metric: source.metrics?.join(', ') ?? '',
        reason: 'Categorical comparisons benefit from bar charts to compare segments',
      })
    }
    if (source.type === 'financial') {
      suggestions.push({
        type: 'waterfall',
        metric: source.metrics?.[0] ?? 'financial_metric',
        reason: 'Waterfall charts explain contributions to financial outcomes',
      })
    }
  })
  return suggestions.slice(0, 6)
}

async function generateRecommendations(analysisText: string, payload: AnalysisRequest) {
  if (!analysisText || payload.output?.includeRecommendations === false) {
    return undefined
  }

  const messages: AIChatMessage[] = [
    {
      role: 'system',
      content: 'You are an operations strategist. Provide concise, actionable recommendations based on the analysis.',
    },
    {
      role: 'user',
      content: `Analysis summary:\n${analysisText}\n\nFocus on the top three actions for stakeholders (${payload.output?.audience ?? 'executive'} audience).`,
    },
  ]

  const response = await chatService.chat(messages, { metadata: { analysisType: payload.analysisType } })
  return response.success ? response : undefined
}

function buildStructuredReport(
  analysisText: string,
  visualizations: VisualizationSuggestion[],
  payload: AnalysisRequest
): string {
  const sections = [`Audience: ${payload.output?.audience ?? 'executive'}`]
  sections.push('Executive Summary:\n' + analysisText.split('\n').slice(0, 3).join('\n'))
  sections.push('Detailed Analysis:\n' + analysisText)
  if (visualizations.length) {
    sections.push('Visualization Roadmap:')
    visualizations.forEach((viz, index) => {
      sections.push(`${index + 1}. ${viz.type.toUpperCase()} for ${viz.metric} (${viz.reason})`)
    })
  }
  if (payload.alerts?.enabled) {
    sections.push('Alert Configuration:\n' + JSON.stringify(payload.alerts.thresholds ?? [], null, 2))
  }
  return sections.join('\n\n')
}

function applyPromptOptions(prompt: string, options: TextGenerationOptions): TextGenerationOptions {
  return {
    ...options,
    metadata: mergeMetadata(options.metadata, { promptHash: sha(prompt) }),
  }
}

function buildUserMetadata(context: RequestContext): Record<string, unknown> | undefined {
  if (!context.user) return undefined
  return {
    user: {
      id: context.user.id,
      email: context.user.email,
      role: context.user.role,
      organizationId: context.user.organizationId,
    },
  }
}

function mergeMetadata(
  ...sources: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
  const merged: Record<string, unknown> = {}
  for (const source of sources) {
    if (!source) continue
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) merged[key] = value
    }
  }
  return Object.keys(merged).length ? merged : undefined
}

function resolveSchedule(schedule: z.infer<typeof ScheduleSchema>): ResolvedSchedule {
  const now = new Date()
  let nextRun = schedule.nextRun ? new Date(schedule.nextRun) : new Date(now)
  if (!schedule.nextRun) {
    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1)
        break
      case 'weekly':
        nextRun.setDate(now.getDate() + 7)
        break
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1)
        break
      case 'quarterly':
        nextRun.setMonth(now.getMonth() + 3)
        break
      default:
        nextRun = now
        break
    }
  }
  const result: ResolvedSchedule = {
    enabled: schedule.enabled,
    frequency: schedule.frequency,
    nextRun: nextRun.toISOString(),
    timezone: schedule.timezone ?? 'UTC',
  }
  return result
}

function buildMeta(response: { requestId: string; durationMs: number; provider: string }): Record<string, unknown> {
  return {
    requestId: response.requestId,
    processingTime: response.durationMs,
    provider: response.provider,
  }
}

function storeAnalysisHistory(params: {
  analysisType: AnalysisType
  requestId: string
  promptHash: string
  payload: AnalysisRequest
  response: { provider: string; model?: string; usage?: AIUsageMetrics; data?: unknown }
  recommendations?: unknown
  visualizations?: VisualizationSuggestion[]
  schedule?: ResolvedSchedule | null
  alerts?: AlertConfiguration | null
  report?: string
}): AnalysisHistoryRecord {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const record: AnalysisHistoryRecord = {
    id,
    analysisType: params.analysisType,
    promptHash: params.promptHash,
    requestId: params.requestId,
    createdAt: new Date().toISOString(),
    provider: params.response.provider,
    model: params.response.model,
    usage: params.response.usage,
    costInCents: params.response.usage?.costInCents,
    objectives: params.payload.objectives,
    questions: params.payload.questions,
    dataSources: params.payload.dataSources.map((source) => source.type),
    insights: params.response.data?.text ?? params.response.data,
    recommendations: params.recommendations?.data?.text ?? params.recommendations,
    visualizations: params.visualizations,
    report: params.report,
    schedule: params.schedule ?? null,
    alerts: params.alerts ?? null,
    metadata: params.response.data?.metadata,
  }
  analysisHistory.set(id, record)
  return record
}

function attachStreamingAnalysisHistory(
  streamingResult: StreamingResult<AIStreamChunk, { text: string; chunks: number }>,
  context: AnalysisStreamContext
): void {
  streamingResult.summary
    .then(async (summary) => {
      if (!summary.success) return
      let recommendations: unknown
      if (context.payload.output?.includeRecommendations !== false) {
        recommendations = await generateRecommendations(summary.data?.text ?? '', context.payload)
      }
      storeAnalysisHistory({
        analysisType: context.analysisType,
        requestId: summary.requestId,
        promptHash: sha(context.prompt),
        payload: context.payload,
        response: {
          provider: summary.provider,
          model: summary.model,
          usage: summary.usage,
          data: { text: summary.data?.text },
        },
        recommendations,
        visualizations: context.payload.output?.includeVisualizations === false
          ? []
          : generateVisualizationSuggestions(context.payload.dataSources),
        schedule: context.schedule ?? null,
        alerts: context.alerts ?? null,
      })
    })
    .catch((error) => {
      console.error('Failed to persist streaming analysis history', error)
    })
}

function toAnalysisEventStream(
  request: NextRequest,
  streamingResult: StreamingResult<AIStreamChunk, { text: string; chunks: number }>,
  info: { promptHash: string; analysisType: AnalysisType; dataset: ReturnType<typeof buildDatasetSummary>['preview'] }
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let iterator: AsyncIterator<AIStreamChunk> | null = null
  let chunks = 0

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const abort = () => {
        controller.close()
        if (iterator?.return) void iterator.return(undefined)
      }

      if (request.signal) {
        if (request.signal.aborted) {
          abort()
          return
        }
        request.signal.addEventListener('abort', abort)
      }

      controller.enqueue(encoder.encode(`event: context\ndata: ${JSON.stringify(info)}\n\n`))
      iterator = streamingResult[Symbol.asyncIterator]()

      const pump = async () => {
        try {
          while (iterator) {
            const { value, done } = await iterator.next()
            if (done) break
            chunks += 1
            controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify(value)}\n\n`))
            if (chunks % 10 === 0) {
              controller.enqueue(encoder.encode(`event: progress\ndata: ${JSON.stringify({ chunks })}\n\n`))
            }
          }

          const summary = await streamingResult.summary
          controller.enqueue(encoder.encode(`event: complete\ndata: ${JSON.stringify(summary)}\n\n`))
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : 'Streaming error' })}\n\n`
            )
          )
        } finally {
          if (request.signal) request.signal.removeEventListener('abort', abort)
          controller.close()
        }
      }

      void pump()
    },
    async cancel() {
      if (iterator?.return) {
        try {
          await iterator.return(undefined)
        } catch (error) {
          console.error('Error cancelling analysis stream iterator', error)
        }
      }
    },
  })
}

function buildStreamHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}

function toAnalysisCsv(records: AnalysisHistoryRecord[]): string {
  const header = 'id,analysisType,objectives,questions,provider,costInCents,createdAt'
  const rows = records.map((record) => {
    const values = [
      record.id,
      record.analysisType,
      record.objectives.join('; '),
      record.questions.join('; '),
      record.provider ?? '',
      record.costInCents ?? '',
      record.createdAt,
    ]
    return values
      .map((value) => {
        const str = String(value ?? '')
        if (str.includes(',') || str.includes('"')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str
      })
      .join(',');
  })
  return [header, ...rows].join('\n')
}

function sha(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
