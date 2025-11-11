import { ReadableStream } from 'node:stream/web'
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { RequestContext } from '@/lib/api/middleware';
import { ApiMiddleware } from '@/lib/api/middleware'
import { AIChatService, type ChatRequestOptions, type StreamingResult, type ConversationOptions } from '@/lib/ai/services'
import { getAIConfig, updateAIConfig } from '@/lib/ai/config'
import { getConfig as getServiceConfig, upsertConfig as upsertServiceConfig } from '@/app/api/v1/ai/config/_store'
import type { AIChatMessage, AIStreamChunk, AIProviderId, AIProvider, AIConfig, AIProviderConfig } from '@/types/ai'
import {
  getSupportedModels,
  normalizeModelForProvider,
  resolveOrgId
} from '@/lib/ai/model-utils'
import { conversationService } from '@/lib/ai/services/conversation-service'
import { getSystemContext } from '@/lib/ai/system-context'

const chatService = new AIChatService({
  notifyChannel: 'ai_chat_events',
  defaultMetadata: { source: 'api.ai.chat' },
  tags: ['api', 'chat'],
})

const PROVIDER_ID_MAP: Record<string, AIProviderId> = {
  openai: 'openai',
  anthropic: 'anthropic',
  openai_compatible: 'openai-compatible',
  'openai-compatible': 'openai-compatible',
}

type AssistantRuntimeSnapshot = {
  provider: AIProviderId
  model?: string
}

const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().min(1, 'Message content is required'),
  name: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

const ConversationOptionsSchema = z.object({
  id: z.string().optional(),
  systemPrompt: z.string().min(1).max(8000).optional(),
  templateId: z.string().optional(),
  variables: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  context: z.record(z.string(), z.any()).optional(),
  provider: z.string().optional(),
  variantId: z.string().optional(),
  sanitize: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  initialMessages: z.array(ChatMessageSchema).optional(),
  maxHistory: z.number().int().min(1).max(200).optional(),
})

const RuntimeOptionsSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32000).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(1).max(500).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  stopSequences: z.array(z.string()).max(8).optional(),
  responseFormat: z.enum(['text', 'json']).optional(),
})

const ChatRequestSchema = z.object({
  conversationId: z.string().optional(),
  messages: z.array(ChatMessageSchema).min(1, 'At least one message is required'),
  stream: z.boolean().optional(),
  persistHistory: z.boolean().optional(),
  maxHistory: z.number().int().min(1).max(200).optional(),
  runtime: RuntimeOptionsSchema.optional(),
  conversation: ConversationOptionsSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  notifyChannel: z.string().optional(),
  tags: z.array(z.string().min(1)).max(10).optional(),
  requestId: z.string().optional(),
})

type ChatRequestPayload = z.infer<typeof ChatRequestSchema>
type RuntimeOptions = z.infer<typeof RuntimeOptionsSchema>
type ConversationOptionsInput = z.infer<typeof ConversationOptionsSchema>

const ChatQuerySchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  includeMessages: z.preprocess(
    (val) => val === undefined ? true : val === 'true' || val === true,
    z.boolean()
  ).default(true),
})

type ChatQueryParams = z.infer<typeof ChatQuerySchema>

function normalizeProviderId(value?: string | null): AIProviderId {
  return PROVIDER_ID_MAP[value ?? ''] ?? 'openai'
}

