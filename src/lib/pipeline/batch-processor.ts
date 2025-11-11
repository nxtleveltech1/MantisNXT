/**
 * Production-Grade Batch Processing Engine
 * Handles large-scale data processing with chunking, parallelization, and error recovery
 */

import type { Pool } from 'pg';

export interface BatchConfig {
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
  onProgress?: (processed: number, total: number) => void;
  onError?: (error: Error, batch: unknown[]) => void;
}

export interface CursorPaginationOptions {
  cursorColumn: string;
  orderDirection: 'ASC' | 'DESC';
  limit: number;
  filters?: Record<string, unknown>;
}

export interface BatchResult<T> {
  data: T[];
  processed: number;
  failed: number;
  errors: Array<{ batch: number; error: Error }>;
  duration: number;
}

/**
 * Cursor-based pagination for efficient large dataset queries
 */
export class CursorPaginator<T = unknown> {
  constructor(
    private pool: Pool,
    private table: string,
    private options: CursorPaginationOptions
  ) {}

  async *paginate(): AsyncGenerator<T[], void, unknown> {
    let lastCursor: unknown = null;
    let hasMore = true;
    let batchCount = 0;

    while (hasMore) {
      const { cursorColumn, orderDirection, limit, filters } = this.options;

      // Build WHERE clause
      const whereConditions: string[] = [];
      const values: unknown[] = [];
      let paramCounter = 1;

      // Add cursor condition
      if (lastCursor !== null) {
        const operator = orderDirection === 'ASC' ? '>' : '<';
        whereConditions.push(`${cursorColumn} ${operator} $${paramCounter}`);
        values.push(lastCursor);
        paramCounter++;
      }

      // Add filter conditions
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            whereConditions.push(`${key} = $${paramCounter}`);
            values.push(value);
            paramCounter++;
          }
        });
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const query = `
        SELECT *
        FROM ${this.table}
        ${whereClause}
        ORDER BY ${cursorColumn} ${orderDirection}
        LIMIT $${paramCounter}
      `;

      values.push(limit);

      const startTime = Date.now();
      const result = await this.pool.query(query, values);
      const duration = Date.now() - startTime;

      batchCount++;
      console.log(`📄 Fetched batch ${batchCount}: ${result.rows.length} rows in ${duration}ms`);

      if (result.rows.length === 0) {
        hasMore = false;
        break;
      }

      // Update cursor for next batch
      lastCursor = result.rows[result.rows.length - 1][cursorColumn];

      yield result.rows as T[];

      // Check if we got fewer rows than requested (last batch)
      if (result.rows.length < limit) {
        hasMore = false;
      }
    }
  }

  /**
   * Get total count with optional filters
   */
  async getTotal(): Promise<number> {
    const { filters } = this.options;

    const whereConditions: string[] = [];
    const values: unknown[] = [];
    let paramCounter = 1;

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          whereConditions.push(`${key} = $${paramCounter}`);
          values.push(value);
          paramCounter++;
        }
      });
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const query = `SELECT COUNT(*) as total FROM ${this.table} ${whereClause}`;
    const result = await this.pool.query(query, values);

    return parseInt(result.rows[0]?.total || '0', 10);
  }
}

/**
 * Parallel batch processor with worker pool pattern
 */
export class BatchProcessor<TInput, TOutput> {
  private defaultConfig: BatchConfig = {
    batchSize: 250,
    maxConcurrency: 4,
    retryAttempts: 3,
    retryDelay: 1000,
  };

