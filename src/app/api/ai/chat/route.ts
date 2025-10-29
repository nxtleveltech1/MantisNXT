import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiMiddleware, RequestContext } from '@/lib/api/middleware'
import { AIChatService, type ChatRequestOptions, type StreamingResult } from '@/lib/ai/services'
import { withAICache } from '@/lib/cache/ai-cache'
import type { AIChatMessage, AIStreamChunk } from '@/types/ai'

const chatService = new AIChatService({
  notifyChannel: 'ai_chat_events',
  defaultMetadata: { source: 'api.ai.chat' },
  tags: ['api', 'chat'],
})

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
  includeMessages: z.string().optional().transform(value => (value === undefined ? true : value === 'true')),
})

type ChatQueryParams = z.infer<typeof ChatQuerySchema>

const postHandler = ApiMiddleware.withValidation(ChatRequestSchema)(
  async (request: NextRequest, context: RequestContext, payload: ChatRequestPayload) => {
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
      const requestMetadata = mergeDefined(
        conversationOptions.metadata,
        payload.metadata,
        userMetadata ? { user: userMetadata } : undefined,
        { stream: streamRequested }
      )

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

      if (streamRequested) {
        const streamingResult = await chatService.streamChat(conversationId, latestMessage, chatOptions)
        const stream = toEventStream(request, streamingResult, {
          conversationId,
          requestId,
          created: conversationCreated,
        })

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

      return ApiMiddleware.createSuccessResponse(
        {
          conversationId,
          response,
        },
        'Chat response generated successfully',
        {
          requestId: response.requestId,
          processingTime: response.durationMs,
          provider: response.provider,
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

const getHandler = ApiMiddleware.withValidation(ChatQuerySchema, { validateQuery: true, validateBody: false })(
  async (_request: NextRequest, _context: RequestContext, query: ChatQueryParams) => {
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

// Next.js Route Handlers
export async function POST(request: NextRequest) {
  return await postHandler(request);
}

export async function GET(request: NextRequest) {
  return withAICache(
    request,
    'ai:chat',
    async () => await getHandler(request),
    300 // 5 minutes cache for conversation history
  )
}

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
): ConversationOptionsInput {
  const merged: ConversationOptionsInput = { ...options }

  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      ;(merged as any)[key] = value
    }
  }

  return merged
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
  ...sources: Array<Record<string, any> | undefined>
): Record<string, any> | undefined {
  const merged: Record<string, any> = {}

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
  info: { conversationId: string; requestId: string; created: boolean }
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
        try {
          while (iterator) {
            const { value, done } = await iterator.next()
            if (done) break
            const chunkEvent = `event: chunk\ndata: ${JSON.stringify(value)}\n\n`
            controller.enqueue(encoder.encode(chunkEvent))
          }

          const summary = await streamingResult.summary
          const completeEvent = `event: complete\ndata: ${JSON.stringify(summary)}\n\n`
          controller.enqueue(encoder.encode(completeEvent))
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
