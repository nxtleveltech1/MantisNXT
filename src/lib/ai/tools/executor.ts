/**
 * AI Tool Executor
 * Handles tool execution with permission checking, validation, and audit trails
 */

import { z } from 'zod';
import {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  ToolExecutionOptions,
  ToolPermissionError,
  ToolValidationError,
  ToolExecutionTimeoutError,
  ToolNotFoundError,
  toolResultSchema,
  toolExecutionOptionsSchema,
} from './types';
import { toolRegistry } from './registry';

/**
 * Tool Execution Handler
 * Function signature for tool implementations
 */
export type ToolExecutionHandler<TInput = unknown, TOutput = unknown> = (
  params: TInput,
  context: ToolExecutionContext
) => Promise<TOutput>;

/**
 * Tool Executor - Handles secure tool execution
 */
export class ToolExecutor {
  private static instance: ToolExecutor;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ToolExecutor {
    if (!ToolExecutor.instance) {
      ToolExecutor.instance = new ToolExecutor();
    }
    return ToolExecutor.instance;
  }

  /**
   * Execute a tool with full validation and security checks
   */
  public async execute(
    toolName: string,
    params: unknown,
    context: ToolExecutionContext,
    options: Partial<ToolExecutionOptions> = {}
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const executionOptions = toolExecutionOptionsSchema.parse({
      ...toolExecutionOptionsSchema.parse({}),
      ...options,
    });

    try {
      // 1. Get tool definition
      const tool = toolRegistry.getTool(toolName);
      if (!tool) {
        throw new ToolNotFoundError(toolName);
      }

      // 2. Check permissions
      await this.checkPermissions(tool, context);

      // 3. Validate input (if enabled)
      if (executionOptions.validateInput) {
        await this.validateInput(tool, params);
      }

      // 4. Execute with timeout
      const result = await this.executeWithTimeout(
        tool,
        params,
        context,
        executionOptions.timeout
      );

      // 5. Validate output (if enabled)
      if (executionOptions.validateOutput) {
        await this.validateOutput(tool, result);
      }

      // 6. Create audit trail
      const executionTimeMs = Date.now() - startTime;
      const toolResult: ToolResult = {
        success: true,
        data: result,
        executionTimeMs,
        auditInfo: {
          toolName,
          toolVersion: tool.version,
          executedAt: new Date(),
          executedBy: context.userId,
          context,
        },
      };

      // 7. Log successful execution (if audit enabled)
      if (executionOptions.audit) {
        await this.logExecution(toolResult);
      }

      return toolResult;

    } catch (error) {
      // Handle execution errors
      const executionTimeMs = Date.now() - startTime;
      const toolResult: ToolResult = {
        success: false,
        error: {
          code: this.getErrorCode(error),
          message: error instanceof Error ? error.message : 'Unknown error',
          details: executionOptions.audit ? error : undefined,
        },
        executionTimeMs,
        auditInfo: {
          toolName,
          toolVersion: toolRegistry.getTool(toolName)?.version || 'unknown',
          executedAt: new Date(),
          executedBy: context.userId,
          context,
        },
      };

      // Log failed execution
      if (executionOptions.audit) {
        await this.logExecution(toolResult);
      }

      return toolResult;
    }
  }

  /**
   * Check if user has required permissions for tool
   */
  private async checkPermissions(
    tool: ToolDefinition,
    context: ToolExecutionContext
  ): Promise<void> {
    // For now, implement basic permission checking
    // In production, this would integrate with your auth system
    const userPermissions = await this.getUserPermissions(context.userId);

    const hasPermissions = tool.requiredPermissions.every(perm =>
      userPermissions.includes(perm)
    );

    if (!hasPermissions) {
      throw new ToolPermissionError(tool.name, tool.requiredPermissions);
    }
  }

  /**
   * Validate tool input parameters
   */
  private async validateInput(tool: ToolDefinition, params: unknown): Promise<void> {
    try {
      // Parse and validate input using tool's Zod schema
      tool.inputSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ToolValidationError(tool.name, error);
      }
      throw error;
    }
  }

  /**
   * Validate tool output
   */
  private async validateOutput(tool: ToolDefinition, result: unknown): Promise<void> {
    try {
      // Parse and validate output using tool's Zod schema
      tool.outputSchema.parse(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ToolValidationError(tool.name, error);
      }
      throw error;
    }
  }

  /**
   * Execute tool with timeout protection
   */
  private async executeWithTimeout(
    tool: ToolDefinition,
    params: unknown,
    context: ToolExecutionContext,
    timeoutMs: number
  ): Promise<unknown> {
    // For now, we assume tools are synchronous functions
    // In a real implementation, you'd have a tool registry that maps to actual implementations

    // This is a placeholder - actual tool implementations would be registered separately
    const toolHandler = this.getToolHandler(tool.name);
    if (!toolHandler) {
      throw new ToolNotFoundError(tool.name);
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ToolExecutionTimeoutError(tool.name, timeoutMs));
      }, timeoutMs);
    });

    // Race between execution and timeout
    return Promise.race([
      toolHandler(params, context),
      timeoutPromise,
    ]);
  }

  /**
   * Get tool handler implementation (placeholder)
   * In production, this would be a proper registry of tool implementations
   */
  private getToolHandler(toolName: string): ToolExecutionHandler | null {
    // This is a placeholder implementation
    // Actual tool implementations would be registered in a separate system
    return null;
  }

  /**
   * Get user permissions (placeholder)
   * In production, this would integrate with your auth/permissions system
   */
  private async getUserPermissions(userId: string): Promise<string[]> {
    // Placeholder - return all permissions for now
    // In production, this would query your permissions database
    return ['read', 'write', 'admin'];
  }

  /**
   * Log tool execution for audit trail
   */
  private async logExecution(result: ToolResult): Promise<void> {
    // Placeholder logging implementation
    // In production, this would integrate with your logging system
    const logLevel = result.success ? 'info' : 'error';
    const message = `Tool execution: ${result.auditInfo.toolName}`;

    console[logLevel](message, {
      toolName: result.auditInfo.toolName,
      userId: result.auditInfo.executedBy,
      executionTimeMs: result.executionTimeMs,
      success: result.success,
      error: result.error,
    });
  }

  /**
   * Extract error code from various error types
   */
  private getErrorCode(error: unknown): string {
    if (error instanceof ToolPermissionError) return 'PERMISSION_DENIED';
    if (error instanceof ToolValidationError) return 'VALIDATION_ERROR';
    if (error instanceof ToolExecutionTimeoutError) return 'EXECUTION_TIMEOUT';
    if (error instanceof ToolNotFoundError) return 'TOOL_NOT_FOUND';
    return 'EXECUTION_ERROR';
  }

  /**
   * Execute multiple tools in sequence
   */
  public async executeBatch(
    executions: Array<{
      toolName: string;
      params: unknown;
      context: ToolExecutionContext;
      options?: Partial<ToolExecutionOptions>;
    }>
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const execution of executions) {
      const result = await this.execute(
        execution.toolName,
        execution.params,
        execution.context,
        execution.options
      );
      results.push(result);

      // Stop on first failure if not explicitly configured to continue
      if (!result.success && !execution.options?.dryRun) {
        break;
      }
    }

    return results;
  }
}

// Export singleton instance
export const toolExecutor = ToolExecutor.getInstance();