  constructor(
    private processor: (batch: TInput[]) => Promise<TOutput[]>,
    private config: Partial<BatchConfig> = {}
  ) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Process items in parallel batches with retry logic
   */
  async process(items: TInput[]): Promise<BatchResult<TOutput>> {
    const startTime = Date.now();
    const config = this.config as BatchConfig;

    // Split into batches
    const batches = this.createBatches(items, config.batchSize);
    const totalBatches = batches.length;

    console.log(`🚀 Processing ${items.length} items in ${totalBatches} batches (size: ${config.batchSize}, concurrency: ${config.maxConcurrency})`);

    const results: TOutput[] = [];
    const errors: Array<{ batch: number; error: Error }> = [];
    let processed = 0;
    let failed = 0;

    // Process batches with concurrency control
    for (let i = 0; i < batches.length; i += config.maxConcurrency) {
      const batchSlice = batches.slice(i, i + config.maxConcurrency);
      const batchPromises = batchSlice.map((batch, idx) =>
        this.processBatchWithRetry(batch, i + idx, config)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, idx) => {
        const batchIndex = i + idx;

        if (result.status === 'fulfilled') {
          results.push(...result.value);
          processed += batchSlice[idx].length;
        } else {
          errors.push({ batch: batchIndex, error: result.reason });
          failed += batchSlice[idx].length;

          if (config.onError) {
            config.onError(result.reason, batchSlice[idx]);
          }
        }
      });

      // Report progress
      if (config.onProgress) {
        config.onProgress(processed, items.length);
      }
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Batch processing complete: ${processed} processed, ${failed} failed in ${duration}ms`);
    console.log(`   Throughput: ${Math.round((items.length / duration) * 1000)} items/sec`);

    return {
      data: results,
      processed,
      failed,
      errors,
      duration,
    };
  }

  /**
   * Process with async generator for memory-efficient streaming
   */
  async *processStream(
    source: AsyncGenerator<TInput[], void, unknown>
  ): AsyncGenerator<TOutput[], void, unknown> {
    const config = this.config as BatchConfig;
    let batchIndex = 0;

    for await (const batch of source) {
      try {
        const result = await this.processBatchWithRetry(batch, batchIndex, config);
        yield result;
        batchIndex++;
      } catch (error) {
        console.error(`❌ Stream batch ${batchIndex} failed:`, error);
        if (config.onError) {
          config.onError(error as Error, batch);
        }
        throw error;
      }
    }
  }

  /**
   * Process single batch with exponential backoff retry
   */
  private async processBatchWithRetry(
    batch: TInput[],
    batchIndex: number,
    config: BatchConfig
  ): Promise<TOutput[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
      try {
        const startTime = Date.now();
        const result = await this.processor(batch);
        const duration = Date.now() - startTime;

        if (attempt > 0) {
          console.log(`✅ Batch ${batchIndex} succeeded on attempt ${attempt + 1} (${duration}ms)`);
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < config.retryAttempts) {
          const delay = config.retryDelay * Math.pow(2, attempt);
          console.warn(`⚠️ Batch ${batchIndex} failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    console.error(`❌ Batch ${batchIndex} failed after ${config.retryAttempts + 1} attempts`);
    throw lastError;
  }

  /**
   * Split array into chunks
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Optimized alert validation using streaming batch processor
 */
export async function validateAlertsInBatches(
  alerts: unknown[],
  validator: (items: unknown[]) => unknown[]
): Promise<unknown[]> {
  const processor = new BatchProcessor(
    async (batch) => validator(batch),
    {
      batchSize: 500,
      maxConcurrency: 4,
      onProgress: (processed, total) => {
        const percentage = Math.round((processed / total) * 100);
        console.log(`📊 Alert validation progress: ${processed}/${total} (${percentage}%)`);
      },
    }
  );

  const result = await processor.process(alerts);

  if (result.failed > 0) {
    console.warn(`⚠️ ${result.failed} alerts failed validation`);
  }

  return result.data;
}

/**
 * Memory-efficient inventory data fetcher
 */
export async function fetchInventoryInBatches(
  pool: Pool,
  filters: Record<string, unknown> = {}
): Promise<unknown[]> {
  const paginator = new CursorPaginator(pool, 'stock_on_hand', {
    cursorColumn: 'id',
    orderDirection: 'ASC',
    limit: 500,
    filters,
  });

  const allItems: unknown[] = [];

  for await (const batch of paginator.paginate()) {
    allItems.push(...batch);
  }

  console.log(`📦 Fetched ${allItems.length} inventory items in batches`);
  return allItems;
}

/**
 * Parallel aggregation for dashboard metrics
 */
export async function aggregateMetricsInParallel(
  pool: Pool,
  queries: Array<{ key: string; query: string; params?: unknown[] }>
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  const results = await Promise.allSettled(
    queries.map(async ({ key, query, params = [] }) => {
      const result = await pool.query(query, params);
      return { key, data: result.rows[0] || {} };
    })
  );

  const metrics: Record<string, unknown> = {};

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      metrics[result.value.key] = result.value.data;
    } else {
      console.error(`❌ Query '${queries[idx].key}' failed:`, result.reason);
      metrics[queries[idx].key] = null;
    }
  });

  const duration = Date.now() - startTime;
  console.log(`📊 Aggregated ${queries.length} metrics in ${duration}ms`);

  return metrics;
}
