// AI Audit and Explainability System
// Main exports for the audit logging and explanation functionality

// Core classes
export { AuditLogger, auditLogger } from './logger';
export { Explainer, explainer } from './explainer';

// Types and schemas
export type {
  AuditEventType,
  AuditSeverity,
  AuditEvent,
  ToolExecutionAudit,
  DecisionAudit,
  AccessCheckAudit,
  AuditQuery,
  AuditSummary,
  DecisionExplanation,
  WorkflowExplanation,
} from './types';

export { AuditSchemas } from './types';

// Re-export commonly used functions for convenience
export const {
  logToolExecution,
  logDecision,
  logAccessCheck,
  logApproval,
  logError,
  logConversation,
  query,
  getStatistics,
  onEvent,
} = auditLogger;

export const {
  explainToolCall,
  explainDecision,
  explainAccessDenial,
  explainWorkflow,
  generateSummary,
  exportAuditTrail,
  formatForUser,
} = explainer;