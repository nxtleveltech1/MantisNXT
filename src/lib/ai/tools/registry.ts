/**
 * AI Tool Registry
 * Manages tool registration, discovery, and access control
 */

import { z } from 'zod';
import {
  ToolDefinition,
  ToolRegistry as ToolRegistryType,
  ToolCategory,
  ToolAccessLevel,
  ToolExecutionContext,
  ToolNotFoundError,
  toolDefinitionSchema,
  toolRegistrySchema,
  openAIFunctionSchema,
  OpenAIFunction,
} from './types';

/**
 * Tool Registry - Singleton pattern for managing tool definitions
 */
export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, ToolDefinition> = new Map();
  private lastUpdated: Date = new Date();
  private version: string = '1.0.0';

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Register a new tool
   */
  public registerTool(tool: ToolDefinition): void {
    // Validate tool definition
    const validatedTool = toolDefinitionSchema.parse(tool);

    // Check for duplicate names
    if (this.tools.has(validatedTool.name)) {
      throw new Error(`Tool '${validatedTool.name}' is already registered`);
    }

    this.tools.set(validatedTool.name, validatedTool);
    this.lastUpdated = new Date();
  }

  /**
   * Get a tool by name
   */
  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Remove a tool (for testing/admin purposes)
   */
  public unregisterTool(name: string): boolean {
    const removed = this.tools.delete(name);
    if (removed) {
      this.lastUpdated = new Date();
    }
    return removed;
  }

  /**
   * List all tools, optionally filtered by category
   */
  public listTools(category?: ToolCategory): ToolDefinition[] {
    const tools = Array.from(this.tools.values());

    if (category) {
      return tools.filter(tool => tool.category === category);
    }

    return tools;
  }

  /**
   * List tools available to a specific user based on permissions
   */
  public listToolsForUser(
    userId: string,
    userPermissions: string[],
    category?: ToolCategory
  ): ToolDefinition[] {
    const allTools = this.listTools(category);

    return allTools.filter(tool => {
      // Check if user has all required permissions
      const hasPermissions = tool.requiredPermissions.every(perm => userPermissions.includes(perm));

      return hasPermissions;
    });
  }

  /**
   * Get tools schema in OpenAI function calling format
   */
  public getToolsSchema(
    userId?: string,
    userPermissions?: string[],
    category?: ToolCategory
  ): OpenAIFunction[] {
    const tools =
      userId && userPermissions
        ? this.listToolsForUser(userId, userPermissions, category)
        : this.listTools(category);

    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: this.convertZodToJsonSchema(tool.inputSchema),
    }));
  }

  /**
   * Get registry statistics
   */
  public getStats() {
    const tools = Array.from(this.tools.values());
    const categories = new Set(tools.map(t => t.category));
    const accessLevels = new Set(tools.map(t => t.accessLevel));

    return {
      totalTools: tools.length,
      categories: Array.from(categories),
      accessLevels: Array.from(accessLevels),
      lastUpdated: this.lastUpdated,
      version: this.version,
    };
  }

  /**
   * Export registry as serializable object
   */
  public export(): ToolRegistryType {
    return toolRegistrySchema.parse({
      tools: Object.fromEntries(this.tools),
      lastUpdated: this.lastUpdated,
      version: this.version,
    });
  }

  /**
   * Import registry from serializable object
   */
  public import(registryData: ToolRegistryType): void {
    const validated = toolRegistrySchema.parse(registryData);

    this.tools.clear();
    Object.entries(validated.tools).forEach(([name, tool]) => {
      this.tools.set(name, tool);
    });

    this.lastUpdated = validated.lastUpdated;
    this.version = validated.version;
  }

  /**
   * Clear all tools (for testing)
   */
  public clear(): void {
    this.tools.clear();
    this.lastUpdated = new Date();
  }

  /**
   * Convert Zod schema to JSON Schema (simplified for OpenAI compatibility)
   * This is a basic implementation - for production, consider using a proper converter
   */
  private convertZodToJsonSchema(zodSchema: z.ZodTypeAny): Record<string, unknown> {
    try {
      // For now, return a basic schema structure
      // In production, you'd want a more sophisticated Zod-to-JSON-Schema converter
      return {
        type: 'object',
        properties: {},
        required: [],
      };
    } catch (error) {
      // Fallback for complex schemas
      return {
        type: 'object',
        description: 'Tool parameters',
      };
    }
  }
}

// Export singleton instance
export const toolRegistry = ToolRegistry.getInstance();
