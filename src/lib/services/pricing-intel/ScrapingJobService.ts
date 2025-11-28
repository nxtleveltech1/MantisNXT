import { query } from '@/lib/database'
import { PRICING_TABLES } from '@/lib/db/pricing-schema'
import { RateLimiter, RateLimitPreset } from '@/lib/services/RateLimiter'
import type {
  MarketIntelScrapeJob,
  MarketIntelScrapeRun,
  ScrapeRequest,
  ScrapeResult,
  ScrapingProviderId,
} from './types'
import { ScrapingProviderRegistry } from './ScrapingProviderRegistry'

const JOB_TABLE = PRICING_TABLES.MARKET_INTEL_SCRAPE_JOB
const RUN_TABLE = PRICING_TABLES.MARKET_INTEL_SCRAPE_RUN

export class ScrapingJobService {
  private registry: ScrapingProviderRegistry
  private rateLimiter = new RateLimiter()

  constructor(registry?: ScrapingProviderRegistry) {
    this.registry = registry ?? new ScrapingProviderRegistry()
  }

  async listJobs(orgId: string): Promise<MarketIntelScrapeJob[]> {
    const result = await query<MarketIntelScrapeJob>(
      `SELECT * FROM ${JOB_TABLE} WHERE org_id = $1 ORDER BY created_at DESC`,
      [orgId],
    )
    return result.rows
  }

  async createJob(
    orgId: string,
    payload: Omit<MarketIntelScrapeJob, 'job_id' | 'org_id' | 'created_at' | 'updated_at'>,
  ): Promise<MarketIntelScrapeJob> {
    const result = await query<MarketIntelScrapeJob>(
      `
        INSERT INTO ${JOB_TABLE} (
          job_id,
          org_id,
          competitor_id,
          job_name,
          schedule_type,
          schedule_config,
          status,
          priority,
          max_concurrency,
          rate_limit_per_min,
          next_run_at,
          metadata,
          created_by,
          updated_by
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5::jsonb,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11::jsonb,
          $12,
          $13
        )
        RETURNING *
      `,
      [
        orgId,
        payload.competitor_id ?? null,
        payload.job_name,
        payload.schedule_type,
        JSON.stringify(payload.schedule_config ?? {}),
        payload.status ?? 'active',
        payload.priority ?? 3,
        payload.max_concurrency ?? 5,
        payload.rate_limit_per_min ?? 60,
        payload.next_run_at ?? null,
        JSON.stringify(payload.metadata ?? {}),
        payload.created_by ?? null,
        payload.updated_by ?? null,
      ],
    )
    return result.rows[0]
  }

  async updateJob(
    orgId: string,
    jobId: string,
    input: Partial<MarketIntelScrapeJob>,
  ): Promise<MarketIntelScrapeJob | null> {
    const result = await query<MarketIntelScrapeJob>(
      `
        UPDATE ${JOB_TABLE}
        SET
          job_name = COALESCE($3, job_name),
          schedule_type = COALESCE($4, schedule_type),
          schedule_config = COALESCE($5::jsonb, schedule_config),
          status = COALESCE($6, status),
          priority = COALESCE($7, priority),
          max_concurrency = COALESCE($8, max_concurrency),
          rate_limit_per_min = COALESCE($9, rate_limit_per_min),
          next_run_at = COALESCE($10, next_run_at),
          metadata = COALESCE($11::jsonb, metadata),
          updated_by = COALESCE($12, updated_by),
          updated_at = NOW()
        WHERE org_id = $1 AND job_id = $2
        RETURNING *
      `,
      [
        orgId,
        jobId,
        input.job_name ?? null,
        input.schedule_type ?? null,
        input.schedule_config ? JSON.stringify(input.schedule_config) : null,
        input.status ?? null,
        input.priority ?? null,
        input.max_concurrency ?? null,
        input.rate_limit_per_min ?? null,
        input.next_run_at ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        input.updated_by ?? null,
      ],
    )
    return result.rows[0] ?? null
  }

