import { createHash } from 'crypto';
import type {
  AIEmbeddingInput,
  AIEmbeddingResult,
  AIUsageMetrics,
} from '@/types/ai';
import {
  AIServiceBase,
  type AIServiceBaseOptions,
  type AIServiceRequestOptions,
  type AIServiceResponse,
} from './base';

export interface EmbeddingRequestOptions extends AIServiceRequestOptions {
  cache?: boolean;
  cacheKey?: string;
  cacheTtlMs?: number;
  dimensions?: number;
}

export interface EmbeddingDocument {
  id: string;
  vector: number[] | Float32Array;
  metadata?: Record<string, any>;
}

export interface EmbeddingSearchResult extends EmbeddingDocument {
  score: number;
}

export interface EmbeddingBatchItem {
  input: AIEmbeddingInput;
  result: AIEmbeddingResult;
}

export interface EmbeddingBatchResult {
  results: EmbeddingBatchItem[];
  usage?: AIUsageMetrics;
}

interface CachedEmbeddingResponse {
  expiresAt: number;
  response: AIServiceResponse<AIEmbeddingResult>;
}

export interface AIEmbeddingServiceOptions extends AIServiceBaseOptions {
  defaultCacheTtlMs?: number;
}

export class AIEmbeddingService extends AIServiceBase<EmbeddingRequestOptions> {
  private readonly cache = new Map<string, CachedEmbeddingResponse>();
  private readonly defaultCacheTtlMs: number;

  constructor(options?: AIEmbeddingServiceOptions) {
    super('AIEmbeddingService', options);
    this.defaultCacheTtlMs = options?.defaultCacheTtlMs ?? 10 * 60 * 1000;
  }

  async embed(
    input: AIEmbeddingInput,
    options: EmbeddingRequestOptions = {},
  ): Promise<AIServiceResponse<AIEmbeddingResult>> {
    const cacheKey = this.shouldCache(input, options)
      ? options.cacheKey ?? this.buildCacheKey(input, options)
      : undefined;

    if (cacheKey) {
      const cached = this.getCachedResponse(cacheKey, options);
      if (cached) {
        this.emit('cache-hit', cached);
        return cached;
      }
    }

    const response = await this.executeOperation<AIEmbeddingResult>(
      'embedding.generate',
      async ({ service, runtimeOptions }) => service.embed(input, { ...runtimeOptions, dimensions: options.dimensions }),
      options,
      { inputHash: this.hashEmbeddingInput(input) },
    );

    if (response.success && cacheKey) {
      this.setCachedResponse(cacheKey, response, options.cacheTtlMs);
    }

    return response;
  }

  async embedBatch(
    inputs: Array<string | AIEmbeddingInput>,
    options: EmbeddingRequestOptions = {},
  ): Promise<AIServiceResponse<EmbeddingBatchResult>> {
    const formattedInputs = inputs.map((entry) => (typeof entry === 'string' ? { input: entry } : entry));

    const response = await this.executeOperation<EmbeddingBatchResult>(
      'embedding.batch',
      async ({ service, runtimeOptions }) => {
        const results: EmbeddingBatchItem[] = [];
        for (const input of formattedInputs) {
          const result = await service.embed(input, { ...runtimeOptions, dimensions: options.dimensions });
          results.push({ input, result });
        }
        const aggregatedUsage = this.combineUsage(results.map((item) => item.result.usage));
        return { results, usage: aggregatedUsage };
      },
      options,
      { batchSize: formattedInputs.length },
    );

    return response;
  }

  cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
    const vecA = Array.from(a);
    const vecB = Array.from(b);
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must be the same length to compute cosine similarity.');
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let index = 0; index < vecA.length; index += 1) {
      dot += vecA[index] * vecB[index];
      normA += vecA[index] ** 2;
      normB += vecB[index] ** 2;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async search(
    query: string | number[] | Float32Array,
    documents: EmbeddingDocument[],
    options: EmbeddingRequestOptions = {},
    topK: number = 10,
  ): Promise<EmbeddingSearchResult[]> {
    let queryVector: number[] | Float32Array;

    if (typeof query === 'string') {
      const response = await this.embed({ input: query }, options);
      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'Embedding query generation failed.');
      }
      queryVector = response.data.vector;
    } else {
      queryVector = query;
    }

    const scored = documents.map((doc) => ({
      ...doc,
      score: this.cosineSimilarity(queryVector, doc.vector),
    }));

    return scored
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);
  }

  clearCache(): void {
    this.cache.clear();
  }

  pruneCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  private shouldCache(input: AIEmbeddingInput, options: EmbeddingRequestOptions): boolean {
    if (options.cache === false) {
      return false;
    }
    return typeof input.input === 'string';
  }

  private buildCacheKey(input: AIEmbeddingInput, options: EmbeddingRequestOptions): string {
    const hash = this.hashEmbeddingInput(input);
    const model = options.model ?? 'default';
    const provider = options.provider ?? this.defaultProvider ?? 'auto';
    return `${provider}:${model}:${hash}`;
  }

  private hashEmbeddingInput(input: AIEmbeddingInput): string {
    if (Array.isArray(input.input)) {
      return createHash('sha256').update(input.input.join('|')).digest('hex');
    }
    return createHash('sha256').update(String(input.input)).digest('hex');
  }

  private getCachedResponse(
    cacheKey: string | undefined,
    options: EmbeddingRequestOptions,
  ): AIServiceResponse<AIEmbeddingResult> | undefined {
    if (!cacheKey) {
      return undefined;
    }
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return undefined;
    }
    if (cached.expiresAt <= Date.now()) {
      this.cache.delete(cacheKey);
      return undefined;
    }

    const requestId = options.requestId ?? this.generateRequestId();
    return {
      ...cached.response,
      requestId,
      timestamp: this.getTimestamp(),
      metadata: this.mergeMetadata(cached.response.metadata, options.metadata),
      context: this.buildContext(options) ?? cached.response.context,
    };
  }

  private setCachedResponse(
    cacheKey: string,
    response: AIServiceResponse<AIEmbeddingResult>,
    ttlMs?: number,
  ): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultCacheTtlMs);
    this.cache.set(cacheKey, {
      expiresAt,
      response: { ...response },
    });
  }
}
