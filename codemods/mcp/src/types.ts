import type { z } from 'zod';

/**
 * Generic MCP-style tool definition.
 */
export interface MCPTool {
  description: string;
  schema: z.ZodSchema<unknown>;
  handler: (args: unknown) => Promise<unknown> | unknown;
}

/**
 * Map of toolName → tool definition.
 */
export type ToolMap = Record<string, MCPTool>;

/**
 * Normalized result envelope.
 */
export interface MCPResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Run a tool with Zod validation + error packaging.
 */
export async function runToolHandler(tool: MCPTool, args: unknown): Promise<MCPResult> {
  try {
    const validated = tool.schema.parse(args ?? {});
    const result = await tool.handler(validated);
    return { ok: true, data: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: message,
    };
  }
}