async function ensureAssistantRuntimeConfig(context: RequestContext): Promise<AssistantRuntimeSnapshot> {
  try {
    const orgId = resolveOrgId(context.user?.organizationId)
    const record = (await getServiceConfig(orgId, 'assistant'))
      || (await upsertServiceConfig(orgId, 'assistant', { config: {}, enabled: false }))

    const activeProvider = normalizeProviderId(record.config.activeProvider || record.config.provider)
    const providerPartials: Partial<Record<AIProvider, unknown>> = {}
    const providerSections = record.config.providers ?? {}

    const collectProvider = (key: string) => {
      const normalized = normalizeProviderId(key)
      const section = providerSections?.[key] as Record<string, unknown> | undefined
      const isActive = normalized === activeProvider
      const inheritedModel = section?.model || (isActive ? record.config.model : undefined)
      const inheritedApiKey = section?.apiKey || (record.config.provider === key ? record.config.apiKey : undefined)
      const inheritedBaseUrl = section?.baseUrl || (record.config.provider === key ? record.config.baseUrl : undefined)
      const enabledFlag = typeof section?.enabled === 'boolean'
        ? Boolean(section.enabled && inheritedApiKey)
        : inheritedApiKey ? true : undefined

      const hasDetails = Boolean(
        inheritedApiKey ||
        inheritedBaseUrl ||
        inheritedModel ||
        typeof section?.enabled === 'boolean'
      )

      if (!hasDetails) {
        return inheritedModel
      }

      const partial: Record<string, unknown> = {}
      if (enabledFlag !== undefined) {
        partial.enabled = enabledFlag
      }
      if (inheritedApiKey || inheritedBaseUrl) {
        partial.credentials = {
          ...(inheritedApiKey ? { apiKey: inheritedApiKey } : {}),
          ...(inheritedBaseUrl ? { baseUrl: inheritedBaseUrl } : {}),
        }
      }
      const supportedModels = getSupportedModels(normalized)
      const resolvedModel = inheritedModel
        ? normalizeModelForProvider(normalized, inheritedModel)
        : undefined
      if (resolvedModel) {
        partial.models = {
          default: resolvedModel,
          chat: resolvedModel,
        }
      } else if (supportedModels && supportedModels.length > 0) {
        partial.models = {
          default: supportedModels[0],
          chat: supportedModels[0],
        }
      }

     providerPartials[normalized] = {
       ...providerPartials[normalized],
       ...partial,
     }

      return resolvedModel
    }

    const providerKeys = ['openai', 'anthropic', 'openai_compatible']
    let selectedModel: string | undefined
    providerKeys.forEach((key) => {
      const model = collectProvider(key)
      if (!selectedModel && normalizeProviderId(key) === activeProvider) {
        selectedModel = model
      }
    })

    const currentConfig = getAIConfig()
    const fallbackOrder = [
      activeProvider,
      ...currentConfig.fallbackOrder.filter((id) => id !== activeProvider),
    ]

    const providerUpdate: Partial<AIConfig> = Object.keys(providerPartials).length > 0 
      ? { providers: providerPartials as Record<AIProviderId, AIProviderConfig> }
      : {}

    updateAIConfig({
      defaultProvider: activeProvider,
      fallbackOrder,
      enableFeatures: true,
      enableStreaming: true,
      ...providerUpdate,
    } as Partial<AIConfig>)

    return {
      provider: activeProvider,
      model: normalizeModelForProvider(activeProvider, selectedModel || record.config.model),
    }
  } catch (error) {
    console.error('Failed to sync assistant runtime config', error)
    return { provider: 'openai' }
  }
}

