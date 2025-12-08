import { randomUUID } from 'node:crypto';

import type { ToolCallWithResult } from './types';

export type RawToolCall = {
  id?: string;
  name?: string;
  arguments?: unknown;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  providerMetadata?: unknown;
};

const extractArguments = (toolCall: RawToolCall): unknown => {
  if (typeof toolCall !== 'object' || toolCall === null) {
    return {};
  }

  if (toolCall.input !== undefined) return toolCall.input;
  if (toolCall.arguments !== undefined) return toolCall.arguments;

  const fallbackArgs = (toolCall as Record<string, unknown>).args;
  if (fallbackArgs !== undefined) return fallbackArgs;

  return {};
};

export const normalizeToolCalls = (toolCalls: Array<RawToolCall> | undefined): ToolCallWithResult[] => {
  if (!toolCalls || toolCalls.length === 0) return [];

  return toolCalls.map(toolCall => {
    const id = toolCall.toolCallId ?? toolCall.id ?? randomUUID();
    const name = toolCall.toolName ?? toolCall.name ?? 'unknown-tool';
    const args = extractArguments(toolCall);

    return {
      id,
      name,
      arguments: args,
      success: undefined,
      executionTimeMs: undefined,
    } satisfies ToolCallWithResult;
  });
};

export const normalizeSingleToolCall = (toolCall: RawToolCall | undefined): ToolCallWithResult | undefined => {
  if (!toolCall) return undefined;
  return normalizeToolCalls([toolCall])[0];
};
