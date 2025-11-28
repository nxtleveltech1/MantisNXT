import { query } from '@/lib/database'
import { PRICING_TABLES } from '@/lib/db/pricing-schema'
import { ScrapingJobService } from '@/lib/services/pricing-intel/ScrapingJobService'
import { CompetitorProfileService } from '@/lib/services/pricing-intel/CompetitorProfileService'
import { MarketIntelligenceService } from '@/lib/services/pricing-intel/MarketIntelligenceService'
import { AlertService } from '@/lib/services/pricing-intel/AlertService'
import { WebhookDispatcher } from '@/lib/services/pricing-intel/WebhookDispatcher'
import type { MarketIntelScrapeJob, CompetitorProductMatch } from '@/lib/services/pricing-intel/types'

const JOB_TABLE = PRICING_TABLES.MARKET_INTEL_SCRAPE_JOB

const jobService = new ScrapingJobService()
const competitorService = new CompetitorProfileService()
const intelService = new MarketIntelligenceService()
const alertService = new AlertService()
const webhookDispatcher = new WebhookDispatcher()

export async function runCompetitiveIntelJobs(limit = 10) {
  const dueJobs = await query<MarketIntelScrapeJob>(
    `
      SELECT *
      FROM ${JOB_TABLE}
      WHERE status = 'active'
        AND (next_run_at IS NULL OR next_run_at <= NOW())
      ORDER BY priority ASC, next_run_at ASC NULLS FIRST
      LIMIT $1
    `,
    [limit],
  )

  for (const job of dueJobs.rows) {
    const competitor = job.competitor_id
      ? await competitorService.get(job.org_id, job.competitor_id)
      : null

    if (!competitor) {
      continue
    }

    const matchesResult = await query<CompetitorProductMatch>(
      `
        SELECT *
        FROM ${PRICING_TABLES.COMPETITOR_PRODUCT_MATCH}
        WHERE org_id = $1
          AND competitor_id = $2
          AND status IN ('matched', 'pending')
      `,
      [job.org_id, competitor.competitor_id],
    )

    const run = await jobService.recordRun({
      job_id: job.job_id,
      org_id: job.org_id,
      competitor_id: competitor.competitor_id,
      triggered_by: 'system',
      status: 'running',
      started_at: new Date(),
    })

    try {
      const result = await jobService.executeJob('firecrawl', {
        orgId: job.org_id,
        competitor,
        dataSource: {
          data_source_id: 'firecrawl',
          competitor_id: competitor.competitor_id,
          org_id: job.org_id,
          source_type: 'website',
          label: 'Primary Website',
          endpoint_url: competitor.website_url ?? '',
          auth_config: {},
          rate_limit_config: {},
          robots_txt_cache: {},
          health_status: 'healthy',
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        products: matchesResult.rows,
        options: {
          rateLimitMs: Math.ceil(60_000 / Math.max(job.rate_limit_per_min, 1)),
          metadata: { job_id: job.job_id },
        },
      }, { runId: run.run_id })

      await intelService.recordSnapshots(result.result.products)
      if (result.result.products.length) {
        await webhookDispatcher.dispatch(job.org_id, 'snapshot.created', {
          org_id: job.org_id,
          job_id: job.job_id,
          competitor_id: competitor.competitor_id,
          snapshot_ids: result.result.products.map((snapshot) => snapshot.snapshot_id),
        })
      }
      for (const snapshot of result.result.products) {
        await alertService.evaluateSnapshot(job.org_id, snapshot)
      }

      await query(
        `
          UPDATE ${JOB_TABLE}
          SET last_run_at = NOW(),
              next_run_at = NOW() + INTERVAL '1 hour',
              last_status = $2,
              updated_at = NOW()
          WHERE job_id = $1
        `,
        [job.job_id, result.result.success ? 'completed' : 'failed'],
      )
    } catch (error) {
      await jobService.updateRun(run.run_id, {
        status: 'failed',
        completed_at: new Date(),
        error_details: { message: error instanceof Error ? error.message : String(error) },
      })

      await query(
        `
          UPDATE ${JOB_TABLE}
          SET last_run_at = NOW(),
              next_run_at = NOW() + INTERVAL '15 minutes',
              last_status = 'failed',
              updated_at = NOW()
          WHERE job_id = $1
        `,
        [job.job_id],
      )
    }
  }
}

