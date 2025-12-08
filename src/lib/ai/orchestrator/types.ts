/**
 * AI Orchestrator Types
 * Core type definitions for the orchestrator service with Zod validation
 */

import { z } from 'zod';
import type { AIProviderId, AIChatMessage, AIUsageMetrics } from '@/types/ai';
import type { ToolResult } from '../tools/types';

// Orchestrator Configuration
export const orchestratorConfigSchema = z.object({
  // Provider preferences and fallback rules
  providerPreferences: z.record(z.string(), z.number().min(0).max(1)).default({}),
  fallbackChain: z.array(z.string() as z.ZodType<AIProviderId>).default([]),

  // Timeouts and limits
  requestTimeoutMs: z.number().int().min(1000).max(300000).default(30000),
  maxConcurrentRequests: z.number().int().min(1).max(100).default(10),
  maxRetries: z.number().int().min(0).max(5).default(2),

  // Feature flags
  enableStreaming: z.boolean().default(true),
  enableToolExecution: z.boolean().default(true),
  enablePlanning: z.boolean().default(true),
  enableContextManagement: z.boolean().default(true),

  // Context limits
  maxConversationHistory: z.number().int().min(1).max(1000).default(50),
  maxContextLength: z.number().int().min(1000).max(100000).default(8000),

  // Monitoring and observability
  enableMetrics: z.boolean().default(true),
  enableAuditLogging: z.boolean().default(true),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type OrchestratorConfig = z.infer<typeof orchestratorConfigSchema>;

// Orchestrator Session
export const orchestratorSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  orgId: z.string().uuid().optional(),
  createdAt: z.date().default(() => new Date()),
  lastActivityAt: z.date().default(() => new Date()),
  metadata: z.record(z.unknown()).default({}),
  preferences: z.record(z.unknown()).default({}),
});

export type OrchestratorSession = z.infer<typeof orchestratorSessionSchema>;

// Conversation Turn Types
export const conversationTurnSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'tool', 'system']),
  content: z.string(),
  timestamp: z.date().default(() => new Date()),
  metadata: z.record(z.unknown()).default({}),
  // For tool calls
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        arguments: z.unknown(),
      })
    )
    .optional(),
  // For tool results
  toolResults: z
    .array(
      z.object({
        toolCallId: z.string(),
        result: z.unknown(),
        success: z.boolean(),
        executionTimeMs: z.number().int().min(0),
      })
    )
    .optional(),
});

export type ConversationTurn = z.infer<typeof conversationTurnSchema>;

// Orchestrator Request
export const orchestratorRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1),
  conversationHistory: z.array(conversationTurnSchema).default([]),
  context: z.record(z.unknown()).default({}),
  options: z
    .object({
      stream: z.boolean().default(false),
      timeout: z.number().int().min(1000).max(300000).optional(),
      maxTokens: z.number().int().min(1).max(100000).optional(),
      temperature: z.number().min(0).max(2).optional(),
      tools: z.array(z.string()).default([]), // Tool names to enable
    })
    .default({}),
});

export type OrchestratorRequest = z.infer<typeof orchestratorRequestSchema>;

// Tool Call with Results
export const toolCallWithResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.unknown(),
  result: z.unknown().optional(),
  success: z.boolean().optional(),
  executionTimeMs: z.number().int().min(0).optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
});

export type ToolCallWithResult = z.infer<typeof toolCallWithResultSchema>;

// Orchestrator Response
export const orchestratorResponseSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string(),
  toolCalls: z.array(toolCallWithResultSchema).default([]),
  citations: z
    .array(
      z.object({
        source: z.string(),
        text: z.string(),
        confidence: z.number().min(0).max(1).optional(),
      })
    )
    .default([]),
  usage: z.object({
    promptTokens: z.number().int().min(0).optional(),
    completionTokens: z.number().int().min(0).optional(),
    totalTokens: z.number().int().min(0).optional(),
    durationMs: z.number().int().min(0),
    provider: z.string(),
    model: z.string(),
  }),
  metadata: z.record(z.unknown()).default({}),
  finished: z.boolean().default(true),
});

export type OrchestratorResponse = z.infer<typeof orchestratorResponseSchema>;

// Plan Step Types
export const planStepSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  toolName: z.string().optional(),
  parameters: z.record(z.unknown()).default({}),
  dependencies: z.array(z.string()).default([]), // IDs of steps this depends on
  estimatedDurationMs: z.number().int().min(0).optional(),
  priority: z.number().int().min(1).max(10).default(5),
  retryPolicy: z
    .object({
      maxRetries: z.number().int().min(0).max(5).default(0),
      backoffMs: z.number().int().min(0).default(1000),
    })
    .default({}),
});