  async recordRun(run: Partial<MarketIntelScrapeRun>): Promise<MarketIntelScrapeRun> {
    const result = await query<MarketIntelScrapeRun>(
      `
        INSERT INTO ${RUN_TABLE} (
          run_id,
          job_id,
          org_id,
          competitor_id,
          triggered_by,
          status,
          started_at,
          completed_at,
          total_sources,
          success_sources,
          failed_sources,
          total_products,
          processed_products,
          error_details,
          metadata
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13::jsonb,
          $14::jsonb
        )
        RETURNING *
      `,
      [
        run.job_id,
        run.org_id,
        run.competitor_id ?? null,
        run.triggered_by ?? 'system',
        run.status ?? 'queued',
        run.started_at ?? null,
        run.completed_at ?? null,
        run.total_sources ?? 0,
        run.success_sources ?? 0,
        run.failed_sources ?? 0,
        run.total_products ?? 0,
        run.processed_products ?? 0,
        run.error_details ? JSON.stringify(run.error_details) : null,
        run.metadata ? JSON.stringify(run.metadata) : '{}',
      ],
    )
    return result.rows[0]
  }

  async updateRun(runId: string, input: Partial<MarketIntelScrapeRun>): Promise<void> {
    await query(
      `
        UPDATE ${RUN_TABLE}
        SET
          status = COALESCE($2, status),
          started_at = COALESCE($3, started_at),
          completed_at = COALESCE($4, completed_at),
          total_sources = COALESCE($5, total_sources),
          success_sources = COALESCE($6, success_sources),
          failed_sources = COALESCE($7, failed_sources),
          total_products = COALESCE($8, total_products),
          processed_products = COALESCE($9, processed_products),
          error_details = COALESCE($10::jsonb, error_details),
          metadata = COALESCE($11::jsonb, metadata)
        WHERE run_id = $1
      `,
      [
        runId,
        input.status ?? null,
        input.started_at ?? null,
        input.completed_at ?? null,
        input.total_sources ?? null,
        input.success_sources ?? null,
        input.failed_sources ?? null,
        input.total_products ?? null,
        input.processed_products ?? null,
        input.error_details ? JSON.stringify(input.error_details) : null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    )
  }

  async executeJob(
    providerId: ScrapingProviderId,
    request: ScrapeRequest,
    options?: { runId?: string },
  ): Promise<{ run: MarketIntelScrapeRun; result: ScrapeResult }> {
    const rateKey = `${request.orgId}:${providerId}`
    const limitResult = await this.rateLimiter.checkLimit(rateKey, RateLimitPreset.API)
    if (!limitResult.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${limitResult.retry_after}s`)
    }

    const run = options?.runId
      ? await this.getRun(options.runId)
      : await this.recordRun({
          job_id: request.options?.metadata?.job_id as string | undefined,
          org_id: request.orgId,
          competitor_id: request.competitor.competitor_id,
          triggered_by: 'system',
          status: 'running',
          started_at: new Date(),
        })

    await this.updateRun(run.run_id, { status: 'running', started_at: new Date() })

    const result = await this.registry.scrapeWithProvider(providerId, request)

    await this.updateRun(run.run_id, {
      status: result.success ? 'completed' : 'failed',
      completed_at: new Date(),
      total_products: result.products.length,
      processed_products: result.products.length,
      failed_sources: result.errors.length,
      success_sources: result.errors.length === 0 ? 1 : 0,
      error_details: result.errors.length ? { errors: result.errors } : undefined,
    })

    return { run: await this.getRun(run.run_id), result }
  }

  async getRun(runId?: string): Promise<MarketIntelScrapeRun> {
    if (!runId) {
      throw new Error('runId is required')
    }

    const result = await query<MarketIntelScrapeRun>(
      `SELECT * FROM ${RUN_TABLE} WHERE run_id = $1`,
      [runId],
    )

    if (!result.rows[0]) {
      throw new Error(`Scrape run ${runId} not found`)
    }
    return result.rows[0]
  }
}

