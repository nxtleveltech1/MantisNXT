/**
 * AI Orchestrator Module
 * Main exports for the orchestrator service
 */

import { UnifiedAIOrchestrator } from './UnifiedAIOrchestrator';

// Export all types and schemas
export * from './types';

// Export main classes
export { UnifiedAIOrchestrator };
export { ContextManager, contextManager } from './context-manager';
export { Planner, planner } from './planner';

// Export singleton instances for convenience
export const orchestrator = new UnifiedAIOrchestrator({
  // Default configuration - can be overridden by consumers
  providerPreferences: {},
  fallbackChain: [],
  requestTimeoutMs: 30000,
  maxConcurrentRequests: 10,
  maxRetries: 2,
  enableStreaming: true,
  enableToolExecution: true,
  enablePlanning: true,
  enableContextManagement: true,
  maxConversationHistory: 50,
  maxContextLength: 8000,
  enableMetrics: true,
  enableAuditLogging: true,
  logLevel: 'info',
});