export type PlanStep = z.infer<typeof planStepSchema>;

// Execution Plan
export const executionPlanSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  intent: z.string(),
  steps: z.array(planStepSchema),
  createdAt: z.date().default(() => new Date()),
  estimatedTotalDurationMs: z.number().int().min(0).optional(),
  rollbackSteps: z.array(planStepSchema).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export type ExecutionPlan = z.infer<typeof executionPlanSchema>;

// Plan Execution Result
export const planExecutionResultSchema = z.object({
  planId: z.string().uuid(),
  success: z.boolean(),
  completedSteps: z.array(
    z.object({
      stepId: z.string(),
      success: z.boolean(),
      result: z.unknown().optional(),
      executionTimeMs: z.number().int().min(0),
      error: z
        .object({
          code: z.string(),
          message: z.string(),
          details: z.unknown().optional(),
        })
        .optional(),
    })
  ),
  failedSteps: z
    .array(
      z.object({
        stepId: z.string(),
        error: z.object({
          code: z.string(),
          message: z.string(),
          details: z.unknown().optional(),
        }),
        retryCount: z.number().int().min(0),
      })
    )
    .default([]),
  totalExecutionTimeMs: z.number().int().min(0),
  rollbackExecuted: z.boolean().default(false),
});

export type PlanExecutionResult = z.infer<typeof planExecutionResultSchema>;

// Orchestrator State Machine
export const orchestratorStateSchema = z.enum([
  'idle',
  'processing_request',
  'generating_plan',
  'executing_plan',
  'executing_tools',
  'streaming_response',
  'error',
  'completed',
]);

export type OrchestratorState = z.infer<typeof orchestratorStateSchema>;

// Orchestrator Event Types
export const orchestratorEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  type: z.enum([
    'session_created',
    'session_updated',
    'request_received',
    'provider_selected',
    'plan_generated',
    'tool_executed',
    'response_generated',
    'error_occurred',
    'session_ended',
  ]),
  timestamp: z.date().default(() => new Date()),
  data: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({}),
});

export type OrchestratorEvent = z.infer<typeof orchestratorEventSchema>;

// Intent Analysis
export const intentAnalysisSchema = z.object({
  primaryIntent: z.string(),
  confidence: z.number().min(0).max(1),
  entities: z.record(z.unknown()).default({}),
  requiresPlanning: z.boolean(),
  requiresTools: z.boolean(),
  estimatedComplexity: z.enum(['low', 'medium', 'high']),
  suggestedTools: z.array(z.string()).default([]),
});

export type IntentAnalysis = z.infer<typeof intentAnalysisSchema>;

// Recovery Action Types
export const recoveryActionSchema = z.enum(['retry', 'skip', 'rollback', 'escalate', 'abort']);

export type RecoveryAction = z.infer<typeof recoveryActionSchema>;

// Validation Result
export const validationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z
    .array(
      z.object({
        field: z.string(),
        code: z.string(),
        message: z.string(),
      })
    )
    .default([]),
  warnings: z
    .array(
      z.object({
        field: z.string(),
        code: z.string(),
        message: z.string(),
      })
    )
    .default([]),
});

export type ValidationResult = z.infer<typeof validationResultSchema>;

// Streaming Response Types
export const streamChunkSchema = z.object({
  type: z.enum(['text', 'tool_call', 'tool_result', 'error', 'done']),
  content: z.string().optional(),
  toolCall: toolCallWithResultSchema.optional(),
  done: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});

export type StreamChunk = z.infer<typeof streamChunkSchema>;

// Async Iterator for Streaming
export type OrchestratorStream = AsyncIterable<StreamChunk>;

// Error Types
export class OrchestratorError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

export class OrchestratorTimeoutError extends OrchestratorError {
  constructor(timeoutMs: number) {
    super(`Orchestrator operation timed out after ${timeoutMs}ms`, 'TIMEOUT', { timeoutMs });
    this.name = 'OrchestratorTimeoutError';
  }
}

export class OrchestratorValidationError extends OrchestratorError {
  constructor(validationErrors: z.ZodError) {
    super(`Orchestrator validation failed: ${validationErrors.message}`, 'VALIDATION_ERROR', {
      validationErrors: validationErrors.errors,
    });
    this.name = 'OrchestratorValidationError';
  }
}

export class OrchestratorProviderError extends OrchestratorError {
  constructor(providerId: string, originalError: unknown) {
    super(`Provider ${providerId} failed`, 'PROVIDER_ERROR', { providerId, originalError });
    this.name = 'OrchestratorProviderError';
  }
}
