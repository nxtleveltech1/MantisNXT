import { type ZodSchema, type ZodError } from 'zod';
import type { ApiResponse } from '@/lib/api/base';
import type { AITextResult, AIChatResult, AIEmbeddingResult, AIStreamChunk } from '@/types/ai';

export interface StructuredParseOptions<TSchema extends ZodSchema | undefined = undefined> {
  schema?: TSchema;
  mode?: 'json' | 'auto';
  fallback?: unknown;
}

export interface StructuredParseResult<TData = unknown> {
  data?: TData;
  issues: string[];
  raw: string;
}

export interface ResponseValidationResult<TData = unknown> {
  valid: boolean;
  data?: TData;
  issues?: string[];
}

export interface ResponseFormatOptions {
  requestId: string;
  metadata?: Record<string, unknown>;
}

export interface ResponseQualityScore {
  completeness: number;
  structure: number;
  overall: number;
  notes?: string[];
}

export class ResponseProcessor {
  parseStructuredResponse<TData = unknown, TSchema extends ZodSchema | undefined = undefined>(
    response: string | AITextResult | AIChatResult,
    options: StructuredParseOptions<TSchema> = {}
  ): StructuredParseResult<TData> {
    const raw = this.extractPrimaryText(response);
    const issues: string[] = [];

    if (!raw) {
      return { data: options.fallback, issues: ['Empty response payload.'], raw: '' };
    }

    if (options.mode === 'json' || options.mode === undefined) {
      const parsed = this.tryParseJson(raw);
      if (parsed.success) {
        if (options.schema) {
          const validation = options.schema.safeParse(parsed.data);
          if (validation.success) {
            return { data: validation.data as TData, issues, raw };
          }
          issues.push(...this.formatZodErrors(validation.error));
          return { data: options.fallback, issues, raw };
        }
        return { data: parsed.data as TData, issues, raw };
      }
      issues.push(parsed.error ?? 'Unable to parse JSON payload.');
    }

    if (options.mode === 'auto') {
      const recovered = this.recoverJsonBlock(raw);
      if (recovered) {
        return this.parseStructuredResponse(recovered, { ...options, mode: 'json' });
      }
    }

    return { data: options.fallback, issues, raw };
  }

  extractData(
    result: string | AITextResult | AIChatResult | AIEmbeddingResult
  ): Record<string, unknown> {
    if (typeof result === 'string') {
      return { text: result };
    }

    if ('vector' in result) {
      return {
        vector: Array.from(result.vector),
        usage: result.usage,
        provider: result.provider,
        model: result.model,
      };
    }

    if ('messages' in result) {
      return {
        text: result.text,
        messages: result.messages,
        raw: result.rawResponse,
        usage: result.usage,
        provider: result.provider,
        model: result.model,
      };
    }

    return {
      text: (result as AITextResult).text,
      usage: (result as AITextResult).usage,
      provider: (result as AITextResult).provider,
      model: (result as AITextResult).model,
    };
  }

  validateResponse<TData>(
    schema: ZodSchema<TData>,
    data: unknown
  ): ResponseValidationResult<TData> {
    const parsed = schema.safeParse(data);
    if (parsed.success) {
      return { valid: true, data: parsed.data };
    }
    return {
      valid: false,
      issues: this.formatZodErrors(parsed.error),
    };
  }

  formatForAPI<TData = unknown>(data: TData, options: ResponseFormatOptions): ApiResponse<TData> {
    const response: ApiResponse<TData> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: options.requestId,
    };
    if (options.metadata) {
      (response as Record<string, unknown>).metadata = options.metadata;
    }
    return response;
  }

  scoreResponse(payload: string | AITextResult | AIChatResult): ResponseQualityScore {
    const text = this.extractPrimaryText(payload) ?? '';
    const notes: string[] = [];

    const completeness = Math.min(1, Math.max(0, text.length / 500));
    const structure = /(?:^|\n)- /.test(text) || /\d+\./.test(text) ? 0.9 : 0.6;
    if (text.length < 50) {
      notes.push('Response is very short; may lack detail.');
    }
    if (!/[.!?]/.test(text)) {
      notes.push('Response lacks sentence punctuation; may be malformed.');
    }

    const overall = Number((completeness * 0.5 + structure * 0.5).toFixed(2));

    return {
      completeness: Number(completeness.toFixed(2)),
      structure: Number(structure.toFixed(2)),
      overall,
      notes: notes.length ? notes : undefined,
    };
  }

  formatStreamingChunk(chunk: AIStreamChunk): Record<string, unknown> {
    return {
      token: chunk.token,
      index: chunk.index,
      provider: chunk.provider,
      model: chunk.model,
      done: chunk.done ?? false,
      timestamp: chunk.timestamp,
    };
  }

  recoverFromMalformed(text: string): string {
    const recovered = this.recoverJsonBlock(text);
    return recovered ?? text;
  }

  private extractPrimaryText(payload: string | AITextResult | AIChatResult): string | undefined {
    if (typeof payload === 'string') {
      return payload;
    }
    if ('text' in payload) {
      return payload.text;
    }
    return undefined;
  }

  private tryParseJson(value: string): { success: boolean; data?: unknown; error?: string } {
    try {
      return { success: true, data: JSON.parse(value) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Malformed JSON payload.',
      };
    }
  }

  private recoverJsonBlock(text: string): string | undefined {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) {
      const candidate = text.slice(first, last + 1);
      const parsed = this.tryParseJson(candidate);
      if (parsed.success) {
        return candidate;
      }
    }
    return undefined;
  }

  private formatZodErrors(error: ZodError): string[] {
    return error.issues.map(issue => `${issue.path.join('.') || 'root'}: ${issue.message}`);
  }
}