const postHandler = ApiMiddleware.withValidation(ChatRequestSchema, { validateBody: true }, { allowAnonymous: true })(
  async (request: NextRequest, context: RequestContext, rawPayload) => {
    const payload = rawPayload as ChatRequestPayload
    try {
      const messages = payload.messages.map(cloneMessage)
      const latestMessage = messages[messages.length - 1]

      if (latestMessage.role !== 'user') {
        return ApiMiddleware.createErrorResponse(
          'Last message must be from the user to continue the conversation',
          400,
          { lastMessageRole: latestMessage.role }
        )
      }

      const priorMessages = messages.slice(0, -1)
      const streamRequested = payload.stream ?? false

      const conversationOptions = payload.conversation ?? {}
      const initialMessages = conversationOptions.initialMessages ?? priorMessages
      const effectiveMaxHistory = payload.maxHistory ?? conversationOptions.maxHistory

      const userMetadata = buildUserMetadata(context)
      const assistantRuntime = await ensureAssistantRuntimeConfig(context)

      // Fetch FULL system context for AI assistant
      let systemContext = null
      if (context.user) {
        try {
          const orgId = resolveOrgId(context.user.organizationId)
          systemContext = await getSystemContext(orgId.toString())
        } catch (error) {
          console.error('Failed to fetch system context:', error)
        }
      }

      const requestMetadata = mergeDefined(
        conversationOptions.metadata,
        payload.metadata,
        userMetadata ? { user: userMetadata } : undefined,
        systemContext ? { systemContext } : undefined,
        {
          stream: streamRequested,
          provider: assistantRuntime.provider,
          model: assistantRuntime.model,
        }
      )

      // Enrich system prompt with FULL system context
      if (systemContext && !conversationOptions.systemPrompt) {
        const contextSummary = `
You are an AI assistant with FULL ACCESS to the organization's system data.

Current System Overview:
- Suppliers: ${systemContext.suppliers.total} total (${systemContext.suppliers.active} active)
- Inventory: ${systemContext.inventory.total} items (${systemContext.inventory.lowStock} low stock, ${systemContext.inventory.outOfStock} out of stock)
- Customers: ${systemContext.customers.total} total (${systemContext.customers.totalLoyaltyMembers} loyalty members)
- Active Alerts: ${systemContext.alerts.critical} critical, ${systemContext.alerts.high} high priority

You can answer questions about suppliers, inventory, customers, orders, analytics, and all system data.
When asked about specific data, provide accurate information from the system context above.
`
        conversationOptions.systemPrompt = contextSummary
      }

      let conversationId = payload.conversationId
      let conversationCreated = false

      if (conversationId) {
        if (!conversationExists(conversationId)) {
          const overrides: Partial<ConversationOptionsInput> = { id: conversationId }
          if (initialMessages.length > 0) overrides.initialMessages = initialMessages
          if (requestMetadata) overrides.metadata = requestMetadata
          if (effectiveMaxHistory !== undefined) overrides.maxHistory = effectiveMaxHistory

          const created = chatService.createConversation(buildConversationOptions(conversationOptions, overrides))
          conversationId = created.id
          conversationCreated = true
        }
      } else {
        const overrides: Partial<ConversationOptionsInput> = {}
        if (initialMessages.length > 0) overrides.initialMessages = initialMessages
        if (requestMetadata) overrides.metadata = requestMetadata
        if (effectiveMaxHistory !== undefined) overrides.maxHistory = effectiveMaxHistory

        const created = chatService.createConversation(buildConversationOptions(conversationOptions, overrides))
        conversationId = created.id
        conversationCreated = true
      }

      if (!conversationId) {
        return ApiMiddleware.createErrorResponse('Failed to establish conversation context', 500)
      }

      const requestId = generateRequestId(payload.requestId)
      const chatOptions: ChatRequestOptions = buildChatOptions(
        {
          conversationId,
          requestId,
          notifyChannel: payload.notifyChannel,
          metadata: requestMetadata,
          tags: payload.tags,
          persistHistory: payload.persistHistory,
          maxHistory: effectiveMaxHistory,
        },
        payload.runtime
      )

      if (!chatOptions.provider) {
        chatOptions.provider = assistantRuntime.provider
      }
      if (!chatOptions.model && assistantRuntime.model) {
        chatOptions.model = assistantRuntime.model
      }

      // Persist user message if requested
      const shouldPersist = payload.persistHistory ?? false
      if (shouldPersist && context.user) {
        const orgId = resolveOrgId(context.user.organizationId)
        const userId = context.user.id

        // Save user message
        await conversationService.saveMessage(
          orgId,
          userId,
          conversationId,
          'user',
          latestMessage.content,
          {
            ...(latestMessage.metadata || {}),
            timestamp: new Date().toISOString(),
            requestId,
          }
        ).catch((error) => {
          console.error('Failed to persist user message:', error)
        })
      }

      if (streamRequested) {
        const streamingResult = await chatService.streamChat(conversationId, latestMessage, chatOptions)
        const stream = toEventStream(request, streamingResult, {
          conversationId,
          requestId,
          created: conversationCreated,
        }, shouldPersist, context)

        const response = new NextResponse(stream, { headers: buildStreamHeaders() })
        response.headers.set('X-AI-Conversation-ID', conversationId)
        response.headers.set('X-AI-Request-ID', requestId)
        return response
      }

      const response = await chatService.continueConversation(conversationId, latestMessage, chatOptions)

      if (!response.success) {
        return ApiMiddleware.createErrorResponse(
          response.error ?? 'Chat request failed',
          502,
          {
            conversationId,
            requestId: response.requestId,
            provider: response.provider,
          }
        )
      }

      // Persist assistant message if requested
      if (shouldPersist && context.user && response.data?.text) {
        const orgId = resolveOrgId(context.user.organizationId)
        const userId = context.user.id

        await conversationService.saveMessage(
          orgId,
          userId,
          conversationId,
          'assistant',
          response.data.text,
          {
            provider: response.provider,
            model: response.model,
            finishReason: response.data.finishReason,
            tokenUsage: response.data.usage,
            timestamp: new Date().toISOString(),
            requestId,
          }
        ).catch((error) => {
          console.error('Failed to persist assistant message:', error)
        })
      }

      return ApiMiddleware.createSuccessResponse(
        {
          conversationId,
          response,
        },
        'Chat response generated successfully',
        {
          requestId: response.requestId || requestId,
          processingTime: response.durationMs,
        }
      )
    } catch (error) {
      console.error('AI chat POST error:', error)
      return ApiMiddleware.createErrorResponse(
        error instanceof Error ? error.message : 'Unexpected error processing chat request',
        500
      )
    }
  }
)

const getHandler = ApiMiddleware.withValidation(ChatQuerySchema, { validateQuery: true, validateBody: false }, { allowAnonymous: true })(
  async (_request, _context, rawQuery) => {
    const query = rawQuery as ChatQueryParams
    try {
      const conversation = chatService.getConversationHistory(query.conversationId)
      const includeMessages = query.includeMessages

      const payload = includeMessages
        ? conversation
        : {
            id: conversation.id,
            metadata: conversation.metadata,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            maxHistory: conversation.maxHistory,
            messageCount: conversation.messages.length,
          }

      return ApiMiddleware.createSuccessResponse(
        payload,
        'Conversation retrieved successfully',
        {
          requestId: generateRequestId(),
        }
      )
    } catch (error) {
      return ApiMiddleware.createErrorResponse(
        'Conversation not found',
        404,
        { conversationId: query.conversationId }
      )
    }
  }
)

