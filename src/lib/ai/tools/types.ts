/**
 * AI Tool Framework Types
 * Core type definitions for the tool system with Zod validation
 */

import { z } from 'zod';

// Tool Access Levels
export const toolAccessLevelSchema = z.enum(['read-only', 'read-write-approval', 'autonomous']);
export type ToolAccessLevel = z.infer<typeof toolAccessLevelSchema>;

// Tool Categories
export const toolCategorySchema = z.enum([
  'inventory',
  'suppliers',
  'orders',
  'analytics',
  'customers',
  'system',
  'external',
]);
export type ToolCategory = z.infer<typeof toolCategorySchema>;

// Tool Execution Context
export const toolExecutionContextSchema = z.object({
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  conversationId: z.string().uuid(),
  timestamp: z.date().default(() => new Date()),
});
export type ToolExecutionContext = z.infer<typeof toolExecutionContextSchema>;

// Tool Definition Schema
export const toolDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: toolCategorySchema,
  inputSchema: z.any(), // Zod schema for input validation
  outputSchema: z.any(), // Zod schema for output validation
  accessLevel: toolAccessLevelSchema,
  requiredPermissions: z.array(z.string()).default([]),
  version: z.string().default('1.0.0'),
  metadata: z.record(z.unknown()).optional(),
});
export type ToolDefinition = z.infer<typeof toolDefinitionSchema>;

// Tool Result Schema
export const toolResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }).optional(),
  executionTimeMs: z.number().int().min(0),
  auditInfo: z.object({
    toolName: z.string(),
    toolVersion: z.string(),
    executedAt: z.date(),
    executedBy: z.string().uuid(),
    context: toolExecutionContextSchema,
  }),
});
export type ToolResult = z.infer<typeof toolResultSchema>;

// OpenAI Function Calling Format
export const openAIFunctionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.unknown()), // JSON Schema format
});
export type OpenAIFunction = z.infer<typeof openAIFunctionSchema>;

// Tool Registry Schema
export const toolRegistrySchema = z.object({
  tools: z.record(toolDefinitionSchema),
  lastUpdated: z.date(),
  version: z.string(),
});
export type ToolRegistry = z.infer<typeof toolRegistrySchema>;

// MCP Tool Configuration
export const mcpToolConfigSchema = z.object({
  serverUrl: z.string().url(),
  serverName: z.string(),
  tools: z.array(z.string()),
  authToken: z.string().optional(),
  timeout: z.number().int().min(1000).max(30000).default(10000),
  retryAttempts: z.number().int().min(0).max(3).default(1),
});
export type MCPToolConfig = z.infer<typeof mcpToolConfigSchema>;

// Tool Execution Options
export const toolExecutionOptionsSchema = z.object({
  timeout: z.number().int().min(1000).max(60000).default(30000),
  validateInput: z.boolean().default(true),
  validateOutput: z.boolean().default(true),
  audit: z.boolean().default(true),
  dryRun: z.boolean().default(false),
});
export type ToolExecutionOptions = z.infer<typeof toolExecutionOptionsSchema>;

// Tool Error Types
export class ToolError extends Error {
  constructor(
    message: string,
    public code: string,
    public toolName: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ToolError';
  }
}

export class ToolPermissionError extends ToolError {
  constructor(toolName: string, requiredPermissions: string[]) {
    super(
      `Insufficient permissions to execute tool '${toolName}'. Required: ${requiredPermissions.join(', ')}`,
      'INSUFFICIENT_PERMISSIONS',
      toolName,
      { requiredPermissions }
    );
    this.name = 'ToolPermissionError';
  }
}

export class ToolValidationError extends ToolError {
  constructor(toolName: string, validationErrors: z.ZodError) {
    super(
      `Input validation failed for tool '${toolName}': ${validationErrors.message}`,
      'VALIDATION_ERROR',
      toolName,
      { validationErrors: validationErrors.errors }
    );
    this.name = 'ToolValidationError';
  }
}

export class ToolExecutionTimeoutError extends ToolError {
  constructor(toolName: string, timeoutMs: number) {
    super(
      `Tool '${toolName}' execution timed out after ${timeoutMs}ms`,
      'EXECUTION_TIMEOUT',
      toolName,
      { timeoutMs }
    );
    this.name = 'ToolExecutionTimeoutError';
  }
}

export class ToolNotFoundError extends ToolError {
  constructor(toolName: string) {
    super(
      `Tool '${toolName}' not found in registry`,
      'TOOL_NOT_FOUND',
      toolName
    );
    this.name = 'ToolNotFoundError';
  }
}