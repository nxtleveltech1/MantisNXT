/**
 * Resource Access Layer Types
 * Core type definitions for access control and approval workflows
 */

import { z } from 'zod';
import { ToolAccessLevel } from '../tools/types';

// Access Levels - reusing from tool framework for consistency
export const accessLevelSchema = z.enum(['read-only', 'read-write-approval', 'autonomous']);
export type AccessLevel = z.infer<typeof accessLevelSchema>;

// Resource Types
export const resourceTypeSchema = z.enum([
  'inventory',
  'suppliers',
  'orders',
  'customers',
  'analytics',
  'settings',
]);
export type ResourceType = z.infer<typeof resourceTypeSchema>;

// Permission Schema
export const permissionSchema = z.object({
  resource: resourceTypeSchema,
  level: accessLevelSchema,
  scope: z.array(z.string()).optional(), // e.g., ['store:123', 'region:us-west']
});
export type Permission = z.infer<typeof permissionSchema>;

// Access Policy Schema
export const accessPolicySchema = z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  permissions: z.array(permissionSchema),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type AccessPolicy = z.infer<typeof accessPolicySchema>;

// Access Context Schema
export const accessContextSchema = z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  sessionId: z.string().uuid(),
  conversationId: z.string().uuid(),
  timestamp: z.date().default(() => new Date()),
  requestedResource: resourceTypeSchema,
  requestedAction: z.string(), // e.g., 'create', 'update', 'delete', 'read'
  toolName: z.string().optional(),
});
export type AccessContext = z.infer<typeof accessContextSchema>;

// Pending Action Schema
export const pendingActionSchema = z.object({
  id: z.string().uuid(),
  context: accessContextSchema,
  toolDefinition: z.any(), // ToolDefinition from tools/types
  parameters: z.record(z.unknown()),
  requestedAt: z.date().default(() => new Date()),
  expiresAt: z.date(),
  status: z.enum(['pending', 'approved', 'denied', 'expired', 'cancelled']),
  approvalReason: z.string().optional(),
  approvedBy: z.string().uuid().optional(),
  approvedAt: z.date().optional(),
});
export type PendingAction = z.infer<typeof pendingActionSchema>;

// Approval Request Schema
export const approvalRequestSchema = z.object({
  actionId: z.string().uuid(),
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  summary: z.string(),
  details: z.object({
    resource: resourceTypeSchema,
    action: z.string(),
    toolName: z.string().optional(),
    parameters: z.record(z.unknown()),
    potentialImpact: z.string(),
  }),
  requestedAt: z.date().default(() => new Date()),
  expiresAt: z.date(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});
export type ApprovalRequest = z.infer<typeof approvalRequestSchema>;

// Approval Response Schema
export const approvalResponseSchema = z.object({
  actionId: z.string().uuid(),
  approved: z.boolean(),
  approvedBy: z.string().uuid(),
  approvedAt: z.date().default(() => new Date()),
  reason: z.string().optional(),
  modifications: z.record(z.unknown()).optional(), // user can modify parameters
  conditions: z.array(z.string()).optional(), // additional conditions for approval
});
export type ApprovalResponse = z.infer<typeof approvalResponseSchema>;

// Error Classes
export class AccessDeniedError extends Error {
  constructor(
    message: string,
    public resource: ResourceType,
    public requiredLevel: AccessLevel,
    public currentLevel: AccessLevel
  ) {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

export class ApprovalRequiredError extends Error {
  constructor(
    message: string,
    public actionId: string,
    public resource: ResourceType,
    public context: AccessContext
  ) {
    super(message);
    this.name = 'ApprovalRequiredError';
  }
}

export class ApprovalTimeoutError extends Error {
  constructor(
    message: string,
    public actionId: string,
    public timeoutMs: number
  ) {
    super(message);
    this.name = 'ApprovalTimeoutError';
  }
}

export class ApprovalDeniedError extends Error {
  constructor(
    message: string,
    public actionId: string,
    public reason: string,
    public deniedBy: string
  ) {
    super(message);
    this.name = 'ApprovalDeniedError';
  }
}

// Event Types for real-time notifications
export interface AccessEvent {
  type: 'approval_requested' | 'approval_granted' | 'approval_denied' | 'approval_expired';
  actionId: string;
  userId: string;
  orgId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

// Queue Statistics
export const queueStatsSchema = z.object({
  totalPending: z.number(),
  totalApproved: z.number(),
  totalDenied: z.number(),
  totalExpired: z.number(),
  averageWaitTime: z.number(), // in milliseconds
  oldestPending: z.date().optional(),
});
export type QueueStats = z.infer<typeof queueStatsSchema>;
