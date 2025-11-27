import { z } from 'zod';

// Audit event types
export type AuditEventType =
  | 'tool_execution'
  | 'decision'
  | 'access_check'
  | 'approval'
  | 'error'
  | 'conversation';

export type AuditSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

// Base audit event schema
export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  eventType: z.enum(['tool_execution', 'decision', 'access_check', 'approval', 'error', 'conversation']),
  severity: z.enum(['debug', 'info', 'warning', 'error', 'critical']),
  timestamp: z.date(),
  orgId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  toolName: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  result: z.any().optional(),
  reasoning: z.string().optional(),
  alternatives: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// Specialized audit event types
export const ToolExecutionAuditSchema = AuditEventSchema.extend({
  eventType: z.literal('tool_execution'),
  toolName: z.string(),
  parameters: z.record(z.any()),
  result: z.any(),
});

export type ToolExecutionAudit = z.infer<typeof ToolExecutionAuditSchema>;

export const DecisionAuditSchema = AuditEventSchema.extend({
  eventType: z.literal('decision'),
  reasoning: z.string(),
  alternatives: z.array(z.string()).optional(),
});

export type DecisionAudit = z.infer<typeof DecisionAuditSchema>;

export const AccessCheckAuditSchema = AuditEventSchema.extend({
  eventType: z.literal('access_check'),
  resource: z.string(),
  result: z.boolean(),
});

export type AccessCheckAudit = z.infer<typeof AccessCheckAuditSchema>;

// Query and filtering
export const AuditQuerySchema = z.object({
  orgId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  eventType: z.array(z.string()).optional(),
  severity: z.array(z.string()).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
});

export type AuditQuery = z.infer<typeof AuditQuerySchema>;

// Statistics and summaries
export const AuditSummarySchema = z.object({
  totalEvents: z.number(),
  eventsByType: z.record(z.number()),
  eventsBySeverity: z.record(z.number()),
  timeRange: z.object({
    start: z.date(),
    end: z.date(),
  }),
  topTools: z.array(z.object({
    toolName: z.string(),
    count: z.number(),
  })),
  errorRate: z.number(),
});

export type AuditSummary = z.infer<typeof AuditSummarySchema>;

// Explanation types
export const DecisionExplanationSchema = z.object({
  decision: z.string(),
  reasoning: z.string(),
  alternatives: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.array(z.string()).optional(),
  formatted: z.string(),
});

export type DecisionExplanation = z.infer<typeof DecisionExplanationSchema>;

// Workflow explanation
export const WorkflowExplanationSchema = z.object({
  sessionId: z.string().uuid(),
  steps: z.array(z.object({
    step: z.number(),
    timestamp: z.date(),
    eventType: z.string(),
    description: z.string(),
    explanation: z.string(),
  })),
  summary: z.string(),
});

export type WorkflowExplanation = z.infer<typeof WorkflowExplanationSchema>;

// Export validation schemas
export const AuditSchemas = {
  AuditEvent: AuditEventSchema,
  ToolExecutionAudit: ToolExecutionAuditSchema,
  DecisionAudit: DecisionAuditSchema,
  AccessCheckAudit: AccessCheckAuditSchema,
  AuditQuery: AuditQuerySchema,
  AuditSummary: AuditSummarySchema,
  DecisionExplanation: DecisionExplanationSchema,
  WorkflowExplanation: WorkflowExplanationSchema,
} as const;