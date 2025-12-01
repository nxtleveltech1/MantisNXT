/**
 * Resource Access Layer
 * Main exports for the AI access control system
 */

// Types and Schemas
export type {
  AccessLevel,
  ResourceType,
  Permission,
  AccessPolicy,
  AccessContext,
  PendingAction,
  ApprovalRequest,
  ApprovalResponse,
  QueueStats,
  AccessEvent,
} from './types';

export {
  accessLevelSchema,
  resourceTypeSchema,
  permissionSchema,
  accessPolicySchema,
  accessContextSchema,
  pendingActionSchema,
  approvalRequestSchema,
  approvalResponseSchema,
  queueStatsSchema,
} from './types';

// Error Classes
export {
  AccessDeniedError,
  ApprovalRequiredError,
  ApprovalTimeoutError,
  ApprovalDeniedError,
} from './types';

// Core Classes
export { PermissionResolver, permissionResolver } from './permission-resolver';
export { ActionQueue, actionQueue } from './action-queue';
export { ApprovalWorkflow, approvalWorkflow } from './approval-workflow';

// Re-export tool access level type for convenience
export type { ToolAccessLevel } from '../tools/types';
