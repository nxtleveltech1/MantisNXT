/**
 * AI Tools Framework
 * Main exports for the tool system
 */

// Core Types and Schemas
export * from './types';

// Tool Registry
export { toolRegistry } from './registry';
export { ToolRegistry } from './registry';

// Tool Executor
export { toolExecutor } from './executor';
export { ToolExecutor } from './executor';

// Built-in Tools
export { registerBuiltInTools, getSystemContextForAI, builtInToolDefinitions } from './built-in/index';

// MCP Bridge
export { mcpBridge } from './mcp-bridge';
export { MCPBridge } from './mcp-bridge';

// Convenience exports for common use cases
export type {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  ToolExecutionOptions,
  ToolCategory,
  ToolAccessLevel,
  OpenAIFunction,
} from './types';

export {
  ToolError,
  ToolPermissionError,
  ToolValidationError,
  ToolExecutionTimeoutError,
  ToolNotFoundError,
} from './types';