// Next.js Route Handlers (export the wrapped handlers directly)
export const POST = postHandler
export const GET = getHandler

function conversationExists(conversationId: string): boolean {
  try {
    chatService.getConversationHistory(conversationId)
    return true
  } catch (error) {
    return false
  }
}

function buildUserMetadata(context: RequestContext) {
  if (!context.user) {
    return undefined
  }

  return {
    id: context.user.id,
    email: context.user.email,
    role: context.user.role,
    organizationId: context.user.organizationId,
    lastLogin: context.user.lastLogin,
  }
}

function buildConversationOptions(
  options: ConversationOptionsInput,
  overrides: Partial<ConversationOptionsInput>
): ConversationOptions {
  const merged: ConversationOptionsInput = { ...options }

  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      ;(merged as unknown)[key] = value
    }
  }

  return merged as ConversationOptions
}

function buildChatOptions(
  base: Partial<ChatRequestOptions>,
  runtime?: RuntimeOptions
): ChatRequestOptions {
  const options: ChatRequestOptions = {
    conversationId: base.conversationId,
    requestId: base.requestId,
  }

  if (base.notifyChannel) options.notifyChannel = base.notifyChannel
  if (base.metadata) options.metadata = base.metadata
  if (base.tags) options.tags = base.tags
  if (base.persistHistory !== undefined) options.persistHistory = base.persistHistory
  if (base.maxHistory !== undefined) options.maxHistory = base.maxHistory

  applyRuntimeOptions(options, runtime)

  return options
}

function applyRuntimeOptions(target: ChatRequestOptions, runtime?: RuntimeOptions): void {
  if (!runtime) return
  if (runtime.provider) target.provider = runtime.provider as ChatRequestOptions['provider']
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

function mergeDefined(
  ...sources: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
  const merged: Record<string, unknown> = {}

  for (const source of sources) {
    if (!source) continue
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) {
        merged[key] = value
      }
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined
}

function cloneMessage(message: AIChatMessage): AIChatMessage {
  const cloned: AIChatMessage = {
    role: message.role,
    content: message.content,
  }

  if (message.name) cloned.name = message.name
  if (message.metadata) cloned.metadata = { ...message.metadata }

  return cloned
}

function generateRequestId(seed?: string): string {
  if (seed) return seed
  return `chat_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function buildStreamHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}

function toEventStream(
  request: NextRequest,
  streamingResult: StreamingResult<AIStreamChunk, { text: string; chunks: number }>,
  info: { conversationId: string; requestId: string; created: boolean },
  shouldPersist: boolean,
  context: RequestContext
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let iterator: AsyncIterator<AIStreamChunk> | null = null

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const abortHandler = () => {
        controller.close()
        if (iterator?.return) {
          void iterator.return(undefined)
        }
      }

      if (request.signal) {
        if (request.signal.aborted) {
          abortHandler()
          return
        }
        request.signal.addEventListener('abort', abortHandler)
      }

      const readyEvent = `event: ready\ndata: ${JSON.stringify(info)}\n\n`
      controller.enqueue(encoder.encode(readyEvent))

      iterator = streamingResult[Symbol.asyncIterator]()

      const pump = async () => {
        const chunks: string[] = []

        try {
          while (iterator) {
            const { value, done } = await iterator.next()
            if (done) break

            // Collect chunks for persistence
            if (value.token) {
              chunks.push(value.token)
            }

            const chunkEvent = `event: chunk\ndata: ${JSON.stringify(value)}\n\n`
            controller.enqueue(encoder.encode(chunkEvent))
          }

          const summary = await streamingResult.summary
          const completeEvent = `event: complete\ndata: ${JSON.stringify(summary)}\n\n`
          controller.enqueue(encoder.encode(completeEvent))

          // Persist assistant message if requested
          if (shouldPersist && context.user && chunks.length > 0) {
            const orgId = resolveOrgId(context.user.organizationId)
            const userId = context.user.id
            const fullContent = chunks.join('')

            await conversationService.saveMessage(
              orgId,
              userId,
              info.conversationId,
              'assistant',
              fullContent,
              {
                ...summary,
                timestamp: new Date().toISOString(),
                requestId: info.requestId,
                streaming: true,
              }
            ).catch((error) => {
              console.error('Failed to persist streamed assistant message:', error)
            })
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Streaming error'
          const errorEvent = `event: error\ndata: ${JSON.stringify({ message })}\n\n`
          controller.enqueue(encoder.encode(errorEvent))
        } finally {
          if (request.signal) {
            request.signal.removeEventListener('abort', abortHandler)
          }
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
          console.error('Error cancelling AI stream iterator', error)
        }
      }
    },
  })
}
